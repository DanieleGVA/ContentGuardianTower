import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { requireRole } from '../plugins/auth.plugin.js';
import { createExportSchema } from '../../shared/zod-schemas.js';
import { parsePagination, buildPaginationMeta, buildPrismaSkipTake } from '../../shared/pagination.js';
import { logAuditEvent } from '../../shared/audit.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';

export default async function exportsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', requireRole('ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER', 'LOCAL_MANAGER'));

  // POST /api/exports
  app.post('/', { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } }, async (request: FastifyRequest) => {
    const data = createExportSchema.parse(request.body);

    const exportRecord = await app.prisma.export.create({
      data: {
        exportType: data.exportType,
        requestedByUserId: request.user.id,
        filtersSnapshot: (data.filters as Prisma.InputJsonValue) ?? undefined,
      },
    });

    await logAuditEvent(app.prisma, {
      eventType: 'EXPORT_REQUESTED',
      entityType: 'EXPORT',
      entityId: exportRecord.id,
      actorType: 'USER',
      actorUserId: request.user.id,
      message: `Export '${data.exportType}' requested`,
    });

    // Export job will be processed by worker (Phase 3)
    return exportRecord;
  });

  // GET /api/exports
  app.get('/', async (request: FastifyRequest) => {
    const params = parsePagination(request.query as Record<string, string>);
    const { skip, take } = buildPrismaSkipTake(params);

    const where = { requestedByUserId: request.user.id };

    const [exports, total] = await Promise.all([
      app.prisma.export.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      app.prisma.export.count({ where }),
    ]);

    return buildPaginationMeta(exports, total, params);
  });

  // GET /api/exports/:id
  app.get('/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };

    const exportRecord = await app.prisma.export.findUnique({ where: { id } });
    if (!exportRecord) throw new NotFoundError('Export', id);

    return exportRecord;
  });

  // GET /api/exports/:id/download
  app.get('/:id/download', async (request: FastifyRequest, reply) => {
    const { id } = request.params as { id: string };

    const exportRecord = await app.prisma.export.findUnique({ where: { id } });
    if (!exportRecord) throw new NotFoundError('Export', id);

    // RBAC: owner, ADMIN, GLOBAL_MANAGER, or REGIONAL_MANAGER can download
    const userRole = request.user.role;
    const isOwner = exportRecord.requestedByUserId === request.user.id;
    const isPrivileged = ['ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER'].includes(userRole);
    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError('You do not have permission to download this export');
    }

    if (exportRecord.status !== 'SUCCEEDED' || !exportRecord.storageKey) {
      return reply.status(422).send({ error: 'EXPORT_NOT_READY', message: 'Export is not ready for download' });
    }

    // Verify file exists
    try {
      await stat(exportRecord.storageKey);
    } catch {
      return reply.status(404).send({ error: 'FILE_NOT_FOUND', message: 'Export file no longer exists on disk' });
    }

    const stream = createReadStream(exportRecord.storageKey);
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="export-${id}.csv"`)
      .send(stream);
  });
}

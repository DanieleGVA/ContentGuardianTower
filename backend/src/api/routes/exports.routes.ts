import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { requireRole } from '../plugins/auth.plugin.js';
import { createExportSchema } from '../../shared/zod-schemas.js';
import { parsePagination, buildPaginationMeta, buildPrismaSkipTake } from '../../shared/pagination.js';
import { logAuditEvent } from '../../shared/audit.js';
import { NotFoundError } from '../../shared/errors.js';

export default async function exportsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', requireRole('ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER', 'LOCAL_MANAGER'));

  // POST /api/exports
  app.post('/', async (request: FastifyRequest) => {
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

    if (exportRecord.status !== 'SUCCEEDED' || !exportRecord.storageKey) {
      return reply.status(422).send({ error: 'EXPORT_NOT_READY', message: 'Export is not ready for download' });
    }

    // File download will be implemented with export worker (Phase 3)
    return reply.status(501).send({ error: 'NOT_IMPLEMENTED', message: 'Export download not yet implemented' });
  });
}

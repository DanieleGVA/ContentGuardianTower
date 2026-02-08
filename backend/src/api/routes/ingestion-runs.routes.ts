import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Channel, RunStatus, Prisma } from '@prisma/client';
import { requireRole } from '../plugins/auth.plugin.js';
import { parsePagination, buildPaginationMeta, buildPrismaSkipTake } from '../../shared/pagination.js';
import { buildCountryScopeFilter } from '../../shared/country-scope.js';
import { NotFoundError } from '../../shared/errors.js';
import { logAuditEvent } from '../../shared/audit.js';

export default async function ingestionRunsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', requireRole('ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER', 'LOCAL_MANAGER'));

  // GET /api/ingestion-runs
  app.get('/', async (request: FastifyRequest) => {
    const params = parsePagination(request.query as Record<string, string>);
    const { skip, take } = buildPrismaSkipTake(params);
    const query = request.query as Record<string, string>;
    const countryScope = buildCountryScopeFilter(request.user);

    const where: Prisma.IngestionRunWhereInput = {
      ...countryScope,
      ...(query.status ? { status: query.status as RunStatus } : {}),
      ...(query.sourceId ? { sourceId: query.sourceId } : {}),
      ...(query.channel ? { channel: query.channel as Channel } : {}),
    };

    const [runs, total] = await Promise.all([
      app.prisma.ingestionRun.findMany({
        where,
        skip,
        take,
        orderBy: { [params.sortBy || 'startedAt']: params.sortOrder || 'desc' },
        include: {
          source: { select: { id: true, displayName: true, channel: true, countryCode: true } },
        },
      }),
      app.prisma.ingestionRun.count({ where }),
    ]);

    return buildPaginationMeta(runs, total, params);
  });

  // GET /api/ingestion-runs/:id
  app.get('/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };

    const run = await app.prisma.ingestionRun.findUnique({
      where: { id },
      include: {
        source: { select: { id: true, displayName: true, channel: true, countryCode: true } },
        ingestionItems: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!run) throw new NotFoundError('IngestionRun', id);
    return run;
  });

  // POST /api/ingestion-runs/:id/cancel
  app.post(
    '/:id/cancel',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } }, preHandler: [requireRole('ADMIN', 'GLOBAL_MANAGER')] },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };

      const run = await app.prisma.ingestionRun.findUnique({ where: { id } });
      if (!run) throw new NotFoundError('IngestionRun', id);

      if (run.status !== 'RUNNING') {
        return { message: 'Run is not in RUNNING status', status: run.status };
      }

      await app.prisma.ingestionRun.update({
        where: { id },
        data: { cancelRequested: true },
      });

      await logAuditEvent(app.prisma, {
        eventType: 'INGESTION_RUN_CANCELLED',
        entityType: 'INGESTION_RUN',
        entityId: id,
        actorType: 'USER',
        actorUserId: request.user.id,
        message: `Ingestion run '${id}' cancel requested`,
      });

      return { message: 'Cancel requested' };
    },
  );
}

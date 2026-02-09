import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Channel, SourceType, Prisma } from '@prisma/client';
import { requireRole } from '../plugins/auth.plugin.js';
import { createSourceSchema, updateSourceSchema } from '../../shared/zod-schemas.js';
import { parsePagination, buildPaginationMeta, buildPrismaSkipTake } from '../../shared/pagination.js';
import { buildCountryScopeFilter, assertCountryAccess } from '../../shared/country-scope.js';
import { logAuditEvent } from '../../shared/audit.js';
import { NotFoundError } from '../../shared/errors.js';
import { PostgresSearchRepository } from '../../shared/repositories/postgres-search.repository.js';

export default async function sourcesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // GET /api/sources
  app.get('/', async (request: FastifyRequest) => {
    const params = parsePagination(request.query as Record<string, string>);
    const { skip, take } = buildPrismaSkipTake(params);
    const query = request.query as Record<string, string>;
    const countryScope = buildCountryScopeFilter(request.user);

    // Full-text search via ?q= parameter
    if (query.q && query.q.trim()) {
      const searchRepo = new PostgresSearchRepository(app.prisma);
      const result = await searchRepo.searchSources({ query: query.q.trim(), page: params.page, pageSize: params.pageSize });
      return { data: result.items, meta: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: Math.ceil(result.total / result.pageSize) } };
    }

    const where: Prisma.SourceWhereInput = {
      isDeleted: false,
      ...countryScope,
      ...(query.channel ? { channel: query.channel as Channel } : {}),
      ...(query.sourceType ? { sourceType: query.sourceType as SourceType } : {}),
      ...(query.isEnabled !== undefined ? { isEnabled: query.isEnabled === 'true' } : {}),
    };

    const [sources, total] = await Promise.all([
      app.prisma.source.findMany({ where, skip, take, orderBy: { [params.sortBy || 'createdAt']: params.sortOrder } }),
      app.prisma.source.count({ where }),
    ]);

    return buildPaginationMeta(sources, total, params);
  });

  // POST /api/sources (ADMIN only)
  app.post(
    '/',
    { preHandler: [requireRole('ADMIN')] },
    async (request: FastifyRequest) => {
      const data = createSourceSchema.parse(request.body);

      const source = await app.prisma.source.create({ data });

      await logAuditEvent(app.prisma, {
        eventType: 'SOURCE_CREATED',
        entityType: 'SOURCE',
        entityId: source.id,
        actorType: 'USER',
        actorUserId: request.user.id,
        countryCode: source.countryCode,
        channel: source.channel,
        message: `Source '${source.displayName}' created`,
      });

      return source;
    },
  );

  // GET /api/sources/:id
  app.get('/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };

    const source = await app.prisma.source.findFirst({
      where: { id, isDeleted: false },
      include: { credential: { select: { id: true, platform: true, maskedHint: true, lastTestStatus: true, lastTestedAt: true } } },
    });

    if (!source) throw new NotFoundError('Source', id);
    assertCountryAccess(request.user, source.countryCode);
    return source;
  });

  // PUT /api/sources/:id (ADMIN only)
  app.put(
    '/:id',
    { preHandler: [requireRole('ADMIN')] },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };
      const data = updateSourceSchema.parse(request.body);

      const existing = await app.prisma.source.findFirst({ where: { id, isDeleted: false } });
      if (!existing) throw new NotFoundError('Source', id);

      const source = await app.prisma.source.update({ where: { id }, data });

      await logAuditEvent(app.prisma, {
        eventType: 'SOURCE_UPDATED',
        entityType: 'SOURCE',
        entityId: id,
        actorType: 'USER',
        actorUserId: request.user.id,
        countryCode: source.countryCode,
        channel: source.channel,
        message: `Source '${source.displayName}' updated`,
        payload: data as Prisma.InputJsonValue,
      });

      return source;
    },
  );

  // DELETE /api/sources/:id (ADMIN only, soft delete)
  app.delete(
    '/:id',
    { preHandler: [requireRole('ADMIN')] },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };

      const existing = await app.prisma.source.findFirst({ where: { id, isDeleted: false } });
      if (!existing) throw new NotFoundError('Source', id);

      await app.prisma.source.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date(), isEnabled: false },
      });

      await logAuditEvent(app.prisma, {
        eventType: 'SOURCE_DELETED',
        entityType: 'SOURCE',
        entityId: id,
        actorType: 'USER',
        actorUserId: request.user.id,
        countryCode: existing.countryCode,
        channel: existing.channel,
        message: `Source '${existing.displayName}' deleted (soft)`,
      });

      return { message: 'Source deleted' };
    },
  );

  // POST /api/sources/:id/test-credential (ADMIN only, stub)
  app.post(
    '/:id/test-credential',
    { preHandler: [requireRole('ADMIN')] },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };

      const source = await app.prisma.source.findFirst({
        where: { id, isDeleted: false },
        include: { credential: true },
      });
      if (!source) throw new NotFoundError('Source', id);

      await logAuditEvent(app.prisma, {
        eventType: 'SOURCE_CREDENTIAL_TESTED',
        entityType: 'SOURCE',
        entityId: id,
        actorType: 'USER',
        actorUserId: request.user.id,
        message: `Credential test requested for source '${source.displayName}'`,
      });

      // Stub: always succeed for MVP
      return { status: 'SUCCESS', message: 'Credential test passed (stub)' };
    },
  );

  // POST /api/sources/:id/trigger (ADMIN + Managers)
  app.post(
    '/:id/trigger',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } }, preHandler: [requireRole('ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER', 'LOCAL_MANAGER')] },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };

      const source = await app.prisma.source.findFirst({ where: { id, isDeleted: false, isEnabled: true } });
      if (!source) throw new NotFoundError('Source', id);
      assertCountryAccess(request.user, source.countryCode);

      await logAuditEvent(app.prisma, {
        eventType: 'SOURCE_INGESTION_TRIGGERED',
        entityType: 'SOURCE',
        entityId: id,
        actorType: 'USER',
        actorUserId: request.user.id,
        countryCode: source.countryCode,
        channel: source.channel,
        message: `Manual ingestion triggered for source '${source.displayName}'`,
      });

      // Create the ingestion run record
      const run = await app.prisma.ingestionRun.create({
        data: {
          runType: source.channel === 'WEB' ? 'CRAWL' : 'SOCIAL_PULL',
          sourceId: source.id,
          channel: source.channel,
          countryCode: source.countryCode,
          status: 'RUNNING',
        },
      });

      // Queue the pgboss job
      await app.boss.send('ingestion-run', {
        sourceId: source.id,
        runId: run.id,
      });

      return { message: 'Ingestion run queued', sourceId: id, runId: run.id };
    },
  );
}

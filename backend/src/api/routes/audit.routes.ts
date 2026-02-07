import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireRole } from '../plugins/auth.plugin.js';
import { auditListQuerySchema } from '../../shared/zod-schemas.js';
import { parsePagination, buildPaginationMeta, buildPrismaSkipTake } from '../../shared/pagination.js';

export default async function auditRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', requireRole('ADMIN'));

  // GET /api/audit-events
  app.get('/', async (request: FastifyRequest) => {
    const query = auditListQuerySchema.parse(request.query);
    const params = parsePagination(query);
    const { skip, take } = buildPrismaSkipTake(params);

    const where: Record<string, unknown> = {
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: query.dateFrom } : {}),
        ...(query.dateTo ? { lte: query.dateTo } : {}),
      };
    }

    const [events, total] = await Promise.all([
      app.prisma.auditEvent.findMany({
        where,
        skip,
        take,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' },
        include: {
          actor: { select: { id: true, username: true, fullName: true } },
        },
      }),
      app.prisma.auditEvent.count({ where }),
    ]);

    return buildPaginationMeta(events, total, params);
  });
}

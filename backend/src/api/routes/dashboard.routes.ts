import type { FastifyInstance, FastifyRequest } from 'fastify';
import { buildCountryScopeFilter } from '../../shared/country-scope.js';

export default async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // GET /api/dashboard/kpis
  app.get('/kpis', async (request: FastifyRequest) => {
    const countryScope = buildCountryScopeFilter(request.user);

    const [
      ticketsByStatus,
      ticketsByRisk,
      ticketsByEscalation,
      recentNew,
      recentResolved,
      escalatedCount,
      overdueCount,
    ] = await Promise.all([
      app.prisma.ticket.groupBy({
        by: ['status'],
        _count: true,
        where: countryScope,
      }),
      app.prisma.ticket.groupBy({
        by: ['riskLevel'],
        _count: true,
        where: { ...countryScope, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      app.prisma.ticket.groupBy({
        by: ['escalationLevel'],
        _count: true,
        where: { ...countryScope, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      app.prisma.ticket.count({
        where: { ...countryScope, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      app.prisma.ticket.count({
        where: {
          ...countryScope,
          status: 'RESOLVED',
          resolvedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      app.prisma.ticket.count({
        where: {
          ...countryScope,
          escalationLevel: { not: 'LOCAL' },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      app.prisma.ticket.count({
        where: { ...countryScope, isOverdue: true, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
    ]);

    // Latest tickets (5)
    const latestTickets = await app.prisma.ticket.findMany({
      where: countryScope,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        source: { select: { id: true, displayName: true, channel: true } },
        assignee: { select: { id: true, username: true, fullName: true } },
      },
    });

    return {
      ticketsByStatus: Object.fromEntries(ticketsByStatus.map((g) => [g.status, g._count])),
      ticketsByRisk: Object.fromEntries(ticketsByRisk.map((g) => [g.riskLevel, g._count])),
      ticketsByEscalation: Object.fromEntries(
        ticketsByEscalation.map((g) => [g.escalationLevel, g._count]),
      ),
      recentActivity: {
        newTickets24h: recentNew,
        resolvedTickets24h: recentResolved,
        escalatedTickets: escalatedCount,
        overdueTickets: overdueCount,
      },
      latestTickets,
    };
  });
}

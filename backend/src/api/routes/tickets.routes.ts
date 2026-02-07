import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireRole } from '../plugins/auth.plugin.js';
import {
  updateTicketStatusSchema,
  assignTicketSchema,
  createCommentSchema,
  ticketListQuerySchema,
} from '../../shared/zod-schemas.js';
import { parsePagination, buildPaginationMeta, buildPrismaSkipTake } from '../../shared/pagination.js';
import { buildCountryScopeFilter, assertCountryAccess } from '../../shared/country-scope.js';
import { logAuditEvent } from '../../shared/audit.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import type { TicketStatus } from '@prisma/client';

// Valid ticket status transitions
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['OPEN', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'OPEN'],
  CLOSED: ['OPEN'],
};

export default async function ticketsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // GET /api/tickets
  app.get('/', async (request: FastifyRequest) => {
    const query = ticketListQuerySchema.parse(request.query);
    const params = parsePagination(query);
    const { skip, take } = buildPrismaSkipTake(params);
    const countryScope = buildCountryScopeFilter(request.user);

    const where: Record<string, unknown> = {
      ...countryScope,
      ...(query.status ? { status: query.status } : {}),
      ...(query.riskLevel ? { riskLevel: query.riskLevel } : {}),
      ...(query.escalationLevel ? { escalationLevel: query.escalationLevel } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.countryCode ? { countryCode: query.countryCode } : {}),
      ...(query.sourceId ? { sourceId: query.sourceId } : {}),
      ...(query.assigneeUserId ? { assigneeUserId: query.assigneeUserId } : {}),
      ...(query.isOverdue !== undefined ? { isOverdue: query.isOverdue } : {}),
    };

    // Date range
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: query.dateFrom } : {}),
        ...(query.dateTo ? { lte: query.dateTo } : {}),
      };
    }

    // Full-text search (via raw SQL on tsvector)
    let tickets: unknown[];
    let total: number;

    if (query.q) {
      const searchTerm = query.q.replace(/[^\w\s]/g, '').trim();
      if (searchTerm) {
        const tsquery = searchTerm.split(/\s+/).join(' & ');
        // Use raw query for full-text search
        const countResult = await app.prisma.$queryRawUnsafe<[{ count: bigint }]>(
          `SELECT COUNT(*) as count FROM cgt_tickets WHERE search_vector @@ to_tsquery('english', $1)`,
          tsquery,
        );
        total = Number(countResult[0]?.count ?? 0);

        tickets = await app.prisma.$queryRawUnsafe(
          `SELECT id FROM cgt_tickets WHERE search_vector @@ to_tsquery('english', $1) ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
          tsquery,
          take,
          skip,
        );

        // Fetch full ticket data for the matching IDs
        const ids = (tickets as { id: string }[]).map((t) => t.id);
        if (ids.length > 0) {
          tickets = await app.prisma.ticket.findMany({
            where: { id: { in: ids }, ...countryScope },
            include: {
              source: { select: { id: true, displayName: true, channel: true } },
              assignee: { select: { id: true, username: true, fullName: true } },
            },
            orderBy: { createdAt: 'desc' },
          });
        }
      } else {
        tickets = [];
        total = 0;
      }
    } else {
      [tickets, total] = await Promise.all([
        app.prisma.ticket.findMany({
          where,
          skip,
          take,
          orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' },
          include: {
            source: { select: { id: true, displayName: true, channel: true } },
            assignee: { select: { id: true, username: true, fullName: true } },
          },
        }),
        app.prisma.ticket.count({ where }),
      ]);
    }

    return buildPaginationMeta(tickets as Record<string, unknown>[], total, params);
  });

  // GET /api/tickets/:id
  app.get('/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };

    const ticket = await app.prisma.ticket.findUnique({
      where: { id },
      include: {
        source: { select: { id: true, displayName: true, channel: true, platform: true } },
        assignee: { select: { id: true, username: true, fullName: true } },
        analysis: true,
        revision: true,
        events: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { actor: { select: { id: true, username: true, fullName: true } } },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, username: true, fullName: true } } },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
          include: { uploadedBy: { select: { id: true, username: true, fullName: true } } },
        },
      },
    });

    if (!ticket) throw new NotFoundError('Ticket', id);
    assertCountryAccess(request.user, ticket.countryCode);
    return ticket;
  });

  // PUT /api/tickets/:id/status
  app.put(
    '/:id/status',
    { preHandler: [requireRole('ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER', 'LOCAL_MANAGER')] },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };
      const { status: newStatus } = updateTicketStatusSchema.parse(request.body);

      const ticket = await app.prisma.ticket.findUnique({ where: { id } });
      if (!ticket) throw new NotFoundError('Ticket', id);
      assertCountryAccess(request.user, ticket.countryCode);

      const allowed = VALID_TRANSITIONS[ticket.status];
      if (!allowed.includes(newStatus)) {
        throw new ValidationError(
          `Cannot transition from '${ticket.status}' to '${newStatus}'. Allowed: ${allowed.join(', ')}`,
        );
      }

      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'RESOLVED') updateData.resolvedAt = new Date();
      if (newStatus === 'CLOSED') updateData.closedAt = new Date();

      const updated = await app.prisma.ticket.update({
        where: { id },
        data: updateData,
      });

      // Record event
      await app.prisma.ticketEvent.create({
        data: {
          ticketId: id,
          eventType: 'STATUS_CHANGED',
          actorType: 'USER',
          actorUserId: request.user.id,
          fromStatus: ticket.status,
          toStatus: newStatus,
        },
      });

      await logAuditEvent(app.prisma, {
        eventType: 'TICKET_STATUS_CHANGED',
        entityType: 'TICKET',
        entityId: id,
        actorType: 'USER',
        actorUserId: request.user.id,
        countryCode: ticket.countryCode,
        channel: ticket.channel,
        message: `Ticket status changed from '${ticket.status}' to '${newStatus}'`,
      });

      return updated;
    },
  );

  // PUT /api/tickets/:id/assign
  app.put(
    '/:id/assign',
    { preHandler: [requireRole('ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER', 'LOCAL_MANAGER')] },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };
      const { assigneeUserId } = assignTicketSchema.parse(request.body);

      const ticket = await app.prisma.ticket.findUnique({ where: { id } });
      if (!ticket) throw new NotFoundError('Ticket', id);
      assertCountryAccess(request.user, ticket.countryCode);

      const updated = await app.prisma.ticket.update({
        where: { id },
        data: { assigneeUserId },
      });

      const eventType = assigneeUserId ? 'ASSIGNED' : 'UNASSIGNED';

      await app.prisma.ticketEvent.create({
        data: {
          ticketId: id,
          eventType,
          actorType: 'USER',
          actorUserId: request.user.id,
          fromAssigneeUserId: ticket.assigneeUserId,
          toAssigneeUserId: assigneeUserId,
        },
      });

      await logAuditEvent(app.prisma, {
        eventType: assigneeUserId ? 'TICKET_ASSIGNED' : 'TICKET_UNASSIGNED',
        entityType: 'TICKET',
        entityId: id,
        actorType: 'USER',
        actorUserId: request.user.id,
        countryCode: ticket.countryCode,
        message: assigneeUserId
          ? `Ticket assigned to user '${assigneeUserId}'`
          : 'Ticket unassigned',
      });

      return updated;
    },
  );

  // GET /api/tickets/:id/comments
  app.get('/:id/comments', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };

    const ticket = await app.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundError('Ticket', id);
    assertCountryAccess(request.user, ticket.countryCode);

    return app.prisma.ticketComment.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, username: true, fullName: true } } },
    });
  });

  // POST /api/tickets/:id/comments
  app.post(
    '/:id/comments',
    { preHandler: [requireRole('ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER', 'LOCAL_MANAGER')] },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };
      const { body } = createCommentSchema.parse(request.body);

      const ticket = await app.prisma.ticket.findUnique({ where: { id } });
      if (!ticket) throw new NotFoundError('Ticket', id);
      assertCountryAccess(request.user, ticket.countryCode);

      const comment = await app.prisma.ticketComment.create({
        data: {
          ticketId: id,
          authorUserId: request.user.id,
          body,
        },
        include: { author: { select: { id: true, username: true, fullName: true } } },
      });

      await app.prisma.ticketEvent.create({
        data: {
          ticketId: id,
          eventType: 'COMMENT_ADDED',
          actorType: 'USER',
          actorUserId: request.user.id,
        },
      });

      await logAuditEvent(app.prisma, {
        eventType: 'TICKET_COMMENT_ADDED',
        entityType: 'TICKET',
        entityId: id,
        actorType: 'USER',
        actorUserId: request.user.id,
        countryCode: ticket.countryCode,
        message: 'Comment added to ticket',
      });

      return comment;
    },
  );

  // GET /api/tickets/:id/attachments
  app.get('/:id/attachments', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };

    const ticket = await app.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundError('Ticket', id);
    assertCountryAccess(request.user, ticket.countryCode);

    return app.prisma.ticketAttachment.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { id: true, username: true, fullName: true } } },
    });
  });

  // GET /api/tickets/:id/revisions
  app.get('/:id/revisions', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };

    const ticket = await app.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundError('Ticket', id);
    assertCountryAccess(request.user, ticket.countryCode);

    return app.prisma.contentRevision.findMany({
      where: { contentId: ticket.contentId },
      orderBy: { revisionNumber: 'desc' },
    });
  });
}

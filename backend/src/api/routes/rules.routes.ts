import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { requireRole } from '../plugins/auth.plugin.js';
import { createRuleSchema, updateRuleSchema } from '../../shared/zod-schemas.js';
import { parsePagination, buildPaginationMeta, buildPrismaSkipTake } from '../../shared/pagination.js';
import { logAuditEvent } from '../../shared/audit.js';
import { NotFoundError } from '../../shared/errors.js';

export default async function rulesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // GET /api/rules
  app.get('/', async (request: FastifyRequest) => {
    const params = parsePagination(request.query as Record<string, string>);
    const { skip, take } = buildPrismaSkipTake(params);
    const query = request.query as Record<string, string>;

    const where = {
      ...(query.severity ? { severity: query.severity as 'LOW' | 'MEDIUM' | 'HIGH' } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [rules, total] = await Promise.all([
      app.prisma.rule.findMany({
        where,
        skip,
        take,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder },
        include: {
          activeVersion: { select: { id: true, version: true, payload: true } },
          createdBy: { select: { id: true, username: true, fullName: true } },
        },
      }),
      app.prisma.rule.count({ where }),
    ]);

    return buildPaginationMeta(rules, total, params);
  });

  // POST /api/rules (ADMIN only)
  app.post(
    '/',
    { preHandler: [requireRole('ADMIN')] },
    async (request: FastifyRequest) => {
      const data = createRuleSchema.parse(request.body);

      // Create rule + initial version in a transaction
      const result = await app.prisma.$transaction(async (tx) => {
        const rule = await tx.rule.create({
          data: {
            name: data.name,
            type: data.type,
            severity: data.severity,
            applicableChannels: data.applicableChannels,
            applicableCountries: data.applicableCountries,
            createdByUserId: request.user.id,
            updatedByUserId: request.user.id,
          },
        });

        const version = await tx.ruleVersion.create({
          data: {
            ruleId: rule.id,
            version: 1,
            nameSnapshot: data.name,
            typeSnapshot: data.type,
            severitySnapshot: data.severity,
            applicableChannelsSnapshot: data.applicableChannels,
            applicableCountriesSnapshot: data.applicableCountries,
            payload: data.payload as Prisma.InputJsonValue,
            createdByUserId: request.user.id,
          },
        });

        // Set active version
        const updated = await tx.rule.update({
          where: { id: rule.id },
          data: { activeRuleVersionId: version.id },
          include: {
            activeVersion: true,
            createdBy: { select: { id: true, username: true, fullName: true } },
          },
        });

        return updated;
      });

      await logAuditEvent(app.prisma, {
        eventType: 'RULE_CREATED',
        entityType: 'RULE',
        entityId: result.id,
        actorType: 'USER',
        actorUserId: request.user.id,
        message: `Rule '${result.name}' created`,
      });

      return result;
    },
  );

  // GET /api/rules/:id
  app.get('/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };

    const rule = await app.prisma.rule.findUnique({
      where: { id },
      include: {
        activeVersion: true,
        createdBy: { select: { id: true, username: true, fullName: true } },
        updatedBy: { select: { id: true, username: true, fullName: true } },
      },
    });

    if (!rule) throw new NotFoundError('Rule', id);
    return rule;
  });

  // PUT /api/rules/:id (ADMIN only — creates a new version)
  app.put(
    '/:id',
    { preHandler: [requireRole('ADMIN')] },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };
      const data = updateRuleSchema.parse(request.body);

      const existing = await app.prisma.rule.findUnique({
        where: { id },
        include: { activeVersion: true },
      });
      if (!existing) throw new NotFoundError('Rule', id);

      const result = await app.prisma.$transaction(async (tx) => {
        // Get next version number
        const latestVersion = await tx.ruleVersion.findFirst({
          where: { ruleId: id },
          orderBy: { version: 'desc' },
        });
        const nextVersion = (latestVersion?.version ?? 0) + 1;

        // Merge existing values with updates
        const merged = {
          name: data.name ?? existing.name,
          type: data.type ?? existing.type,
          severity: data.severity ?? existing.severity,
          applicableChannels: data.applicableChannels ?? existing.applicableChannels,
          applicableCountries: data.applicableCountries ?? existing.applicableCountries,
        };

        // Create new version
        const version = await tx.ruleVersion.create({
          data: {
            ruleId: id,
            version: nextVersion,
            nameSnapshot: merged.name,
            typeSnapshot: merged.type,
            severitySnapshot: merged.severity,
            applicableChannelsSnapshot: merged.applicableChannels,
            applicableCountriesSnapshot: merged.applicableCountries,
            payload: (data.payload ?? existing.activeVersion?.payload ?? {}) as Prisma.InputJsonValue,
            createdByUserId: request.user.id,
          },
        });

        // Update rule header
        const updated = await tx.rule.update({
          where: { id },
          data: {
            ...merged,
            activeRuleVersionId: version.id,
            updatedByUserId: request.user.id,
          },
          include: {
            activeVersion: true,
            createdBy: { select: { id: true, username: true, fullName: true } },
          },
        });

        return updated;
      });

      await logAuditEvent(app.prisma, {
        eventType: 'RULE_UPDATED',
        entityType: 'RULE',
        entityId: id,
        actorType: 'USER',
        actorUserId: request.user.id,
        message: `Rule '${result.name}' updated (new version created)`,
        payload: data as Prisma.InputJsonValue,
      });

      return result;
    },
  );

  // GET /api/rules/:id/versions
  app.get('/:id/versions', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };

    const rule = await app.prisma.rule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundError('Rule', id);

    const versions = await app.prisma.ruleVersion.findMany({
      where: { ruleId: id },
      orderBy: { version: 'desc' },
      include: {
        createdBy: { select: { id: true, username: true, fullName: true } },
      },
    });

    return versions.map((v) => ({
      ...v,
      isActive: v.id === rule.activeRuleVersionId,
    }));
  });

  // POST /api/rules/:id/activate (ADMIN only)
  app.post(
    '/:id/activate',
    { preHandler: [requireRole('ADMIN')] },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };

      const rule = await app.prisma.rule.findUnique({ where: { id } });
      if (!rule) throw new NotFoundError('Rule', id);

      await app.prisma.rule.update({ where: { id }, data: { isActive: true } });

      await logAuditEvent(app.prisma, {
        eventType: 'RULE_ACTIVATED',
        entityType: 'RULE',
        entityId: id,
        actorType: 'USER',
        actorUserId: request.user.id,
        message: `Rule '${rule.name}' activated`,
      });

      return { message: 'Rule activated' };
    },
  );

  // POST /api/rules/:id/deactivate (ADMIN only)
  app.post(
    '/:id/deactivate',
    { preHandler: [requireRole('ADMIN')] },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };

      const rule = await app.prisma.rule.findUnique({ where: { id } });
      if (!rule) throw new NotFoundError('Rule', id);

      await app.prisma.rule.update({ where: { id }, data: { isActive: false } });

      await logAuditEvent(app.prisma, {
        eventType: 'RULE_DEACTIVATED',
        entityType: 'RULE',
        entityId: id,
        actorType: 'USER',
        actorUserId: request.user.id,
        message: `Rule '${rule.name}' deactivated`,
      });

      return { message: 'Rule deactivated' };
    },
  );
}

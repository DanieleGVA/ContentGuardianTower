import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { requireRole } from '../plugins/auth.plugin.js';
import { updateSettingsSchema } from '../../shared/zod-schemas.js';
import { logAuditEvent } from '../../shared/audit.js';

export default async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', requireRole('ADMIN'));

  // GET /api/settings
  app.get('/', async () => {
    return app.prisma.systemSettings.findFirst({ where: { id: 'default' } });
  });

  // PUT /api/settings
  app.put('/', async (request: FastifyRequest) => {
    const data = updateSettingsSchema.parse(request.body);

    const settings = await app.prisma.systemSettings.update({
      where: { id: 'default' },
      data,
    });

    await logAuditEvent(app.prisma, {
      eventType: 'SETTINGS_UPDATED',
      entityType: 'SYSTEM_SETTINGS',
      entityId: 'default',
      actorType: 'USER',
      actorUserId: request.user.id,
      message: 'System settings updated',
      payload: data as Prisma.InputJsonValue,
    });

    return settings;
  });
}

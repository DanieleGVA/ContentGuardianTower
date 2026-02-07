import type { PrismaClient, AuditEventType, AuditEntityType, ActorType, Channel, Prisma } from '@prisma/client';

interface AuditEventInput {
  eventType: AuditEventType;
  entityType: AuditEntityType;
  entityId: string;
  actorType?: ActorType;
  actorUserId?: string;
  countryCode?: string;
  channel?: Channel;
  message?: string;
  payload?: Prisma.InputJsonValue;
}

export async function logAuditEvent(prisma: PrismaClient, input: AuditEventInput): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      actorType: input.actorType ?? 'USER',
      actorUserId: input.actorUserId,
      countryCode: input.countryCode,
      channel: input.channel,
      message: input.message,
      payload: input.payload ?? undefined,
    },
  });
}

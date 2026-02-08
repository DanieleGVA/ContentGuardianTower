import type { PrismaClient } from '@prisma/client';
import { logAuditEvent } from '../../shared/audit.js';

export async function runEscalationScan(prisma: PrismaClient): Promise<number> {
  const settings = await prisma.systemSettings.findFirst({ where: { id: 'default' } });
  const escalationHours = settings?.escalationAfterHours ?? 48;
  const cutoff = new Date(Date.now() - escalationHours * 60 * 60 * 1000);

  // Find tickets that are OPEN or IN_PROGRESS and haven't been updated since cutoff
  const staleTickets = await prisma.ticket.findMany({
    where: {
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      updatedAt: { lt: cutoff },
      escalationLevel: { not: 'GLOBAL' }, // Already at max
    },
    select: { id: true, escalationLevel: true, countryCode: true, channel: true },
  });

  let escalatedCount = 0;

  for (const ticket of staleTickets) {
    const nextLevel = ticket.escalationLevel === 'LOCAL' ? 'REGIONAL' : 'GLOBAL';

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { escalationLevel: nextLevel },
    });

    await prisma.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        eventType: 'ESCALATED',
        actorType: 'SYSTEM',
        fromEscalationLevel: ticket.escalationLevel,
        toEscalationLevel: nextLevel,
      },
    });

    await logAuditEvent(prisma, {
      eventType: 'ESCALATION_TRIGGERED',
      entityType: 'TICKET',
      entityId: ticket.id,
      actorType: 'SYSTEM',
      countryCode: ticket.countryCode,
      channel: ticket.channel,
      message: `Ticket escalated from ${ticket.escalationLevel} to ${nextLevel}`,
    });

    escalatedCount++;
  }

  // Update overdue flags
  await prisma.ticket.updateMany({
    where: {
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      dueAt: { lt: new Date() },
      isOverdue: false,
    },
    data: { isOverdue: true },
  });

  return escalatedCount;
}

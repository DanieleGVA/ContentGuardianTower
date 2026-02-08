import type { PrismaClient } from '@prisma/client';
import { logAuditEvent } from '../../shared/audit.js';

export async function runRetentionPurge(prisma: PrismaClient): Promise<{ auditEventsDeleted: number; ingestionRunsDeleted: number }> {
  const settings = await prisma.systemSettings.findFirst({ where: { id: 'default' } });
  const retentionDays = settings?.retentionDays ?? 180;

  // Skip if last RETENTION_RUN was less than 24h ago
  const lastRun = await prisma.auditEvent.findFirst({
    where: { eventType: 'RETENTION_RUN' },
    orderBy: { createdAt: 'desc' },
  });

  if (lastRun) {
    const hoursSinceLast = (Date.now() - lastRun.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLast < 24) {
      return { auditEventsDeleted: 0, ingestionRunsDeleted: 0 };
    }
  }

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  // Delete old audit events (except RETENTION_RUN events themselves)
  const auditResult = await prisma.auditEvent.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      eventType: { not: 'RETENTION_RUN' },
    },
  });

  // Delete old completed ingestion runs (cascading to ingestion items)
  // First delete related ingestion items
  const oldRuns = await prisma.ingestionRun.findMany({
    where: {
      status: { in: ['SUCCEEDED', 'FAILED', 'CANCELED'] },
      completedAt: { lt: cutoff },
    },
    select: { id: true },
  });

  const oldRunIds = oldRuns.map((r) => r.id);

  let ingestionRunsDeleted = 0;
  if (oldRunIds.length > 0) {
    await prisma.ingestionItem.deleteMany({
      where: { runId: { in: oldRunIds } },
    });

    const runResult = await prisma.ingestionRun.deleteMany({
      where: { id: { in: oldRunIds } },
    });
    ingestionRunsDeleted = runResult.count;
  }

  // Log the retention run
  await logAuditEvent(prisma, {
    eventType: 'RETENTION_RUN',
    entityType: 'SYSTEM_SETTINGS',
    entityId: 'default',
    actorType: 'SYSTEM',
    message: `Retention purge: ${auditResult.count} audit events, ${ingestionRunsDeleted} ingestion runs deleted (cutoff: ${retentionDays} days)`,
    payload: {
      retentionDays,
      auditEventsDeleted: auditResult.count,
      ingestionRunsDeleted,
      cutoffDate: cutoff.toISOString(),
    },
  });

  return {
    auditEventsDeleted: auditResult.count,
    ingestionRunsDeleted,
  };
}

import type PgBoss from 'pg-boss';
import type { PrismaClient } from '@prisma/client';
import { SCHEDULER_LOCKS } from '../../shared/types/index.js';
import { runEscalationScan } from './escalation.js';
import { queueDueIngestionRuns } from './periodic-ingestion.js';
import { runRetentionPurge } from './retention.js';

const SCHEDULER_INTERVAL_MS = 60_000; // 60 seconds

async function tryAdvisoryLock(prisma: PrismaClient, lockKey: number): Promise<boolean> {
  const result = await prisma.$queryRawUnsafe<[{ pg_try_advisory_lock: boolean }]>(
    `SELECT pg_try_advisory_lock($1)`,
    lockKey,
  );
  return result[0]?.pg_try_advisory_lock ?? false;
}

async function releaseAdvisoryLock(prisma: PrismaClient, lockKey: number): Promise<void> {
  await prisma.$queryRawUnsafe(`SELECT pg_advisory_unlock($1)`, lockKey);
}

export function startScheduler(prisma: PrismaClient, boss: PgBoss): NodeJS.Timeout {
  const interval = setInterval(async () => {
    // Escalation scan
    const gotEscalationLock = await tryAdvisoryLock(prisma, SCHEDULER_LOCKS.ESCALATION_SCAN);
    if (gotEscalationLock) {
      try {
        const escalated = await runEscalationScan(prisma);
        if (escalated > 0) {
          console.log(`Escalation scan: ${escalated} tickets escalated`);
        }
      } catch (err) {
        console.error('Escalation scan failed:', err);
      } finally {
        await releaseAdvisoryLock(prisma, SCHEDULER_LOCKS.ESCALATION_SCAN);
      }
    }

    // Periodic ingestion
    const gotIngestionLock = await tryAdvisoryLock(prisma, SCHEDULER_LOCKS.PERIODIC_INGESTION);
    if (gotIngestionLock) {
      try {
        const queued = await queueDueIngestionRuns(prisma, boss);
        if (queued > 0) {
          console.log(`Periodic ingestion: ${queued} runs queued`);
        }
      } catch (err) {
        console.error('Periodic ingestion failed:', err);
      } finally {
        await releaseAdvisoryLock(prisma, SCHEDULER_LOCKS.PERIODIC_INGESTION);
      }
    }

    // Retention purge
    const gotRetentionLock = await tryAdvisoryLock(prisma, SCHEDULER_LOCKS.RETENTION_PURGE);
    if (gotRetentionLock) {
      try {
        const result = await runRetentionPurge(prisma);
        if (result.auditEventsDeleted > 0 || result.ingestionRunsDeleted > 0) {
          console.log(`Retention purge: ${result.auditEventsDeleted} audit events, ${result.ingestionRunsDeleted} runs deleted`);
        }
      } catch (err) {
        console.error('Retention purge failed:', err);
      } finally {
        await releaseAdvisoryLock(prisma, SCHEDULER_LOCKS.RETENTION_PURGE);
      }
    }
  }, SCHEDULER_INTERVAL_MS);

  console.log(`Scheduler started (interval: ${SCHEDULER_INTERVAL_MS}ms)`);
  return interval;
}

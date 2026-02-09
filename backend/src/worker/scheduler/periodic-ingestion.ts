import type PgBoss from 'pg-boss';
import type { PrismaClient } from '@prisma/client';

export async function queueDueIngestionRuns(prisma: PrismaClient, boss: PgBoss): Promise<number> {
  const now = new Date();

  // Find sources that are due for ingestion
  const dueSources = await prisma.source.findMany({
    where: {
      isEnabled: true,
      isDeleted: false,
      crawlFrequencyMinutes: { not: null },
      OR: [
        { nextRunAt: { lte: now } },
        { nextRunAt: null, lastRunAt: null }, // Never run
      ],
    },
  });

  let queued = 0;

  for (const source of dueSources) {
    // Create the ingestion run record
    const run = await prisma.ingestionRun.create({
      data: {
        runType: source.channel === 'WEB' ? 'CRAWL' : 'SOCIAL_PULL',
        sourceId: source.id,
        channel: source.channel,
        countryCode: source.countryCode,
        status: 'RUNNING',
      },
    });

    // Queue the job
    await boss.send('ingestion-run', {
      sourceId: source.id,
      runId: run.id,
    });

    // Update nextRunAt to prevent duplicate queuing
    const nextRunAt = new Date(now.getTime() + (source.crawlFrequencyMinutes ?? 60) * 60_000);
    await prisma.source.update({
      where: { id: source.id },
      data: { nextRunAt, lastRunAt: now },
    });

    queued++;
  }

  return queued;
}

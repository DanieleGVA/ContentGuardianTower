import type PgBoss from 'pg-boss';
import type { PrismaClient } from '@prisma/client';
import { executePipeline } from '../pipeline/state-machine.js';

interface IngestionJobData {
  sourceId: string;
  runId: string;
}

export async function registerIngestionHandler(boss: PgBoss, prisma: PrismaClient) {
  await boss.work<IngestionJobData>('ingestion-run', async (jobs) => {
    const job = Array.isArray(jobs) ? jobs[0] : jobs;
    const { sourceId, runId } = job.data;
    console.log(`Processing ingestion run ${runId} for source ${sourceId}`);

    try {
      await executePipeline(prisma, { id: sourceId }, runId);
    } catch (err) {
      console.error(`Ingestion run ${runId} failed:`, err);

      await prisma.ingestionRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          lastError: err instanceof Error ? err.message : String(err),
        },
      });

      throw err;
    }
  });
}

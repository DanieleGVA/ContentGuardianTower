import type PgBoss from 'pg-boss';
import type { PrismaClient } from '@prisma/client';
import { registerIngestionHandler } from './handlers/ingestion.handler.js';
import { registerExportHandler } from './handlers/export.handler.js';

export async function registerWorkerHandlers(boss: PgBoss, prisma: PrismaClient) {
  // pgboss v10 requires explicit queue creation before send/work
  await boss.createQueue('ingestion-run');
  await boss.createQueue('export-csv');

  await registerIngestionHandler(boss, prisma);
  await registerExportHandler(boss, prisma);
  console.log('Worker handlers registered: ingestion-run, export-csv');
}

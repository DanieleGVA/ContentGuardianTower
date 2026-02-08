import type PgBoss from 'pg-boss';
import type { PrismaClient } from '@prisma/client';
import { registerIngestionHandler } from './handlers/ingestion.handler.js';
import { registerExportHandler } from './handlers/export.handler.js';

export function registerWorkerHandlers(boss: PgBoss, prisma: PrismaClient) {
  registerIngestionHandler(boss, prisma);
  registerExportHandler(boss, prisma);
  console.log('Worker handlers registered: ingestion-run, export-csv');
}

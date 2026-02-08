import type PgBoss from 'pg-boss';
import type { PrismaClient } from '@prisma/client';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { logAuditEvent } from '../../shared/audit.js';

interface ExportJobData {
  exportId: string;
}

const STORAGE_DIR = process.env.EXPORT_STORAGE_DIR || './storage/exports';

export function registerExportHandler(boss: PgBoss, prisma: PrismaClient) {
  boss.work<ExportJobData>('export-csv', async (jobs) => {
    const job = Array.isArray(jobs) ? jobs[0] : jobs;
    const { exportId } = job.data;

    const exportRecord = await prisma.export.findUnique({ where: { id: exportId } });
    if (!exportRecord) throw new Error(`Export ${exportId} not found`);

    await prisma.export.update({ where: { id: exportId }, data: { status: 'RUNNING' } });

    try {
      await mkdir(STORAGE_DIR, { recursive: true });
      const filePath = path.join(STORAGE_DIR, `${exportId}.csv`);
      const stream = createWriteStream(filePath);

      const settings = await prisma.systemSettings.findFirst({ where: { id: 'default' } });
      const maxRows = exportRecord.maxRowsEnforced ?? settings?.exportMaxRows ?? 50000;

      let rowCount = 0;

      if (exportRecord.exportType === 'TICKETS_CSV') {
        stream.write('id,ticketKey,status,riskLevel,escalationLevel,channel,countryCode,title,createdAt\n');

        const tickets = await prisma.ticket.findMany({
          take: maxRows,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            ticketKey: true,
            status: true,
            riskLevel: true,
            escalationLevel: true,
            channel: true,
            countryCode: true,
            title: true,
            createdAt: true,
          },
        });

        for (const t of tickets) {
          const title = (t.title ?? '').replace(/"/g, '""');
          stream.write(`${t.id},${t.ticketKey},${t.status},${t.riskLevel},${t.escalationLevel},${t.channel},${t.countryCode},"${title}",${t.createdAt.toISOString()}\n`);
          rowCount++;
        }
      } else if (exportRecord.exportType === 'AUDIT_CSV') {
        stream.write('id,eventType,actorType,actorUserId,entityType,entityId,message,createdAt\n');

        const events = await prisma.auditEvent.findMany({
          take: maxRows,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            eventType: true,
            actorType: true,
            actorUserId: true,
            entityType: true,
            entityId: true,
            message: true,
            createdAt: true,
          },
        });

        for (const e of events) {
          const message = (e.message ?? '').replace(/"/g, '""');
          stream.write(`${e.id},${e.eventType},${e.actorType},${e.actorUserId ?? ''},${e.entityType},${e.entityId},"${message}",${e.createdAt.toISOString()}\n`);
          rowCount++;
        }
      }

      stream.end();
      await new Promise<void>((resolve) => stream.on('finish', resolve));

      await prisma.export.update({
        where: { id: exportId },
        data: {
          status: 'SUCCEEDED',
          completedAt: new Date(),
          rowCount,
          storageKey: filePath,
        },
      });

      await logAuditEvent(prisma, {
        eventType: 'EXPORT_COMPLETED',
        entityType: 'EXPORT',
        entityId: exportId,
        actorType: 'SYSTEM',
        message: `Export completed: ${rowCount} rows written to ${exportRecord.exportType}`,
      });
    } catch (err) {
      await prisma.export.update({
        where: { id: exportId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          lastError: err instanceof Error ? err.message : String(err),
        },
      });

      await logAuditEvent(prisma, {
        eventType: 'EXPORT_FAILED',
        entityType: 'EXPORT',
        entityId: exportId,
        actorType: 'SYSTEM',
        message: `Export failed: ${err instanceof Error ? err.message : String(err)}`,
      });

      throw err;
    }
  });
}

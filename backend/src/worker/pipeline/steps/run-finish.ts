import type { PipelineContext } from '../types.js';
import { logAuditEvent } from '../../../shared/audit.js';

export async function runFinish(ctx: PipelineContext): Promise<void> {
  const completedAt = new Date();

  // Determine final status
  const failedItems = await ctx.prisma.ingestionItem.count({
    where: { runId: ctx.run.id, fetchStatus: { not: 'OK' } },
  });

  const status = failedItems > 0 ? 'PARTIAL' : 'SUCCEEDED';

  await ctx.prisma.ingestionRun.update({
    where: { id: ctx.run.id },
    data: {
      status,
      completedAt,
      itemsFailed: failedItems,
    },
  });

  // Update source run tracking
  await ctx.prisma.source.update({
    where: { id: ctx.source.id },
    data: {
      lastRunAt: completedAt,
      nextRunAt: ctx.source.crawlFrequencyMinutes
        ? new Date(completedAt.getTime() + ctx.source.crawlFrequencyMinutes * 60 * 1000)
        : null,
    },
  });

  await logAuditEvent(ctx.prisma, {
    eventType: 'INGESTION_RUN_COMPLETED',
    entityType: 'INGESTION_RUN',
    entityId: ctx.run.id,
    actorType: 'SYSTEM',
    countryCode: ctx.source.countryCode,
    channel: ctx.source.channel,
    message: `Ingestion run ${status}. Fetched: ${ctx.fetchedItems.length}, Changed: ${ctx.changedRevisions.length}, Tickets: ${ctx.ticketsCreated}`,
  });
}

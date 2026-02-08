import type { PipelineContext } from '../types.js';
import { logAuditEvent } from '../../../shared/audit.js';

export async function runStart(ctx: PipelineContext): Promise<void> {
  await ctx.prisma.ingestionRun.update({
    where: { id: ctx.run.id },
    data: { status: 'RUNNING' },
  });

  await logAuditEvent(ctx.prisma, {
    eventType: 'INGESTION_RUN_STARTED',
    entityType: 'INGESTION_RUN',
    entityId: ctx.run.id,
    actorType: 'SYSTEM',
    countryCode: ctx.source.countryCode,
    channel: ctx.source.channel,
    message: `Ingestion run started for source '${ctx.source.displayName}'`,
  });
}

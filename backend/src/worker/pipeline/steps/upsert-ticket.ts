import type { PipelineContext } from '../types.js';
import { logAuditEvent } from '../../../shared/audit.js';

export async function upsertTicket(ctx: PipelineContext): Promise<void> {
  let ticketsCreated = 0;

  // Get system settings for due date calculations
  const settings = await ctx.prisma.systemSettings.findFirst({ where: { id: 'default' } });

  for (const result of ctx.analysisResults) {
    if (result.complianceStatus === 'COMPLIANT') continue;

    // Find the stored revision info for this analysis
    const stored = ctx.storedRevisions.find(
      (s) => s.revision.id === result.revisionId,
    );
    if (!stored) continue;

    // Idempotency: check if ticket already exists for this revision
    const ticketKey = `rev:${result.revisionId}`;
    const existingTicket = await ctx.prisma.ticket.findUnique({
      where: { ticketKey },
    });
    if (existingTicket) continue;

    // Determine risk level
    let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCERTAIN_MEDIUM' = 'UNCERTAIN_MEDIUM';
    if (result.complianceStatus === 'NON_COMPLIANT' && result.violations.length > 0) {
      // Use the highest severity from violations
      const severities = result.violations.map((v) => v.severitySnapshot);
      if (severities.includes('HIGH')) riskLevel = 'HIGH';
      else if (severities.includes('MEDIUM')) riskLevel = 'MEDIUM';
      else riskLevel = 'LOW';
    } else if (result.complianceStatus === 'UNCERTAIN') {
      riskLevel = (settings?.uncertainDefaultRiskLevel as typeof riskLevel) ?? 'UNCERTAIN_MEDIUM';
    }

    // Calculate due date
    const now = new Date();
    let dueAt: Date;
    switch (riskLevel) {
      case 'HIGH':
        dueAt = new Date(now.getTime() + (settings?.defaultDueHoursHigh ?? 24) * 60 * 60 * 1000);
        break;
      case 'MEDIUM':
      case 'UNCERTAIN_MEDIUM':
        dueAt = new Date(now.getTime() + (settings?.defaultDueHoursMedium ?? 72) * 60 * 60 * 1000);
        break;
      case 'LOW':
        dueAt = new Date(now.getTime() + (settings?.defaultDueDaysLow ?? 7) * 24 * 60 * 60 * 1000);
        break;
    }

    // Get the analysis result record
    const analysisRecord = await ctx.prisma.analysisResult.findUnique({
      where: { revisionId: result.revisionId },
    });
    if (!analysisRecord) continue;

    // Build title and summary
    const title = result.violations.length > 0
      ? result.violations[0].explanation.slice(0, 200)
      : `${result.complianceStatus} content detected`;
    const summary = result.violations
      .map((v) => v.explanation)
      .join('; ')
      .slice(0, 1000);

    await ctx.prisma.ticket.create({
      data: {
        ticketKey,
        contentId: stored.contentItem.id,
        revisionId: stored.revision.id,
        analysisId: analysisRecord.id,
        sourceId: ctx.source.id,
        channel: ctx.source.channel,
        countryCode: ctx.source.countryCode,
        riskLevel,
        dueAt,
        title,
        summary,
        violatedRuleVersionIds: result.violations.map((v) => v.ruleVersionId),
        contentUrl: stored.contentItem.url,
        detectedLanguage: result.languageDetected,
        createdBy: 'SYSTEM',
      },
    });

    // Create CREATED event
    const createdTicket = (await ctx.prisma.ticket.findUnique({ where: { ticketKey } }))!;
    await ctx.prisma.ticketEvent.create({
      data: {
        ticketId: createdTicket.id,
        eventType: 'CREATED',
        actorType: 'SYSTEM',
      },
    });

    await logAuditEvent(ctx.prisma, {
      eventType: 'TICKET_CREATED',
      entityType: 'TICKET',
      entityId: createdTicket.id,
      actorType: 'SYSTEM',
      countryCode: ctx.source.countryCode,
      channel: ctx.source.channel,
      message: `Ticket created for ${result.complianceStatus} content (risk: ${riskLevel})`,
    });

    ticketsCreated++;
  }

  ctx.ticketsCreated = ticketsCreated;
}

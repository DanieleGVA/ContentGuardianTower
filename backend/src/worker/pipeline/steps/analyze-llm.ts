import type { Prisma } from '@prisma/client';
import type { PipelineContext } from '../types.js';
import { getOpenAIClient } from '../../analysis/openai-client.js';
import { buildCompliancePrompt } from '../../analysis/prompt-builder.js';
import { parseAnalysisResponse } from '../../analysis/response-parser.js';

export async function analyzeLlm(ctx: PipelineContext): Promise<void> {
  if (ctx.changedRevisions.length === 0) return;

  // Get active rules for this channel and country
  const rules = await ctx.prisma.rule.findMany({
    where: {
      isActive: true,
      applicableChannels: { has: ctx.source.channel },
      applicableCountries: { has: ctx.source.countryCode },
    },
    include: { activeVersion: true },
  });

  const ruleVersions = rules
    .map((r) => r.activeVersion)
    .filter((v): v is NonNullable<typeof v> => v !== null);

  if (ruleVersions.length === 0) {
    // No applicable rules — mark all as COMPLIANT
    for (const stored of ctx.changedRevisions) {
      await ctx.prisma.analysisResult.create({
        data: {
          contentId: stored.contentItem.id,
          revisionId: stored.revision.id,
          channel: ctx.source.channel,
          countryCode: ctx.source.countryCode,
          complianceStatus: 'COMPLIANT',
          applicableRuleVersionIds: [],
          violations: [],
        },
      });
      ctx.analysisResults.push({
        revisionId: stored.revision.id,
        contentId: stored.contentItem.id,
        complianceStatus: 'COMPLIANT',
        violations: [],
      });
    }
    return;
  }

  // Get system settings for PII redaction
  const settings = await ctx.prisma.systemSettings.findFirst({ where: { id: 'default' } });
  const piiRedactionEnabled = settings?.piiRedactionEnabledDefault ?? true;

  let openai: Awaited<ReturnType<typeof getOpenAIClient>> | null = null;
  try {
    openai = await getOpenAIClient(ctx.prisma);
  } catch {
    // LLM not configured — mark as UNCERTAIN
    for (const stored of ctx.changedRevisions) {
      await ctx.prisma.analysisResult.create({
        data: {
          contentId: stored.contentItem.id,
          revisionId: stored.revision.id,
          channel: ctx.source.channel,
          countryCode: ctx.source.countryCode,
          complianceStatus: 'UNCERTAIN',
          uncertainReason: 'LLM API key not configured',
          applicableRuleVersionIds: ruleVersions.map((v) => v.id),
          violations: [],
        },
      });
      ctx.analysisResults.push({
        revisionId: stored.revision.id,
        contentId: stored.contentItem.id,
        complianceStatus: 'UNCERTAIN',
        violations: [],
      });
    }
    return;
  }

  for (const stored of ctx.changedRevisions) {
    const analysisStartedAt = new Date();

    const { system, user } = buildCompliancePrompt(
      stored.revision,
      ruleVersions,
      piiRedactionEnabled,
    );

    const completion = await openai.client.chat.completions.create({
      model: openai.model,
      max_tokens: openai.maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const responseText = completion.choices[0]?.message?.content ?? '{}';
    const analysisCompletedAt = new Date();
    const latencyMs = analysisCompletedAt.getTime() - analysisStartedAt.getTime();

    const result = parseAnalysisResponse(
      responseText,
      stored.revision.id,
      stored.contentItem.id,
    );

    await ctx.prisma.analysisResult.create({
      data: {
        contentId: stored.contentItem.id,
        revisionId: stored.revision.id,
        channel: ctx.source.channel,
        countryCode: ctx.source.countryCode,
        complianceStatus: result.complianceStatus,
        languageDetected: result.languageDetected,
        languageConfidence: result.languageConfidence,
        applicableRuleVersionIds: ruleVersions.map((v) => v.id),
        violations: result.violations as unknown as Prisma.InputJsonValue,
        llmProvider: settings?.llmProvider ?? 'openai',
        llmModel: openai.model,
        piiRedactionEnabled,
        analysisStartedAt,
        analysisCompletedAt,
        analysisLatencyMs: latencyMs,
      },
    });

    ctx.analysisResults.push(result);
  }

  await ctx.prisma.ingestionRun.update({
    where: { id: ctx.run.id },
    data: {
      analysisQueued: ctx.changedRevisions.length,
      analysisCompleted: ctx.analysisResults.length,
    },
  });
}

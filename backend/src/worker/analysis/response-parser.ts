import type { AnalysisOutput, ViolationOutput } from '../pipeline/types.js';

interface LlmResponse {
  complianceStatus: string;
  languageDetected?: string;
  languageConfidence?: number;
  violations: ViolationOutput[];
}

export function parseAnalysisResponse(
  raw: string,
  revisionId: string,
  contentId: string,
): AnalysisOutput {
  // Extract JSON from potential markdown code blocks
  let jsonStr = raw.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed: LlmResponse = JSON.parse(jsonStr);

  const validStatuses = ['COMPLIANT', 'NON_COMPLIANT', 'UNCERTAIN'];
  const status = validStatuses.includes(parsed.complianceStatus)
    ? (parsed.complianceStatus as AnalysisOutput['complianceStatus'])
    : 'UNCERTAIN';

  return {
    revisionId,
    contentId,
    complianceStatus: status,
    violations: Array.isArray(parsed.violations) ? parsed.violations : [],
    languageDetected: parsed.languageDetected,
    languageConfidence: parsed.languageConfidence,
  };
}

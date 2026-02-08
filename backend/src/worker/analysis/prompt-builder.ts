import type { RuleVersion } from '@prisma/client';
import type { ContentRevision } from '@prisma/client';

// Simple PII patterns for redaction
const PII_PATTERNS = [
  { pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, replacement: '[PERSON_NAME]' },
  { pattern: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, replacement: '[EMAIL]' },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
  { pattern: /\b\d{2,3}[-.]?\d{6,8}[-.]?\d{0,4}\b/g, replacement: '[ID_NUMBER]' },
];

function redactPii(text: string): string {
  let result = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function buildCompliancePrompt(
  revision: ContentRevision,
  rules: RuleVersion[],
  piiRedactionEnabled: boolean,
): { system: string; user: string } {
  const textFields: Record<string, string> = {};

  const fields = [
    ['title', revision.title],
    ['main_text', revision.mainText],
    ['caption', revision.caption],
    ['description', revision.description],
    ['comment_text', revision.commentText],
    ['ocr_text', revision.ocrText],
    ['transcript', revision.transcript],
  ] as const;

  for (const [key, value] of fields) {
    if (value) {
      textFields[key] = piiRedactionEnabled ? redactPii(value) : value;
    }
  }

  const rulesDescription = rules.map((r) => `- Rule "${r.nameSnapshot}" (${r.typeSnapshot}, severity: ${r.severitySnapshot}): ${JSON.stringify(r.payload)}`).join('\n');

  const system = `You are a compliance analysis engine for Content Guardian Tower.
Analyze the provided content against the given rules.

Respond ONLY with a JSON object in this exact format:
{
  "complianceStatus": "COMPLIANT" | "NON_COMPLIANT" | "UNCERTAIN",
  "languageDetected": "en" | "it" | "es" | etc,
  "languageConfidence": 0.0 to 1.0,
  "violations": [
    {
      "ruleVersionId": "<id>",
      "ruleId": "<id>",
      "severitySnapshot": "LOW" | "MEDIUM" | "HIGH",
      "evidence": [
        {
          "field": "<field_name>",
          "snippet": "<exact text that violates>",
          "startOffset": <number or null>,
          "endOffset": <number or null>
        }
      ],
      "explanation": "<why this violates the rule>",
      "fixSuggestion": "<suggested fix>"
    }
  ]
}

Rules:
- If NO violations found, return complianceStatus = "COMPLIANT" and empty violations array
- If content cannot be evaluated with confidence, return "UNCERTAIN"
- Each violation must reference a specific rule and provide evidence with exact text snippets`;

  const user = `Analyze this content for compliance:

Content fields:
${JSON.stringify(textFields, null, 2)}

Rules to check against:
${rulesDescription}`;

  return { system, user };
}

import type { PrismaClient, Source, IngestionRun, ContentItem, ContentRevision } from '@prisma/client';
import type { IngestionStepName } from '../../shared/types/index.js';

export interface PipelineContext {
  prisma: PrismaClient;
  source: Source;
  run: IngestionRun;
  // Accumulated during pipeline execution
  fetchedItems: FetchedItem[];
  normalizedItems: NormalizedItem[];
  storedRevisions: StoredRevision[];
  changedRevisions: StoredRevision[];
  analysisResults: AnalysisOutput[];
  ticketsCreated: number;
}

export interface FetchedItem {
  externalId: string;
  url?: string;
  title?: string;
  mainText?: string;
  caption?: string;
  description?: string;
  tags?: string[];
  commentText?: string;
  ocrText?: string;
  transcript?: string;
  authorHandle?: string;
  publishedAt?: Date;
  rawHtml?: string;
}

export interface NormalizedItem extends FetchedItem {
  normalizedTextHash: string;
  contentKey: string;
}

export interface StoredRevision {
  contentItem: ContentItem;
  revision: ContentRevision;
  isNew: boolean;
  isChanged: boolean;
}

export interface AnalysisOutput {
  revisionId: string;
  contentId: string;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNCERTAIN';
  violations: ViolationOutput[];
  languageDetected?: string;
  languageConfidence?: number;
}

export interface ViolationOutput {
  ruleVersionId: string;
  ruleId: string;
  severitySnapshot: 'LOW' | 'MEDIUM' | 'HIGH';
  evidence: { field: string; snippet: string; startOffset?: number; endOffset?: number }[];
  explanation: string;
  fixSuggestion?: string;
}

export type StepFunction = (ctx: PipelineContext) => Promise<void>;

export interface StepDefinition {
  name: IngestionStepName;
  execute: StepFunction;
}

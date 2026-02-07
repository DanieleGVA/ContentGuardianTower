// Violation structure stored as JSON in AnalysisResult.violations
export interface Violation {
  ruleVersionId: string;
  ruleId: string;
  severitySnapshot: 'LOW' | 'MEDIUM' | 'HIGH';
  evidence: ViolationEvidence[];
  explanation: string;
  fixSuggestion?: string;
}

export interface ViolationEvidence {
  field: string;
  snippet: string;
  startOffset?: number;
  endOffset?: number;
}

// Ingestion step tracking stored as JSON in IngestionRun.steps
export interface IngestionStep {
  name: IngestionStepName;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
  attempts: number;
  lastError?: string;
  startedAt?: string;
  completedAt?: string;
}

export type IngestionStepName =
  | 'RUN_START'
  | 'FETCH_ITEMS'
  | 'NORMALIZE_HASH'
  | 'STORE_REVISION'
  | 'DIFF'
  | 'ANALYZE_LLM'
  | 'UPSERT_TICKET'
  | 'RUN_FINISH';

// API pagination
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard KPIs
export interface DashboardKPIs {
  ticketsByStatus: Record<string, number>;
  ticketsByRisk: Record<string, number>;
  ticketsByEscalation: Record<string, number>;
  ticketsByCountry: Record<string, number>;
  recentActivity: {
    newTickets24h: number;
    resolvedTickets24h: number;
    escalatedTickets: number;
    overdueTickets: number;
  };
}

// Scheduler lock keys (PostgreSQL advisory locks)
export const SCHEDULER_LOCKS = {
  ESCALATION_SCAN: 1,
  RETENTION_PURGE: 2,
  PERIODIC_INGESTION: 3,
} as const;

// Content key generation
export function generateContentKey(normalizedText: string, canonicalUrl: string): string {
  // Implementation will use crypto.createHash('sha256')
  // content_key = sha256(normalized_text + canonical_url)
  throw new Error('Not implemented - use crypto.createHash');
}

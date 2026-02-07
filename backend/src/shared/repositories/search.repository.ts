// SearchRepository: abstracts full-text search
// Current implementation: PostgreSQL tsvector + GIN
// Future: can swap to Elasticsearch without changing business logic

export interface SearchOptions {
  query: string;
  page: number;
  pageSize: number;
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SearchRepository {
  searchTickets(options: SearchOptions): Promise<SearchResult<unknown>>;
  searchRevisions(options: SearchOptions): Promise<SearchResult<unknown>>;
  searchSources(options: SearchOptions): Promise<SearchResult<unknown>>;
  searchRules(options: SearchOptions): Promise<SearchResult<unknown>>;
  searchAuditEvents(options: SearchOptions): Promise<SearchResult<unknown>>;
}

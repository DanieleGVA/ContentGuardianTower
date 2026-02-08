import type { PrismaClient } from '@prisma/client';
import type { SearchRepository, SearchOptions, SearchResult } from './search.repository.js';

type TableName = 'cgt_tickets' | 'cgt_content_revisions' | 'cgt_sources' | 'cgt_rules' | 'cgt_audit_events';

export class PostgresSearchRepository implements SearchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async searchByVector(
    table: TableName,
    query: string,
  ): Promise<string[]> {
    const results = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM ${table} WHERE search_vector @@ plainto_tsquery('english', $1) ORDER BY ts_rank(search_vector, plainto_tsquery('english', $1)) DESC LIMIT 1000`,
      query,
    );
    return results.map((r) => r.id);
  }

  async searchTickets(options: SearchOptions): Promise<SearchResult<unknown>> {
    const ids = await this.searchByVector('cgt_tickets', options.query);
    const skip = (options.page - 1) * options.pageSize;

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { id: { in: ids } },
        skip,
        take: options.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      Promise.resolve(ids.length),
    ]);

    return { items, total, page: options.page, pageSize: options.pageSize };
  }

  async searchRevisions(options: SearchOptions): Promise<SearchResult<unknown>> {
    const ids = await this.searchByVector('cgt_content_revisions', options.query);
    const skip = (options.page - 1) * options.pageSize;

    const [items, total] = await Promise.all([
      this.prisma.contentRevision.findMany({
        where: { id: { in: ids } },
        skip,
        take: options.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      Promise.resolve(ids.length),
    ]);

    return { items, total, page: options.page, pageSize: options.pageSize };
  }

  async searchSources(options: SearchOptions): Promise<SearchResult<unknown>> {
    const ids = await this.searchByVector('cgt_sources', options.query);
    const skip = (options.page - 1) * options.pageSize;

    const [items, total] = await Promise.all([
      this.prisma.source.findMany({
        where: { id: { in: ids }, isDeleted: false },
        skip,
        take: options.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      Promise.resolve(ids.length),
    ]);

    return { items, total, page: options.page, pageSize: options.pageSize };
  }

  async searchRules(options: SearchOptions): Promise<SearchResult<unknown>> {
    const ids = await this.searchByVector('cgt_rules', options.query);
    const skip = (options.page - 1) * options.pageSize;

    const [items, total] = await Promise.all([
      this.prisma.rule.findMany({
        where: { id: { in: ids } },
        skip,
        take: options.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          activeVersion: { select: { id: true, version: true, payload: true } },
          createdBy: { select: { id: true, username: true, fullName: true } },
        },
      }),
      Promise.resolve(ids.length),
    ]);

    return { items, total, page: options.page, pageSize: options.pageSize };
  }

  async searchAuditEvents(options: SearchOptions): Promise<SearchResult<unknown>> {
    const ids = await this.searchByVector('cgt_audit_events', options.query);
    const skip = (options.page - 1) * options.pageSize;

    const [items, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where: { id: { in: ids } },
        skip,
        take: options.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, username: true, fullName: true } },
        },
      }),
      Promise.resolve(ids.length),
    ]);

    return { items, total, page: options.page, pageSize: options.pageSize };
  }
}

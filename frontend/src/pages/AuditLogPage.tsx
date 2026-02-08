import { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Pagination } from '../components/ui/Pagination';
import { FilterBar } from '../components/ui/FilterBar';
import { useFilters } from '../hooks/useFilters';
import { usePagination } from '../hooks/usePagination';
import { api } from '../lib/api-client';

interface AuditLogEntry {
  id: string;
  eventType: string;
  actorType: string;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  countryCode: string | null;
  channel: string | null;
  message: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; username: string; fullName: string } | null;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'All Events' },
  { value: 'USER_LOGIN', label: 'User Login' },
  { value: 'USER_LOGOUT', label: 'User Logout' },
  { value: 'USER_CREATED', label: 'User Created' },
  { value: 'USER_UPDATED', label: 'User Updated' },
  { value: 'USER_DELETED', label: 'User Deleted' },
  { value: 'SOURCE_CREATED', label: 'Source Created' },
  { value: 'SOURCE_UPDATED', label: 'Source Updated' },
  { value: 'SOURCE_DELETED', label: 'Source Deleted' },
  { value: 'RULE_CREATED', label: 'Rule Created' },
  { value: 'RULE_UPDATED', label: 'Rule Updated' },
  { value: 'TICKET_CREATED', label: 'Ticket Created' },
  { value: 'TICKET_UPDATED', label: 'Ticket Updated' },
  { value: 'TICKET_ESCALATED', label: 'Ticket Escalated' },
  { value: 'INGESTION_STARTED', label: 'Ingestion Started' },
  { value: 'INGESTION_COMPLETED', label: 'Ingestion Completed' },
  { value: 'INGESTION_FAILED', label: 'Ingestion Failed' },
  { value: 'SETTINGS_UPDATED', label: 'Settings Updated' },
  { value: 'EXPORT_REQUESTED', label: 'Export Requested' },
];

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All Entities' },
  { value: 'User', label: 'User' },
  { value: 'Source', label: 'Source' },
  { value: 'Rule', label: 'Rule' },
  { value: 'Ticket', label: 'Ticket' },
  { value: 'IngestionRun', label: 'Ingestion Run' },
  { value: 'SystemSettings', label: 'Settings' },
];

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}

function shortId(id: string | null): string {
  if (!id) return '--';
  return id.substring(0, 8);
}

export function AuditLogPage() {
  const { filters, setFilter, clearFilters, activeFilters } = useFilters();
  const { page, pageSize, setPage, setPageSize } = usePagination({ pageSize: 50 });

  const [data, setData] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (filters.eventType) params.set('eventType', filters.eventType);
      if (filters.actor) params.set('actor', filters.actor);
      if (filters.entityType) params.set('entityType', filters.entityType);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      const res = await api.get<AuditLogResponse>(`/audit-events?${params.toString()}`);
      setData(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters.eventType, filters.actor, filters.entityType, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filterLabels: Record<string, string> = {
    eventType: 'Event Type',
    actor: 'Actor',
    entityType: 'Entity Type',
    dateFrom: 'From',
    dateTo: 'To',
  };

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <AppLayout title="Audit Log">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Audit Log</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Append-only record of all system events for compliance and governance.
          </p>
        </div>

        {/* Filters */}
        <FilterBar
          activeFilters={activeFilters.map((f) => ({
            key: f.key,
            label: filterLabels[f.key] ?? f.key,
            value: f.value,
          }))}
          onClearFilter={(key) => setFilter(key, undefined)}
          onClearAll={clearFilters}
        >
          <Select
            label="Event Type"
            options={EVENT_TYPE_OPTIONS}
            value={filters.eventType ?? ''}
            onValueChange={(v) => setFilter('eventType', v || undefined)}
            placeholder="All Events"
          />
          <Select
            label="Entity Type"
            options={ENTITY_TYPE_OPTIONS}
            value={filters.entityType ?? ''}
            onValueChange={(v) => setFilter('entityType', v || undefined)}
            placeholder="All Entities"
          />
          <Input
            label="Actor"
            value={filters.actor ?? ''}
            onChange={(e) => setFilter('actor', e.target.value || undefined)}
            placeholder="Username"
          />
          <Input
            label="From"
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => setFilter('dateFrom', e.target.value || undefined)}
          />
          <Input
            label="To"
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) => setFilter('dateTo', e.target.value || undefined)}
          />
        </FilterBar>

        {/* Error */}
        {error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="overflow-x-auto rounded-lg border border-border bg-card-bg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-text-secondary">Timestamp</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-text-secondary">Event</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-text-secondary">Actor</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-text-secondary">Entity</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-text-secondary">Message</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-3 py-3"><Skeleton variant="text" className="h-4 w-32" /></td>
                    <td className="px-3 py-3"><Skeleton variant="text" className="h-4 w-24" /></td>
                    <td className="px-3 py-3"><Skeleton variant="text" className="h-4 w-20" /></td>
                    <td className="px-3 py-3"><Skeleton variant="text" className="h-4 w-28" /></td>
                    <td className="px-3 py-3"><Skeleton variant="text" className="h-4 w-48" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && data.length === 0 && (
          <EmptyState
            icon={<span className="text-2xl">📜</span>}
            title="No audit log entries"
            description="Audit events will appear here as actions are performed in the system."
          />
        )}

        {/* Dense table */}
        {!loading && data.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border bg-card-bg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-text-secondary">
                    Timestamp
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-text-secondary">
                    Event Type
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-text-secondary">
                    Actor
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-text-secondary">
                    Entity Type
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-text-secondary">
                    Entity ID
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-text-secondary">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry) => (
                  <>
                    <tr
                      key={entry.id}
                      className="border-b border-border last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleExpand(entry.id)}
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-text-secondary">
                        {formatTimestamp(entry.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="custom"
                          value={entry.eventType.replace(/_/g, ' ')}
                          className="bg-gray-100 text-text-secondary text-[10px]"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-text-primary">
                        {entry.actor?.username ?? '--'}
                      </td>
                      <td className="px-3 py-2 text-xs text-text-secondary">
                        {entry.entityType}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-text-muted">
                        {shortId(entry.entityId)}
                      </td>
                      <td className="max-w-xs truncate px-3 py-2 text-xs text-text-primary" title={entry.message ?? undefined}>
                        {entry.message ?? '--'}
                      </td>
                    </tr>
                    {/* Expanded payload row */}
                    {expandedId === entry.id && entry.payload && (
                      <tr key={`${entry.id}-payload`} className="border-b border-border bg-gray-50">
                        <td colSpan={6} className="px-3 py-3">
                          <div className="text-xs font-medium text-text-muted mb-1">Payload</div>
                          <pre className="max-h-48 overflow-auto rounded bg-white p-3 text-xs text-text-secondary border border-border">
                            {JSON.stringify(entry.payload, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </AppLayout>
  );
}

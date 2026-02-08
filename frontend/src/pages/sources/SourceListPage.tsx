import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Pagination } from '../../components/ui/Pagination';
import { FilterBar } from '../../components/ui/FilterBar';
import { useAuth } from '../../hooks/useAuth';
import { useFilters } from '../../hooks/useFilters';
import { usePagination } from '../../hooks/usePagination';
import { api } from '../../lib/api-client';
import { CHANNEL_ICON } from '../../lib/design-tokens';

interface Source {
  id: string;
  displayName: string;
  channel: string;
  sourceType: string;
  countryCode: string;
  isEnabled: boolean;
  crawlFrequencyMinutes: number;
  createdAt: string;
  updatedAt: string;
}

interface SourceListResponse {
  data: Source[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const CHANNEL_OPTIONS = [
  { value: '', label: 'All Channels' },
  { value: 'WEB', label: 'Web' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'YOUTUBE', label: 'YouTube' },
];

const ENABLED_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Enabled' },
  { value: 'false', label: 'Disabled' },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function SourceListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { filters, setFilter, clearFilters, activeFilters } = useFilters();
  const { page, pageSize, setPage, setPageSize } = usePagination();

  const [data, setData] = useState<Source[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const fetchSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (filters.channel) params.set('channel', filters.channel);
      if (filters.enabled) params.set('isEnabled', filters.enabled);

      const res = await api.get<SourceListResponse>(`/sources?${params.toString()}`);
      setData(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters.channel, filters.enabled]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const filterLabels: Record<string, string> = {
    channel: 'Channel',
    enabled: 'Enabled',
  };

  return (
    <AppLayout title="Sources">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Sources</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Manage content sources for compliance monitoring.
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => navigate('/sources/new')}>
              New Source
            </Button>
          )}
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
            label="Channel"
            options={CHANNEL_OPTIONS}
            value={filters.channel ?? ''}
            onValueChange={(v) => setFilter('channel', v || undefined)}
            placeholder="All Channels"
          />
          <Select
            label="Enabled"
            options={ENABLED_OPTIONS}
            value={filters.enabled ?? ''}
            onValueChange={(v) => setFilter('enabled', v || undefined)}
            placeholder="All"
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
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="flex items-center gap-4">
                <Skeleton variant="rect" className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" className="h-4 w-48" />
                  <Skeleton variant="text" className="h-3 w-32" />
                </div>
                <Skeleton variant="text" className="h-4 w-24" />
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && data.length === 0 && (
          <EmptyState
            icon={<span className="text-2xl">📡</span>}
            title="No sources found"
            description="Create a new source to start monitoring content."
            action={
              isAdmin
                ? { label: 'New Source', onClick: () => navigate('/sources/new') }
                : undefined
            }
          />
        )}

        {/* Source cards */}
        {!loading && !error && data.length > 0 && (
          <div className="space-y-3">
            {data.map((source) => (
              <Card
                key={source.id}
                onClick={() => navigate(`/sources/${source.id}`)}
                className="flex items-center gap-4"
              >
                {/* Channel icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xl">
                  {CHANNEL_ICON[source.channel] ?? '📄'}
                </div>

                {/* Name & details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-text-primary">
                      {source.displayName}
                    </h3>
                    {source.isEnabled ? (
                      <span className="inline-flex h-2 w-2 rounded-full bg-green-500" title="Enabled" />
                    ) : (
                      <span className="inline-flex h-2 w-2 rounded-full bg-gray-300" title="Disabled" />
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                    <span>{source.channel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{source.countryCode}</span>
                    <span aria-hidden="true">·</span>
                    <span>{source.sourceType}</span>
                  </div>
                </div>

                {/* Crawl frequency */}
                <div className="hidden shrink-0 text-right text-xs text-text-secondary sm:block">
                  <div>
                    <span className="text-text-muted">Frequency:</span>{' '}
                    {source.crawlFrequencyMinutes} min
                  </div>
                  <div className="mt-0.5">
                    <span className="text-text-muted">Created:</span>{' '}
                    {formatDate(source.createdAt)}
                  </div>
                </div>
              </Card>
            ))}
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

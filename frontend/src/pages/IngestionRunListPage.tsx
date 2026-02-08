import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Badge } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';
import { api } from '../lib/api-client';
import { CHANNEL_ICON } from '../lib/design-tokens';

interface IngestionRun {
  id: string;
  sourceId: string;
  sourceName: string;
  channel: string;
  status: string;
  itemsFetched: number;
  itemsChanged: number;
  itemsFailed: number;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
}

interface IngestionRunListResponse {
  data: IngestionRun[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  RUNNING: 'bg-blue-100 text-blue-700',
  SUCCEEDED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-yellow-100 text-yellow-700',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '--';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function shortId(id: string): string {
  return id.substring(0, 8);
}

export function IngestionRunListPage() {
  const navigate = useNavigate();
  const { page, pageSize, sortBy, sortOrder, setPage, setPageSize, setSort } = usePagination({
    sortBy: 'startedAt',
    sortOrder: 'desc',
  });

  const [data, setData] = useState<IngestionRun[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (sortBy) params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await api.get<IngestionRunListResponse>(`/v1/ingestion-runs?${params.toString()}`);
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ingestion runs.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const columns: Column<IngestionRun>[] = [
    {
      key: 'id',
      label: 'Run ID',
      render: (row) => (
        <button
          type="button"
          className="font-mono text-sm font-medium text-primary hover:underline"
          onClick={() => navigate(`/ingestion-runs/${row.id}`)}
        >
          {shortId(row.id)}
        </button>
      ),
    },
    {
      key: 'sourceName',
      label: 'Source',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-text-primary">{row.sourceName}</span>
      ),
    },
    {
      key: 'channel',
      label: 'Channel',
      render: (row) => (
        <span className="flex items-center gap-1 text-sm">
          <span>{CHANNEL_ICON[row.channel] ?? ''}</span>
          {row.channel}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <Badge
          variant="custom"
          value={row.status}
          className={STATUS_STYLES[row.status] ?? 'bg-gray-100 text-gray-600'}
        />
      ),
    },
    {
      key: 'itemsFetched',
      label: 'Fetched',
      sortable: true,
      render: (row) => <span className="text-sm text-text-primary">{row.itemsFetched}</span>,
    },
    {
      key: 'itemsChanged',
      label: 'Changed',
      render: (row) => <span className="text-sm text-text-primary">{row.itemsChanged}</span>,
    },
    {
      key: 'itemsFailed',
      label: 'Failed',
      render: (row) => (
        <span className={`text-sm ${row.itemsFailed > 0 ? 'font-medium text-red-600' : 'text-text-primary'}`}>
          {row.itemsFailed}
        </span>
      ),
    },
    {
      key: 'durationMs',
      label: 'Duration',
      render: (row) => (
        <span className="text-sm text-text-secondary">{formatDuration(row.durationMs)}</span>
      ),
    },
    {
      key: 'startedAt',
      label: 'Started',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-text-secondary">{formatDate(row.startedAt)}</span>
      ),
    },
  ];

  return (
    <AppLayout title="Ingestion Runs">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Ingestion Runs</h1>
          <p className="mt-1 text-sm text-text-secondary">
            View all content ingestion pipeline executions.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && data.length === 0 && (
          <EmptyState
            icon={<span className="text-2xl">🔄</span>}
            title="No ingestion runs"
            description="Ingestion runs will appear here when sources are crawled."
          />
        )}

        {/* Table */}
        {(loading || data.length > 0) && (
          <DataTable
            columns={columns}
            data={data}
            isLoading={loading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={setSort}
            emptyMessage="No ingestion runs found."
            rowKey={(row) => row.id}
          />
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

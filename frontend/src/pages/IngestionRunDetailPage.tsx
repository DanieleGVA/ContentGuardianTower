import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Skeleton } from '../components/ui/Skeleton';
import { api } from '../lib/api-client';
import { CHANNEL_ICON } from '../lib/design-tokens';

interface PipelineStep {
  name: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

interface RunItem {
  id: string;
  contentKey: string;
  title: string | null;
  url: string | null;
  status: string;
  createdAt: string;
}

interface IngestionRunDetail {
  id: string;
  sourceId: string | null;
  channel: string;
  status: string;
  itemsFetched: number;
  itemsChanged: number;
  itemsFailed: number;
  startedAt: string;
  completedAt: string | null;
  steps: PipelineStep[];
  ingestionItems: RunItem[];
  createdAt: string;
  source: { id: string; displayName: string; channel: string; countryCode: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  RUNNING: 'bg-blue-100 text-blue-700',
  SUCCEEDED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-yellow-100 text-yellow-700',
  SKIPPED: 'bg-gray-100 text-gray-500',
};

const PIPELINE_STEPS_ORDER = [
  'RUN_START',
  'FETCH_ITEMS',
  'NORMALIZE_HASH',
  'STORE_REVISION',
  'DIFF',
  'ANALYZE_LLM',
  'UPSERT_TICKET',
  'RUN_FINISH',
];

const STEP_LABELS: Record<string, string> = {
  RUN_START: 'Run Start',
  FETCH_ITEMS: 'Fetch Items',
  NORMALIZE_HASH: 'Normalize & Hash',
  STORE_REVISION: 'Store Revision',
  DIFF: 'Diff Detection',
  ANALYZE_LLM: 'LLM Analysis',
  UPSERT_TICKET: 'Upsert Tickets',
  RUN_FINISH: 'Run Finish',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function shortId(id: string): string {
  return id.substring(0, 8);
}

export function IngestionRunDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [run, setRun] = useState<IngestionRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRun = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<IngestionRunDetail>(`/ingestion-runs/${id}`);
      setRun(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ingestion run.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  // Build ordered steps list from API data
  const stepsArray = Array.isArray(run?.steps) ? (run.steps as PipelineStep[]) : [];
  const orderedSteps = run
    ? PIPELINE_STEPS_ORDER.map((stepName) => {
        const existing = stepsArray.find((s) => s.name === stepName);
        return existing ?? { name: stepName, status: 'PENDING', startedAt: null, finishedAt: null, error: null };
      })
    : [];

  const itemColumns: Column<RunItem>[] = [
    {
      key: 'contentKey',
      label: 'Content Key',
      render: (row) => (
        <span className="font-mono text-xs text-text-secondary">{shortId(row.contentKey)}</span>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      render: (row) => (
        <span className="text-sm text-text-primary">{row.title ?? '--'}</span>
      ),
    },
    {
      key: 'url',
      label: 'URL',
      render: (row) =>
        row.url ? (
          <a
            href={row.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm text-primary hover:underline"
          >
            {row.url}
          </a>
        ) : (
          <span className="text-sm text-text-muted">--</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge
          variant="custom"
          value={row.status}
          className={STATUS_STYLES[row.status] ?? 'bg-gray-100 text-gray-600'}
        />
      ),
    },
  ];

  const breadcrumbs = (
    <Breadcrumb
      items={[
        { label: 'Ingestion Runs', href: '/ingestion-runs' },
        { label: id ? shortId(id) : 'Loading...' },
      ]}
    />
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Loading */}
        {loading && (
          <Card className="space-y-4">
            <Skeleton variant="text" className="h-6 w-64" />
            <Skeleton variant="text" className="h-4 w-48" />
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} variant="rect" className="h-10 w-full" />
              ))}
            </div>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Detail */}
        {!loading && run && (
          <>
            {/* Header card */}
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-text-primary">
                      Run {shortId(run.id)}
                    </h1>
                    <Badge
                      variant="custom"
                      value={run.status}
                      className={STATUS_STYLES[run.status] ?? 'bg-gray-100 text-gray-600'}
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                    <span>{CHANNEL_ICON[run.channel] ?? ''}</span>
                    <span>{run.source?.displayName ?? '--'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{run.channel}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Fetched</dt>
                  <dd className="mt-1 text-lg font-semibold text-text-primary">{run.itemsFetched}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Changed</dt>
                  <dd className="mt-1 text-lg font-semibold text-text-primary">{run.itemsChanged}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Failed</dt>
                  <dd className={`mt-1 text-lg font-semibold ${run.itemsFailed > 0 ? 'text-red-600' : 'text-text-primary'}`}>
                    {run.itemsFailed}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Started</dt>
                  <dd className="mt-1 text-sm text-text-primary">{formatDate(run.startedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Completed</dt>
                  <dd className="mt-1 text-sm text-text-primary">{formatDate(run.completedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Country</dt>
                  <dd className="mt-1 text-sm text-text-primary">{run.source?.countryCode ?? '--'}</dd>
                </div>
              </div>
            </Card>

            {/* Pipeline timeline */}
            <Card>
              <h2 className="text-lg font-semibold text-text-primary">Pipeline Steps</h2>
              <div className="mt-4 space-y-0">
                {orderedSteps.map((step, index) => {
                  const isLast = index === orderedSteps.length - 1;
                  const statusColor =
                    step.status === 'SUCCEEDED'
                      ? 'bg-green-500'
                      : step.status === 'RUNNING'
                        ? 'bg-blue-500 animate-pulse'
                        : step.status === 'FAILED'
                          ? 'bg-red-500'
                          : step.status === 'SKIPPED'
                            ? 'bg-gray-300'
                            : 'bg-gray-200';

                  return (
                    <div key={step.name} className="flex gap-4">
                      {/* Timeline line + dot */}
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${statusColor} shrink-0 mt-1.5`} />
                        {!isLast && (
                          <div className="w-0.5 flex-1 bg-gray-200" />
                        )}
                      </div>

                      {/* Step content */}
                      <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-text-primary">
                            {STEP_LABELS[step.name] ?? step.name}
                          </span>
                          <Badge
                            variant="custom"
                            value={step.status}
                            className={STATUS_STYLES[step.status] ?? 'bg-gray-100 text-gray-600'}
                          />
                        </div>
                        {(step.startedAt || step.finishedAt) && (
                          <div className="mt-1 text-xs text-text-secondary">
                            {step.startedAt && <span>Started: {formatDate(step.startedAt)}</span>}
                            {step.startedAt && step.finishedAt && <span className="mx-1">|</span>}
                            {step.finishedAt && <span>Finished: {formatDate(step.finishedAt)}</span>}
                          </div>
                        )}
                        {step.error && (
                          <div className="mt-1 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
                            {step.error}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Items table */}
            {run.ingestionItems && run.ingestionItems.length > 0 && (
              <Card>
                <h2 className="mb-4 text-lg font-semibold text-text-primary">
                  Items ({run.ingestionItems.length})
                </h2>
                <DataTable
                  columns={itemColumns}
                  data={run.ingestionItems}
                  emptyMessage="No items in this run."
                  rowKey={(row) => row.id}
                />
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

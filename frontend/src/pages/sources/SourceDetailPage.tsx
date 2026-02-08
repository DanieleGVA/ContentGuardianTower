import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api-client';
import { CHANNEL_ICON } from '../../lib/design-tokens';

interface Source {
  id: string;
  displayName: string;
  platform: string;
  channel: string;
  countryCode: string;
  sourceType: string;
  identifier: string;
  isEnabled: boolean;
  crawlFrequencyMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function SourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [source, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const fetchSource = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Source>(`/v1/sources/${id}`);
      setSource(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load source.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSource();
  }, [fetchSource]);

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await api.delete(`/v1/sources/${id}`);
      navigate('/sources', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete source.');
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleTriggerRun() {
    if (!id) return;
    setTriggerLoading(true);
    try {
      await api.post('/v1/ingestion-runs', { sourceId: id });
      fetchSource();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger run.');
    } finally {
      setTriggerLoading(false);
    }
  }

  const breadcrumbs = (
    <Breadcrumb
      items={[
        { label: 'Sources', href: '/sources' },
        { label: source?.displayName ?? 'Loading...' },
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
            <div className="flex gap-4">
              <Skeleton variant="rect" className="h-10 w-24" />
              <Skeleton variant="rect" className="h-10 w-24" />
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

        {/* Source detail */}
        {!loading && source && (
          <>
            {/* Header card */}
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                    {CHANNEL_ICON[source.platform] ?? '📄'}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-xl font-bold text-text-primary">
                        {source.displayName}
                      </h1>
                      {source.isEnabled ? (
                        <Badge variant="custom" value="Enabled" className="bg-green-100 text-green-700" />
                      ) : (
                        <Badge variant="custom" value="Disabled" className="bg-gray-100 text-gray-500" />
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                      <span>{source.platform}</span>
                      <span aria-hidden="true">·</span>
                      <span>{source.channel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{source.countryCode}</span>
                      <span aria-hidden="true">·</span>
                      <span>{source.sourceType}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleTriggerRun}
                    loading={triggerLoading}
                  >
                    Trigger Run
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/sources/${id}/edit`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteOpen(true)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Run dates */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Last Run</dt>
                  <dd className="mt-1 text-sm text-text-primary">{formatDate(source.lastRunAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Next Run</dt>
                  <dd className="mt-1 text-sm text-text-primary">{formatDate(source.nextRunAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Crawl Frequency</dt>
                  <dd className="mt-1 text-sm text-text-primary">{source.crawlFrequencyMinutes} min</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Identifier</dt>
                  <dd className="mt-1 truncate text-sm text-text-primary" title={source.identifier}>
                    {source.identifier}
                  </dd>
                </div>
              </div>
            </Card>

            {/* Config details */}
            <Card>
              <h2 className="text-lg font-semibold text-text-primary">Configuration</h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Source Type</dt>
                  <dd className="mt-1 text-sm text-text-primary">{source.sourceType}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Created At</dt>
                  <dd className="mt-1 text-sm text-text-primary">{formatDate(source.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Updated At</dt>
                  <dd className="mt-1 text-sm text-text-primary">{formatDate(source.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Platform</dt>
                  <dd className="mt-1 text-sm text-text-primary">{source.platform}</dd>
                </div>
              </dl>

              {/* Raw config JSON */}
              {source.config && Object.keys(source.config).length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-text-primary">Raw Config</h3>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-50 p-4 text-xs text-text-secondary">
                    {JSON.stringify(source.config, null, 2)}
                  </pre>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Delete confirmation modal */}
        <Modal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete Source"
          description="Are you sure you want to delete this source? This action cannot be undone."
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-text-secondary">
            Deleting <strong>{source?.displayName}</strong> will remove all associated data
            including ingestion runs and content items.
          </p>
        </Modal>
      </div>
    </AppLayout>
  );
}

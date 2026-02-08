import { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api-client';

interface ExportRecord {
  id: string;
  exportType: string;
  status: string;
  rowCount: number | null;
  storageKey: string | null;
  createdAt: string;
  completedAt: string | null;
  lastError: string | null;
}

interface ExportHistoryResponse {
  data: ExportRecord[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const STATUS_STYLES: Record<string, string> = {
  QUEUED: 'bg-gray-100 text-gray-600',
  RUNNING: 'bg-blue-100 text-blue-700',
  SUCCEEDED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function ExportsPage() {
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingTickets, setExportingTickets] = useState(false);
  const [exportingAudit, setExportingAudit] = useState(false);
  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ExportHistoryResponse>('/exports');
      setHistory(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load export history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function handleExport(exportType: 'TICKETS_CSV' | 'AUDIT_CSV') {
    const setExporting = exportType === 'TICKETS_CSV' ? setExportingTickets : setExportingAudit;
    setExporting(true);
    setError(null);

    try {
      await api.post('/exports', { exportType });
      toast({ title: 'Export queued', variant: 'success' });
      fetchHistory();
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to start export.`;
      toast({ title: 'Export failed', description: msg, variant: 'error' });
      setError(msg);
    } finally {
      setExporting(false);
    }
  }

  const columns: Column<ExportRecord>[] = [
    {
      key: 'exportType',
      label: 'Export Type',
      render: (row) => (
        <Badge
          variant="custom"
          value={row.exportType === 'TICKETS_CSV' ? 'Tickets' : row.exportType === 'AUDIT_CSV' ? 'Audit Log' : row.exportType}
          className={row.exportType === 'TICKETS_CSV' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}
        />
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
    {
      key: 'rowCount',
      label: 'Rows',
      render: (row) => (
        <span className="text-sm text-text-primary">
          {row.rowCount !== null ? row.rowCount.toLocaleString() : '--'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row) => (
        <span className="text-sm text-text-secondary">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'completedAt',
      label: 'Completed',
      render: (row) => (
        <span className="text-sm text-text-secondary">{formatDate(row.completedAt)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) =>
        row.status === 'SUCCEEDED' && row.storageKey ? (
          <a
            href={`/api/exports/${row.id}/download`}
            className="text-sm font-medium text-primary hover:underline"
            download
          >
            Download
          </a>
        ) : row.lastError ? (
          <span className="text-xs text-red-600" title={row.lastError}>
            Error
          </span>
        ) : null,
    },
  ];

  return (
    <AppLayout title="Exports">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Exports</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Generate CSV exports of tickets and audit logs.
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

        {/* Export trigger cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Ticket Export</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Export all tickets with their current status, risk level, assignments, and resolution details as a CSV file.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Button
                onClick={() => handleExport('TICKETS_CSV')}
                loading={exportingTickets}
                size="sm"
              >
                Export Tickets
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Audit Export</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Export the complete audit log with timestamps, actors, events, and payloads as a CSV file.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Button
                onClick={() => handleExport('AUDIT_CSV')}
                loading={exportingAudit}
                size="sm"
              >
                Export Audit Log
              </Button>
            </div>
          </Card>
        </div>

        {/* Export history */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Export History</h2>

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rect" className="h-12 w-full" />
              ))}
            </div>
          )}

          {!loading && history.length === 0 && (
            <EmptyState
              icon={<span className="text-2xl">📥</span>}
              title="No exports yet"
              description="Click one of the export buttons above to generate your first CSV export."
            />
          )}

          {!loading && history.length > 0 && (
            <DataTable
              columns={columns}
              data={history}
              emptyMessage="No export records found."
              rowKey={(row) => row.id}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

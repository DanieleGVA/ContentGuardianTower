import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Clock } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FilterBar } from '../../components/ui/FilterBar';
import { Pagination } from '../../components/ui/Pagination';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { api } from '../../lib/api-client';
import { useFilters } from '../../hooks/useFilters';
import { usePagination } from '../../hooks/usePagination';
import { CHANNEL_ICON } from '../../lib/design-tokens';
import { cn } from '../../lib/cn';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TicketListItem {
  id: string;
  ticketKey: string;
  title: string;
  status: string;
  riskLevel: string;
  escalationLevel: string;
  channel: string;
  countryCode: string;
  dueAt: string | null;
  isOverdue: boolean;
  createdAt: string;
  source?: { id: string; displayName: string; channel: string };
  assignee?: { id: string; username: string; fullName: string } | null;
}

interface TicketListResponse {
  data: TicketListItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Filter config                                                      */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const RISK_OPTIONS = [
  { value: '', label: 'All Risks' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const CHANNEL_OPTIONS = [
  { value: '', label: 'All Channels' },
  { value: 'WEB', label: 'Web' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'YOUTUBE', label: 'YouTube' },
];

const OVERDUE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Overdue Only' },
  { value: 'false', label: 'Not Overdue' },
];

const FILTER_LABELS: Record<string, string> = {
  status: 'Status',
  riskLevel: 'Risk',
  search: 'Search',
  channel: 'Channel',
  country: 'Country',
  source: 'Source',
  assignee: 'Assignee',
  overdue: 'Overdue',
  dateFrom: 'From',
  dateTo: 'To',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TicketListPage() {
  const navigate = useNavigate();
  const { filters, setFilter, clearFilters, activeFilters } = useFilters();
  const { page, pageSize, setPage, setPageSize } = usePagination({ pageSize: 20 });

  const [data, setData] = useState<TicketListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      if (filters.status) params.set('status', filters.status);
      if (filters.riskLevel) params.set('riskLevel', filters.riskLevel);
      if (filters.search) params.set('search', filters.search);
      if (filters.channel) params.set('channel', filters.channel);
      if (filters.country) params.set('country', filters.country);
      if (filters.source) params.set('source', filters.source);
      if (filters.assignee) params.set('assignee', filters.assignee);
      if (filters.overdue) params.set('overdue', filters.overdue);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      const result = await api.get<TicketListResponse>(`/tickets?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  function handleSearchSubmit() {
    setFilter('search', searchInput.trim() || undefined);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  }

  function formatDue(dueAt: string | null, isOverdue: boolean): string {
    if (!dueAt) return '--';
    const due = new Date(dueAt);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffH = Math.round(diffMs / (1000 * 60 * 60));

    if (isOverdue) return `${Math.abs(diffH)}h overdue`;
    if (diffH < 1) return 'Due soon';
    if (diffH < 24) return `${diffH}h left`;
    return `${Math.round(diffH / 24)}d left`;
  }

  const displayActiveFilters = activeFilters.map((f) => ({
    key: f.key,
    label: FILTER_LABELS[f.key] ?? f.key,
    value: f.value,
  }));

  return (
    <AppLayout title="Tickets">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Tickets</h1>
          {data && (
            <p className="mt-0.5 text-sm text-text-secondary">
              {data.meta.total} ticket{data.meta.total !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/exports')}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <FilterBar
        activeFilters={displayActiveFilters}
        onClearFilter={(key) => setFilter(key, undefined)}
        onClearAll={clearFilters}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced((prev) => !prev)}
        advancedContent={
          <>
            <Select
              label="Channel"
              options={CHANNEL_OPTIONS}
              value={filters.channel ?? ''}
              onValueChange={(v) => setFilter('channel', v || undefined)}
              placeholder="All Channels"
            />
            <div className="flex flex-col gap-1.5">
              <Input
                label="Country"
                placeholder="e.g. IT, DE, US"
                value={filters.country ?? ''}
                onChange={(e) => setFilter('country', e.target.value || undefined)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Input
                label="Source"
                placeholder="Source name"
                value={filters.source ?? ''}
                onChange={(e) => setFilter('source', e.target.value || undefined)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Input
                label="Assignee"
                placeholder="Assignee name"
                value={filters.assignee ?? ''}
                onChange={(e) => setFilter('assignee', e.target.value || undefined)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Input
                label="Date From"
                type="date"
                value={filters.dateFrom ?? ''}
                onChange={(e) => setFilter('dateFrom', e.target.value || undefined)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Input
                label="Date To"
                type="date"
                value={filters.dateTo ?? ''}
                onChange={(e) => setFilter('dateTo', e.target.value || undefined)}
              />
            </div>
            <Select
              label="Overdue"
              options={OVERDUE_OPTIONS}
              value={filters.overdue ?? ''}
              onValueChange={(v) => setFilter('overdue', v || undefined)}
              placeholder="All"
            />
          </>
        }
        className="mb-6"
      >
        {/* Status buttons */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-primary">Status</span>
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter('status', opt.value || undefined)}
                className={cn(
                  'min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  (filters.status ?? '') === opt.value
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-white text-text-secondary hover:bg-gray-50 hover:text-text-primary',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Risk buttons */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-primary">Risk</span>
          <div className="flex gap-1">
            {RISK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter('riskLevel', opt.value || undefined)}
                className={cn(
                  'min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  (filters.riskLevel ?? '') === opt.value
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-white text-text-secondary hover:bg-gray-50 hover:text-text-primary',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-primary">Search</span>
          <div className="flex gap-1">
            <Input
              placeholder="Search tickets..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="min-w-[200px]"
            />
            <Button variant="secondary" size="sm" onClick={handleSearchSubmit}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </FilterBar>

      {/* Error */}
      {error && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Ticket Cards */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card-bg p-5"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20" variant="text" />
                  <Skeleton className="h-5 w-3/4" variant="text" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" variant="rect" />
                    <Skeleton className="h-5 w-16" variant="rect" />
                    <Skeleton className="h-4 w-8" variant="text" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20" variant="text" />
              </div>
            </div>
          ))
        ) : !data?.data.length ? (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title="No tickets found"
            description="Try adjusting your filters or search query."
            action={
              activeFilters.length > 0
                ? { label: 'Clear filters', onClick: clearFilters }
                : undefined
            }
          />
        ) : (
          data.data.map((ticket) => (
            <Card
              key={ticket.id}
              onClick={() => navigate(`/tickets/${ticket.id}`)}
              className="p-5"
            >
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  {/* First row: ID + Title */}
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 text-xs font-mono font-medium text-text-secondary">
                      {ticket.ticketKey}
                    </span>
                    <h3 className="truncate text-sm font-semibold text-text-primary">
                      {ticket.title}
                    </h3>
                  </div>

                  {/* Second row: Badges + meta */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="status" value={ticket.status} />
                    <Badge variant="risk" value={ticket.riskLevel} />
                    {ticket.escalationLevel !== 'LOCAL' && (
                      <Badge variant="escalation" value={ticket.escalationLevel} />
                    )}
                    <span className="text-base" title={ticket.channel}>
                      {CHANNEL_ICON[ticket.channel] ?? ticket.channel}
                    </span>
                    <span className="text-xs text-text-secondary">{ticket.countryCode}</span>
                    {ticket.source && (
                      <>
                        <span className="text-xs text-text-muted">|</span>
                        <span className="text-xs text-text-secondary">{ticket.source.displayName}</span>
                      </>
                    )}
                    {ticket.assignee && (
                      <>
                        <span className="text-xs text-text-muted">|</span>
                        <span className="text-xs text-text-secondary">{ticket.assignee.fullName}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Due date / overdue indicator */}
                <div className="shrink-0 text-right">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-xs font-medium',
                      ticket.isOverdue ? 'text-red-600' : 'text-text-secondary',
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {formatDue(ticket.dueAt, ticket.isOverdue)}
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.meta.totalPages > 0 && (
        <Pagination
          page={data.meta.page}
          pageSize={data.meta.pageSize}
          total={data.meta.total}
          totalPages={data.meta.totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          className="mt-6"
        />
      )}
    </AppLayout>
  );
}

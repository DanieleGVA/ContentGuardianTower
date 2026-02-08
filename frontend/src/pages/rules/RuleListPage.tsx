import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
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

interface Rule {
  id: string;
  name: string;
  type: string;
  severity: string;
  isActive: boolean;
  applicableChannels: string[];
  applicableCountries: string[];
  createdAt: string;
  activeVersion?: { id: string; version: number; payload: unknown } | null;
  createdBy?: { id: string; username: string; fullName: string };
}

interface RuleListResponse {
  data: Rule[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const ACTIVE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'CONTENT', label: 'Content' },
  { value: 'DISCLOSURE', label: 'Disclosure' },
  { value: 'PRICING', label: 'Pricing' },
  { value: 'CLAIMS', label: 'Claims' },
  { value: 'CUSTOM', label: 'Custom' },
];

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-blue-100 text-blue-700',
};

const TYPE_STYLES: Record<string, string> = {
  CONTENT: 'bg-purple-100 text-purple-700',
  DISCLOSURE: 'bg-indigo-100 text-indigo-700',
  PRICING: 'bg-green-100 text-green-700',
  CLAIMS: 'bg-orange-100 text-orange-700',
  CUSTOM: 'bg-gray-100 text-gray-600',
};

export function RuleListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { filters, setFilter, clearFilters, activeFilters } = useFilters();
  const { page, pageSize, setPage, setPageSize } = usePagination();

  const [data, setData] = useState<Rule[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.active) params.set('active', filters.active);
      if (filters.type) params.set('type', filters.type);

      const res = await api.get<RuleListResponse>(`/rules?${params.toString()}`);
      setData(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters.severity, filters.active, filters.type]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const filterLabels: Record<string, string> = {
    severity: 'Severity',
    active: 'Active',
    type: 'Type',
  };

  return (
    <AppLayout title="Rules">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Rules</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Manage compliance rules for content analysis.
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => navigate('/rules/new')}>
              New Rule
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
            label="Type"
            options={TYPE_OPTIONS}
            value={filters.type ?? ''}
            onValueChange={(v) => setFilter('type', v || undefined)}
            placeholder="All Types"
          />
          <Select
            label="Severity"
            options={SEVERITY_OPTIONS}
            value={filters.severity ?? ''}
            onValueChange={(v) => setFilter('severity', v || undefined)}
            placeholder="All Severities"
          />
          <Select
            label="Active"
            options={ACTIVE_OPTIONS}
            value={filters.active ?? ''}
            onValueChange={(v) => setFilter('active', v || undefined)}
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
              <Card key={i} className="space-y-3">
                <Skeleton variant="text" className="h-5 w-48" />
                <div className="flex gap-2">
                  <Skeleton variant="text" className="h-5 w-16" />
                  <Skeleton variant="text" className="h-5 w-16" />
                </div>
                <Skeleton variant="text" className="h-3 w-64" />
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && data.length === 0 && (
          <EmptyState
            icon={<span className="text-2xl">📋</span>}
            title="No rules found"
            description="Create compliance rules to analyze content."
            action={
              isAdmin
                ? { label: 'New Rule', onClick: () => navigate('/rules/new') }
                : undefined
            }
          />
        )}

        {/* Rule cards */}
        {!loading && !error && data.length > 0 && (
          <div className="space-y-3">
            {data.map((rule) => (
              <Card
                key={rule.id}
                onClick={() => navigate(`/rules/${rule.id}`)}
                className="space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {rule.name}
                    </h3>
                    {rule.isActive ? (
                      <span className="inline-flex h-2 w-2 rounded-full bg-green-500" title="Active" />
                    ) : (
                      <span className="inline-flex h-2 w-2 rounded-full bg-gray-300" title="Inactive" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="custom"
                      value={rule.type}
                      className={TYPE_STYLES[rule.type] ?? 'bg-gray-100 text-gray-600'}
                    />
                    <Badge
                      variant="custom"
                      value={rule.severity}
                      className={SEVERITY_STYLES[rule.severity] ?? 'bg-gray-100 text-gray-600'}
                    />
                  </div>
                </div>

                {/* Channels & countries */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                  {rule.applicableChannels.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-text-muted">Channels:</span>
                      {rule.applicableChannels.map((ch) => (
                        <span key={ch} title={ch}>
                          {CHANNEL_ICON[ch] ?? ch}
                        </span>
                      ))}
                    </div>
                  )}
                  {rule.applicableCountries.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-text-muted">Countries:</span>
                      <span>{rule.applicableCountries.join(', ')}</span>
                    </div>
                  )}
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

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api-client';
import { CHANNEL_ICON } from '../../lib/design-tokens';

interface RuleVersion {
  id: string;
  versionNumber: number;
  isActive: boolean;
  payload: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
}

interface Rule {
  id: string;
  name: string;
  type: string;
  severity: string;
  isActive: boolean;
  applicableChannels: string[];
  applicableCountries: string[];
  versions: RuleVersion[];
  createdAt: string;
  updatedAt: string;
}

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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function RuleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rule, setRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const fetchRule = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Rule>(`/v1/rules/${id}`);
      setRule(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rule.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRule();
  }, [fetchRule]);

  async function handleToggleActive() {
    if (!id || !rule) return;
    setToggling(true);
    try {
      await api.put(`/v1/rules/${id}`, { isActive: !rule.isActive });
      fetchRule();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule.');
    } finally {
      setToggling(false);
    }
  }

  const breadcrumbs = (
    <Breadcrumb
      items={[
        { label: 'Rules', href: '/rules' },
        { label: rule?.name ?? 'Loading...' },
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
            <div className="flex gap-2">
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

        {/* Rule detail */}
        {!loading && rule && (
          <>
            {/* Header card */}
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-text-primary">{rule.name}</h1>
                    {rule.isActive ? (
                      <Badge variant="custom" value="Active" className="bg-green-100 text-green-700" />
                    ) : (
                      <Badge variant="custom" value="Inactive" className="bg-gray-100 text-gray-500" />
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
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

                {/* Actions */}
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleToggleActive}
                      loading={toggling}
                    >
                      {rule.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/rules/${id}/edit`)}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              {/* Channels & countries */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Channels</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {rule.applicableChannels.length > 0 ? (
                      rule.applicableChannels.map((ch) => (
                        <Badge
                          key={ch}
                          variant="custom"
                          value={ch}
                          className="bg-gray-100 text-text-secondary"
                          icon={CHANNEL_ICON[ch] ? <span>{CHANNEL_ICON[ch]}</span> : undefined}
                        />
                      ))
                    ) : (
                      <span className="text-sm text-text-secondary">All channels</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Countries</dt>
                  <dd className="mt-1 text-sm text-text-primary">
                    {rule.applicableCountries.length > 0
                      ? rule.applicableCountries.join(', ')
                      : 'All countries'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Created</dt>
                  <dd className="mt-1 text-sm text-text-primary">{formatDate(rule.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-text-muted">Last Updated</dt>
                  <dd className="mt-1 text-sm text-text-primary">{formatDate(rule.updatedAt)}</dd>
                </div>
              </div>
            </Card>

            {/* Versions */}
            <Card>
              <h2 className="text-lg font-semibold text-text-primary">Versions</h2>
              {rule.versions && rule.versions.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-secondary">
                          Version
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-secondary">
                          Created
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-secondary">
                          Created By
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-secondary">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rule.versions.map((version) => (
                        <tr
                          key={version.id}
                          className="border-b border-border last:border-b-0 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-text-primary">
                            v{version.versionNumber}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {formatDate(version.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {version.createdBy}
                          </td>
                          <td className="px-4 py-3">
                            {version.isActive ? (
                              <Badge variant="custom" value="Active" className="bg-green-100 text-green-700" />
                            ) : (
                              <Badge variant="custom" value="Inactive" className="bg-gray-100 text-gray-500" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-text-secondary">No versions available.</p>
              )}
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

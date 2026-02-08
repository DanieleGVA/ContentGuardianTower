import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { useAuth } from '../../hooks/useAuth';
import { usePagination } from '../../hooks/usePagination';
import { api } from '../../lib/api-client';
import { ROLE_LABELS } from '../../lib/design-tokens';

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  countryScopeType: string;
  countryCodes: string[];
  isEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  GLOBAL_MANAGER: 'bg-blue-100 text-blue-700',
  REGIONAL_MANAGER: 'bg-teal-100 text-teal-700',
  LOCAL_MANAGER: 'bg-green-100 text-green-700',
  VIEWER: 'bg-gray-100 text-gray-600',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function UserListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { page, pageSize, sortBy, sortOrder, setPage, setPageSize, setSort } = usePagination({
    sortBy: 'username',
    sortOrder: 'asc',
  });

  const [data, setData] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (sortBy) params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await api.get<UserListResponse>(`/v1/users?${params.toString()}`);
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const columns: Column<User>[] = [
    {
      key: 'username',
      label: 'Username',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-text-primary">{row.username}</span>
      ),
    },
    {
      key: 'fullName',
      label: 'Full Name',
      sortable: true,
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (row) => (
        <Badge
          variant="custom"
          value={ROLE_LABELS[row.role] ?? row.role}
          className={ROLE_STYLES[row.role] ?? 'bg-gray-100 text-gray-600'}
        />
      ),
    },
    {
      key: 'countryScopeType',
      label: 'Country Scope',
      render: (row) => (
        <div className="text-sm text-text-secondary">
          <span>{row.countryScopeType}</span>
          {row.countryCodes.length > 0 && (
            <span className="ml-1 text-text-muted">
              ({row.countryCodes.join(', ')})
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'isEnabled',
      label: 'Enabled',
      render: (row) =>
        row.isEnabled ? (
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500" title="Enabled" />
        ) : (
          <span className="inline-flex h-2 w-2 rounded-full bg-gray-300" title="Disabled" />
        ),
    },
    {
      key: 'lastLoginAt',
      label: 'Last Login',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-text-secondary">{formatDate(row.lastLoginAt)}</span>
      ),
    },
  ];

  return (
    <AppLayout title="Users">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Users</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Manage user accounts and role assignments.
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => navigate('/users/new')}>
              New User
            </Button>
          )}
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
            icon={<span className="text-2xl">👤</span>}
            title="No users found"
            description="Create a user account to get started."
            action={
              isAdmin
                ? { label: 'New User', onClick: () => navigate('/users/new') }
                : undefined
            }
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
            emptyMessage="No users found."
            rowKey={(row) => row.id}
          />
        )}

        {/* Make rows clickable via wrapper */}
        {!loading && data.length > 0 && (
          <div className="sr-only">
            {data.map((u) => (
              <a key={u.id} href={`/users/${u.id}/edit`} tabIndex={-1}>
                Edit {u.username}
              </a>
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

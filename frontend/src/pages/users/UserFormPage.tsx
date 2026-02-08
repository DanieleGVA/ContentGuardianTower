import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { api, ApiClientError } from '../../lib/api-client';

interface UserFormData {
  username: string;
  email: string;
  fullName: string;
  password: string;
  role: string;
  countryScopeType: string;
  countryCodes: string;
  isEnabled: boolean;
}

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'GLOBAL_MANAGER', label: 'Global Manager' },
  { value: 'REGIONAL_MANAGER', label: 'Regional Manager' },
  { value: 'LOCAL_MANAGER', label: 'Local Manager' },
  { value: 'VIEWER', label: 'Viewer' },
];

const COUNTRY_SCOPE_OPTIONS = [
  { value: 'ALL', label: 'All Countries' },
  { value: 'SPECIFIC', label: 'Specific Countries' },
];

const INITIAL_FORM: UserFormData = {
  username: '',
  email: '',
  fullName: '',
  password: '',
  role: '',
  countryScopeType: 'ALL',
  countryCodes: '',
  isEnabled: true,
};

export function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<UserFormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchUser = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<Record<string, unknown>>(`/users/${id}`);
      setForm({
        username: String(res.username ?? ''),
        email: String(res.email ?? ''),
        fullName: String(res.fullName ?? ''),
        password: '',
        role: String(res.role ?? ''),
        countryScopeType: String(res.countryScopeType ?? 'ALL'),
        countryCodes: Array.isArray(res.countryCodes)
          ? (res.countryCodes as string[]).join(', ')
          : '',
        isEnabled: Boolean(res.isEnabled),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) fetchUser();
  }, [isEdit, fetchUser]);

  function updateField<K extends keyof UserFormData>(key: K, value: UserFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!isEdit && !form.username.trim()) errors.username = 'Username is required.';
    if (!form.email.trim()) errors.email = 'Email is required.';
    if (!form.fullName.trim()) errors.fullName = 'Full name is required.';
    if (!isEdit && !form.password.trim()) errors.password = 'Password is required.';
    if (!isEdit && form.password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!form.role) errors.role = 'Role is required.';
    if (form.countryScopeType === 'SPECIFIC' && !form.countryCodes.trim()) {
      errors.countryCodes = 'At least one country code is required for specific scope.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      email: form.email.trim(),
      fullName: form.fullName.trim(),
      role: form.role,
      countryScopeType: form.countryScopeType,
      countryCodes:
        form.countryScopeType === 'SPECIFIC'
          ? form.countryCodes
              .split(',')
              .map((c) => c.trim().toUpperCase())
              .filter(Boolean)
          : [],
      isEnabled: form.isEnabled,
    };

    if (!isEdit) {
      payload.username = form.username.trim();
      payload.password = form.password;
    }

    try {
      if (isEdit) {
        await api.put(`/users/${id}`, payload);
        toast({ title: 'User updated', variant: 'success' });
        navigate('/users');
      } else {
        await api.post('/users', payload);
        toast({ title: 'User created', variant: 'success' });
        navigate('/users');
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.body?.message ?? 'Failed to save user.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save user.');
      }
      toast({ title: 'Failed to save user', variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const breadcrumbs = (
    <Breadcrumb
      items={[
        { label: 'Users', href: '/users' },
        { label: isEdit ? 'Edit User' : 'New User' },
      ]}
    />
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs} title={isEdit ? 'Edit User' : 'New User'}>
      <div className="mx-auto max-w-2xl space-y-6">
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
          <Card className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="text" className="h-11 w-full" />
            ))}
          </Card>
        )}

        {/* Form */}
        {!loading && (
          <form onSubmit={handleSubmit} noValidate>
            <Card className="space-y-5">
              {/* Username (create only) */}
              <Input
                label="Username"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                error={fieldErrors.username}
                placeholder="e.g., john.doe"
                disabled={isEdit}
                required={!isEdit}
                helpText={isEdit ? 'Username cannot be changed after creation.' : undefined}
              />

              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                error={fieldErrors.email}
                placeholder="e.g., john.doe@company.com"
                required
              />

              <Input
                label="Full Name"
                value={form.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                error={fieldErrors.fullName}
                placeholder="e.g., John Doe"
                required
              />

              {/* Password (create only) */}
              {!isEdit && (
                <Input
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  error={fieldErrors.password}
                  placeholder="Minimum 8 characters"
                  required
                  autoComplete="new-password"
                />
              )}

              <Select
                label="Role"
                options={ROLE_OPTIONS}
                value={form.role}
                onValueChange={(v) => updateField('role', v)}
                error={fieldErrors.role}
                placeholder="Select role"
              />

              <Select
                label="Country Scope"
                options={COUNTRY_SCOPE_OPTIONS}
                value={form.countryScopeType}
                onValueChange={(v) => updateField('countryScopeType', v)}
              />

              {form.countryScopeType === 'SPECIFIC' && (
                <Input
                  label="Country Codes"
                  value={form.countryCodes}
                  onChange={(e) => updateField('countryCodes', e.target.value)}
                  error={fieldErrors.countryCodes}
                  placeholder="e.g., IT, DE, FR"
                  helpText="Comma-separated ISO country codes."
                  required
                />
              )}

              {/* Enabled toggle */}
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.isEnabled}
                  onChange={(e) => updateField('isEnabled', e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-text-primary">Account enabled</span>
              </label>
            </Card>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="secondary" type="button" onClick={() => navigate('/users')}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {isEdit ? 'Save Changes' : 'Create User'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}

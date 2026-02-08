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

interface RuleFormData {
  name: string;
  type: string;
  severity: string;
  applicableChannels: string[];
  applicableCountries: string;
  payload: string;
}

const TYPE_OPTIONS = [
  { value: 'CONTENT', label: 'Content' },
  { value: 'DISCLOSURE', label: 'Disclosure' },
  { value: 'PRICING', label: 'Pricing' },
  { value: 'CLAIMS', label: 'Claims' },
  { value: 'CUSTOM', label: 'Custom' },
];

const SEVERITY_OPTIONS = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const ALL_CHANNELS = ['WEB', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE'];

const INITIAL_FORM: RuleFormData = {
  name: '',
  type: '',
  severity: '',
  applicableChannels: [],
  applicableCountries: '',
  payload: '{}',
};

export function RuleFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<RuleFormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchRule = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<Record<string, unknown>>(`/rules/${id}`);
      setForm({
        name: String(res.name ?? ''),
        type: String(res.type ?? ''),
        severity: String(res.severity ?? ''),
        applicableChannels: Array.isArray(res.applicableChannels)
          ? (res.applicableChannels as string[])
          : [],
        applicableCountries: Array.isArray(res.applicableCountries)
          ? (res.applicableCountries as string[]).join(', ')
          : '',
        payload: res.payload ? JSON.stringify(res.payload, null, 2) : '{}',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rule.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) fetchRule();
  }, [isEdit, fetchRule]);

  function updateField<K extends keyof RuleFormData>(key: K, value: RuleFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleChannelToggle(channel: string) {
    setForm((prev) => {
      const channels = prev.applicableChannels.includes(channel)
        ? prev.applicableChannels.filter((c) => c !== channel)
        : [...prev.applicableChannels, channel];
      return { ...prev, applicableChannels: channels };
    });
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Name is required.';
    if (!form.type) errors.type = 'Type is required.';
    if (!form.severity) errors.severity = 'Severity is required.';
    if (form.applicableChannels.length === 0) errors.applicableChannels = 'Select at least one channel.';
    if (!form.applicableCountries.trim()) errors.applicableCountries = 'Enter at least one country code.';
    if (form.payload.trim()) {
      try {
        JSON.parse(form.payload);
      } catch {
        errors.payload = 'Payload must be valid JSON.';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      type: form.type,
      severity: form.severity,
      applicableChannels: form.applicableChannels,
      applicableCountries: form.applicableCountries
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
      payload: JSON.parse(form.payload),
    };

    try {
      if (isEdit) {
        await api.put(`/rules/${id}`, payload);
        toast({ title: 'Rule updated', variant: 'success' });
        navigate(`/rules/${id}`);
      } else {
        const res = await api.post<{ id: string }>('/rules', payload);
        toast({ title: 'Rule created', variant: 'success' });
        navigate(`/rules/${res.id}`);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.body?.message ?? 'Failed to save rule.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save rule.');
      }
      toast({ title: 'Failed to save rule', variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const breadcrumbs = (
    <Breadcrumb
      items={[
        { label: 'Rules', href: '/rules' },
        { label: isEdit ? 'Edit Rule' : 'New Rule' },
      ]}
    />
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs} title={isEdit ? 'Edit Rule' : 'New Rule'}>
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
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="text" className="h-11 w-full" />
            ))}
          </Card>
        )}

        {/* Form */}
        {!loading && (
          <form onSubmit={handleSubmit} noValidate>
            <Card className="space-y-5">
              <Input
                label="Name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                error={fieldErrors.name}
                placeholder="e.g., Missing Disclosure Check"
                required
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Select
                  label="Type"
                  options={TYPE_OPTIONS}
                  value={form.type}
                  onValueChange={(v) => updateField('type', v)}
                  error={fieldErrors.type}
                  placeholder="Select type"
                />
                <Select
                  label="Severity"
                  options={SEVERITY_OPTIONS}
                  value={form.severity}
                  onValueChange={(v) => updateField('severity', v)}
                  error={fieldErrors.severity}
                  placeholder="Select severity"
                />
              </div>

              {/* Applicable channels as checkboxes */}
              <fieldset>
                <legend className="text-sm font-medium text-text-primary">
                  Applicable Channels
                </legend>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Leave all unchecked to apply to all channels.
                </p>
                <div className="mt-3 flex flex-wrap gap-4">
                  {ALL_CHANNELS.map((ch) => (
                    <label
                      key={ch}
                      className="flex cursor-pointer items-center gap-2 text-sm text-text-primary"
                    >
                      <input
                        type="checkbox"
                        checked={form.applicableChannels.includes(ch)}
                        onChange={() => handleChannelToggle(ch)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      {ch}
                    </label>
                  ))}
                </div>
              </fieldset>

              <Input
                label="Applicable Countries"
                value={form.applicableCountries}
                onChange={(e) => updateField('applicableCountries', e.target.value)}
                placeholder="e.g., IT, DE, FR"
                helpText="Comma-separated ISO country codes. Leave empty for all countries."
              />

              {/* Payload JSON */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary">
                  Payload (JSON)
                </label>
                <textarea
                  className={`min-h-[160px] w-full rounded-lg border px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 ${
                    fieldErrors.payload
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-border hover:border-gray-400'
                  }`}
                  value={form.payload}
                  onChange={(e) => updateField('payload', e.target.value)}
                  placeholder='{"key": "value"}'
                />
                {fieldErrors.payload && (
                  <p role="alert" className="text-xs text-red-600">
                    {fieldErrors.payload}
                  </p>
                )}
                <p className="text-xs text-text-secondary">
                  The rule payload defines the compliance check parameters in JSON format.
                </p>
              </div>
            </Card>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => navigate(isEdit ? `/rules/${id}` : '/rules')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {isEdit ? 'Save Changes' : 'Create Rule'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}

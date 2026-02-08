import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { api, ApiClientError } from '../../lib/api-client';

interface SourceFormData {
  displayName: string;
  platform: string;
  channel: string;
  countryCode: string;
  sourceType: string;
  identifier: string;
  crawlFrequencyMinutes: number;
  startUrls: string;
  keywords: string;
}

const PLATFORM_OPTIONS = [
  { value: 'WEB', label: 'Web' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'YOUTUBE', label: 'YouTube' },
];

const CHANNEL_OPTIONS = [
  { value: 'WEB', label: 'Web' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'YOUTUBE', label: 'YouTube' },
];

const SOURCE_TYPE_OPTIONS = [
  { value: 'WEB_OWNED', label: 'Web Owned' },
  { value: 'WEB_SEARCH_DISCOVERY', label: 'Web Search Discovery' },
  { value: 'SOCIAL_PROFILE', label: 'Social Profile' },
  { value: 'SOCIAL_HASHTAG', label: 'Social Hashtag' },
  { value: 'SOCIAL_KEYWORD', label: 'Social Keyword' },
];

const INITIAL_FORM: SourceFormData = {
  displayName: '',
  platform: '',
  channel: '',
  countryCode: '',
  sourceType: '',
  identifier: '',
  crawlFrequencyMinutes: 60,
  startUrls: '',
  keywords: '',
};

export function SourceFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<SourceFormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fetchSource = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<Record<string, unknown>>(`/v1/sources/${id}`);
      setForm({
        displayName: String(res.displayName ?? ''),
        platform: String(res.platform ?? ''),
        channel: String(res.channel ?? ''),
        countryCode: String(res.countryCode ?? ''),
        sourceType: String(res.sourceType ?? ''),
        identifier: String(res.identifier ?? ''),
        crawlFrequencyMinutes: Number(res.crawlFrequencyMinutes ?? 60),
        startUrls: Array.isArray((res.config as Record<string, unknown>)?.startUrls)
          ? ((res.config as Record<string, unknown>).startUrls as string[]).join('\n')
          : '',
        keywords: Array.isArray((res.config as Record<string, unknown>)?.keywords)
          ? ((res.config as Record<string, unknown>).keywords as string[]).join('\n')
          : '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load source.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) fetchSource();
  }, [isEdit, fetchSource]);

  function updateField<K extends keyof SourceFormData>(key: K, value: SourceFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.displayName.trim()) errors.displayName = 'Display name is required.';
    if (!form.platform) errors.platform = 'Platform is required.';
    if (!form.channel) errors.channel = 'Channel is required.';
    if (!form.countryCode.trim()) errors.countryCode = 'Country code is required.';
    if (!form.sourceType) errors.sourceType = 'Source type is required.';
    if (!form.identifier.trim()) errors.identifier = 'Identifier is required.';
    if (form.crawlFrequencyMinutes < 1) errors.crawlFrequencyMinutes = 'Must be at least 1 minute.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError(null);

    const config: Record<string, unknown> = {};
    if (form.sourceType === 'WEB_OWNED' && form.startUrls.trim()) {
      config.startUrls = form.startUrls.split('\n').map((u) => u.trim()).filter(Boolean);
    }
    if (form.sourceType === 'WEB_SEARCH_DISCOVERY' && form.keywords.trim()) {
      config.keywords = form.keywords.split('\n').map((k) => k.trim()).filter(Boolean);
    }

    const payload = {
      displayName: form.displayName.trim(),
      platform: form.platform,
      channel: form.channel,
      countryCode: form.countryCode.trim().toUpperCase(),
      sourceType: form.sourceType,
      identifier: form.identifier.trim(),
      crawlFrequencyMinutes: form.crawlFrequencyMinutes,
      config,
    };

    try {
      if (isEdit) {
        await api.put(`/v1/sources/${id}`, payload);
        navigate(`/sources/${id}`);
      } else {
        const res = await api.post<{ id: string }>('/v1/sources', payload);
        navigate(`/sources/${res.id}`);
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.body?.details) {
        setError(err.body.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save source.');
      }
    } finally {
      setSaving(false);
    }
  }

  const breadcrumbs = (
    <Breadcrumb
      items={[
        { label: 'Sources', href: '/sources' },
        { label: isEdit ? 'Edit Source' : 'New Source' },
      ]}
    />
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs} title={isEdit ? 'Edit Source' : 'New Source'}>
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

        {/* Loading skeleton for edit mode */}
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
              <Input
                label="Display Name"
                value={form.displayName}
                onChange={(e) => updateField('displayName', e.target.value)}
                error={fieldErrors.displayName}
                placeholder="e.g., Company Blog"
                required
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Select
                  label="Platform"
                  options={PLATFORM_OPTIONS}
                  value={form.platform}
                  onValueChange={(v) => updateField('platform', v)}
                  error={fieldErrors.platform}
                  placeholder="Select platform"
                />
                <Select
                  label="Channel"
                  options={CHANNEL_OPTIONS}
                  value={form.channel}
                  onValueChange={(v) => updateField('channel', v)}
                  error={fieldErrors.channel}
                  placeholder="Select channel"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label="Country Code"
                  value={form.countryCode}
                  onChange={(e) => updateField('countryCode', e.target.value)}
                  error={fieldErrors.countryCode}
                  placeholder="e.g., IT"
                  maxLength={2}
                />
                <Select
                  label="Source Type"
                  options={SOURCE_TYPE_OPTIONS}
                  value={form.sourceType}
                  onValueChange={(v) => updateField('sourceType', v)}
                  error={fieldErrors.sourceType}
                  placeholder="Select type"
                />
              </div>

              <Input
                label="Identifier"
                value={form.identifier}
                onChange={(e) => updateField('identifier', e.target.value)}
                error={fieldErrors.identifier}
                placeholder="URL or profile identifier"
                helpText="The URL, profile handle, or unique identifier for this source."
              />

              <Input
                label="Crawl Frequency (minutes)"
                type="number"
                min={1}
                value={String(form.crawlFrequencyMinutes)}
                onChange={(e) => updateField('crawlFrequencyMinutes', parseInt(e.target.value, 10) || 1)}
                error={fieldErrors.crawlFrequencyMinutes}
                helpText="How often to crawl this source, in minutes."
              />

              {/* Conditional fields */}
              {form.sourceType === 'WEB_OWNED' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-primary">
                    Start URLs
                  </label>
                  <textarea
                    className="min-h-[100px] w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0"
                    value={form.startUrls}
                    onChange={(e) => updateField('startUrls', e.target.value)}
                    placeholder="One URL per line"
                  />
                  <p className="text-xs text-text-secondary">
                    Enter one URL per line. These are the starting pages for the web crawler.
                  </p>
                </div>
              )}

              {form.sourceType === 'WEB_SEARCH_DISCOVERY' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-primary">
                    Keywords
                  </label>
                  <textarea
                    className="min-h-[100px] w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0"
                    value={form.keywords}
                    onChange={(e) => updateField('keywords', e.target.value)}
                    placeholder="One keyword per line"
                  />
                  <p className="text-xs text-text-secondary">
                    Enter one keyword or phrase per line to discover relevant web content.
                  </p>
                </div>
              )}
            </Card>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => navigate(isEdit ? `/sources/${id}` : '/sources')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {isEdit ? 'Save Changes' : 'Create Source'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}

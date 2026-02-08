import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { api, ApiClientError } from '../lib/api-client';

interface SystemSettings {
  id: string;
  // Thresholds & SLA
  defaultDueHoursHigh: number;
  defaultDueHoursMedium: number;
  defaultDueDaysLow: number;
  escalationAfterHours: number;
  languageConfidenceThreshold: number;

  // LLM Configuration
  llmProvider: string;
  llmModel: string;
  llmMaxTokens: number;

  // Export Limits
  exportMaxRows: number;

  // Data Retention
  retentionDays: number;

  // Pipeline
  maxRetriesPerStep: number;
  defaultScheduleIntervalMinutes: number;

  // Other
  allowedCountryCodes: string[];
  piiRedactionEnabledDefault: boolean;
}

const LLM_PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'azure_openai', label: 'Azure OpenAI' },
];

const LLM_MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

const DEFAULT_SETTINGS: SystemSettings = {
  id: 'default',
  defaultDueHoursHigh: 24,
  defaultDueHoursMedium: 72,
  defaultDueDaysLow: 7,
  escalationAfterHours: 48,
  languageConfidenceThreshold: 0.8,
  llmProvider: 'openai',
  llmModel: 'gpt-4o',
  llmMaxTokens: 4096,
  exportMaxRows: 50000,
  retentionDays: 180,
  maxRetriesPerStep: 3,
  defaultScheduleIntervalMinutes: 1440,
  allowedCountryCodes: [],
  piiRedactionEnabledDefault: true,
};

export function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SystemSettings>('/settings');
      setSettings(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  function updateField<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await api.put('/settings', settings);
      setSuccess(true);
      toast({ title: 'Settings saved', variant: 'success' });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.body?.message ?? 'Failed to save settings.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save settings.');
      }
      toast({ title: 'Failed to save settings', variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Settings">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Configure system-wide thresholds, LLM parameters, and data retention policies.
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

        {/* Success */}
        {success && (
          <div
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            role="status"
          >
            Settings saved successfully.
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="space-y-4">
                <Skeleton variant="text" className="h-5 w-40" />
                <Skeleton variant="text" className="h-11 w-full" />
                <Skeleton variant="text" className="h-11 w-full" />
              </Card>
            ))}
          </div>
        )}

        {/* Settings form */}
        {!loading && (
          <form onSubmit={handleSubmit} noValidate>
            {/* Thresholds & SLA */}
            <Card className="space-y-5">
              <h2 className="text-lg font-semibold text-text-primary">Thresholds & SLA</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label="Due Hours (High Risk)"
                  type="number"
                  min={1}
                  value={String(settings.defaultDueHoursHigh)}
                  onChange={(e) => updateField('defaultDueHoursHigh', parseInt(e.target.value, 10) || 1)}
                  helpText="Hours before a HIGH risk ticket is due."
                />
                <Input
                  label="Due Hours (Medium Risk)"
                  type="number"
                  min={1}
                  value={String(settings.defaultDueHoursMedium)}
                  onChange={(e) => updateField('defaultDueHoursMedium', parseInt(e.target.value, 10) || 1)}
                  helpText="Hours before a MEDIUM risk ticket is due."
                />
                <Input
                  label="Due Days (Low Risk)"
                  type="number"
                  min={1}
                  value={String(settings.defaultDueDaysLow)}
                  onChange={(e) => updateField('defaultDueDaysLow', parseInt(e.target.value, 10) || 1)}
                  helpText="Days before a LOW risk ticket is due."
                />
                <Input
                  label="Auto-Escalation (Hours)"
                  type="number"
                  min={1}
                  value={String(settings.escalationAfterHours)}
                  onChange={(e) => updateField('escalationAfterHours', parseInt(e.target.value, 10) || 1)}
                  helpText="Hours of inactivity before ticket auto-escalation."
                />
                <Input
                  label="Language Confidence Threshold"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={String(settings.languageConfidenceThreshold)}
                  onChange={(e) => updateField('languageConfidenceThreshold', parseFloat(e.target.value) || 0)}
                  helpText="Language detection confidence threshold (0-1)."
                />
              </div>
            </Card>

            {/* LLM Configuration */}
            <Card className="mt-6 space-y-5">
              <h2 className="text-lg font-semibold text-text-primary">LLM Configuration</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Select
                  label="LLM Provider"
                  options={LLM_PROVIDER_OPTIONS}
                  value={settings.llmProvider}
                  onValueChange={(v) => updateField('llmProvider', v)}
                />
                <Select
                  label="LLM Model"
                  options={LLM_MODEL_OPTIONS}
                  value={settings.llmModel}
                  onValueChange={(v) => updateField('llmModel', v)}
                />
                <Input
                  label="Max Tokens"
                  type="number"
                  min={256}
                  value={String(settings.llmMaxTokens)}
                  onChange={(e) => updateField('llmMaxTokens', parseInt(e.target.value, 10) || 256)}
                  helpText="Maximum tokens in LLM response."
                />
                <Input
                  label="Max Retries Per Step"
                  type="number"
                  min={0}
                  value={String(settings.maxRetriesPerStep)}
                  onChange={(e) => updateField('maxRetriesPerStep', parseInt(e.target.value, 10) || 0)}
                  helpText="Maximum retries per pipeline step."
                />
              </div>
            </Card>

            {/* Export & Retention */}
            <Card className="mt-6 space-y-5">
              <h2 className="text-lg font-semibold text-text-primary">Export & Retention</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label="Max Export Rows"
                  type="number"
                  min={100}
                  value={String(settings.exportMaxRows)}
                  onChange={(e) => updateField('exportMaxRows', parseInt(e.target.value, 10) || 100)}
                  helpText="Maximum number of rows per CSV export."
                />
                <Input
                  label="Data Retention (Days)"
                  type="number"
                  min={1}
                  value={String(settings.retentionDays)}
                  onChange={(e) => updateField('retentionDays', parseInt(e.target.value, 10) || 1)}
                  helpText="How long to keep content data before purging."
                />
                <Input
                  label="Default Schedule Interval (Min)"
                  type="number"
                  min={1}
                  value={String(settings.defaultScheduleIntervalMinutes)}
                  onChange={(e) => updateField('defaultScheduleIntervalMinutes', parseInt(e.target.value, 10) || 1)}
                  helpText="Default crawl interval for new sources."
                />
              </div>
            </Card>

            {/* Save button */}
            <div className="mt-6 flex items-center justify-end">
              <Button type="submit" loading={saving}>
                Save Settings
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import { api, ApiClientError } from '../lib/api-client';

interface SystemSettings {
  // Thresholds & SLA
  defaultDueHoursHigh: number;
  defaultDueHoursMedium: number;
  defaultDueHoursLow: number;
  autoEscalationHours: number;
  confidenceThreshold: number;

  // LLM Configuration
  llmProvider: string;
  llmModel: string;
  llmTemperature: number;
  llmMaxTokens: number;

  // Export Limits
  exportMaxRows: number;
  exportTimeoutSeconds: number;

  // Data Retention
  retentionMonths: number;
  auditRetentionMonths: number;
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
  defaultDueHoursHigh: 4,
  defaultDueHoursMedium: 24,
  defaultDueHoursLow: 72,
  autoEscalationHours: 48,
  confidenceThreshold: 0.7,
  llmProvider: 'openai',
  llmModel: 'gpt-4o',
  llmTemperature: 0.1,
  llmMaxTokens: 4096,
  exportMaxRows: 10000,
  exportTimeoutSeconds: 120,
  retentionMonths: 6,
  auditRetentionMonths: 12,
};

export function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SystemSettings>('/v1/settings');
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
      await api.put('/v1/settings', settings);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.body?.message ?? 'Failed to save settings.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save settings.');
      }
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
                  label="Due Hours (Low Risk)"
                  type="number"
                  min={1}
                  value={String(settings.defaultDueHoursLow)}
                  onChange={(e) => updateField('defaultDueHoursLow', parseInt(e.target.value, 10) || 1)}
                  helpText="Hours before a LOW risk ticket is due."
                />
                <Input
                  label="Auto-Escalation (Hours)"
                  type="number"
                  min={1}
                  value={String(settings.autoEscalationHours)}
                  onChange={(e) => updateField('autoEscalationHours', parseInt(e.target.value, 10) || 1)}
                  helpText="Hours of inactivity before ticket auto-escalation."
                />
                <Input
                  label="Confidence Threshold"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={String(settings.confidenceThreshold)}
                  onChange={(e) => updateField('confidenceThreshold', parseFloat(e.target.value) || 0)}
                  helpText="LLM confidence threshold (0-1) for compliance decisions."
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
                  label="Temperature"
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={String(settings.llmTemperature)}
                  onChange={(e) => updateField('llmTemperature', parseFloat(e.target.value) || 0)}
                  helpText="Lower values produce more deterministic output."
                />
                <Input
                  label="Max Tokens"
                  type="number"
                  min={256}
                  value={String(settings.llmMaxTokens)}
                  onChange={(e) => updateField('llmMaxTokens', parseInt(e.target.value, 10) || 256)}
                  helpText="Maximum tokens in LLM response."
                />
              </div>
            </Card>

            {/* Export Limits */}
            <Card className="mt-6 space-y-5">
              <h2 className="text-lg font-semibold text-text-primary">Export Limits</h2>
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
                  label="Export Timeout (Seconds)"
                  type="number"
                  min={10}
                  value={String(settings.exportTimeoutSeconds)}
                  onChange={(e) => updateField('exportTimeoutSeconds', parseInt(e.target.value, 10) || 10)}
                  helpText="HTTP timeout for export requests."
                />
              </div>
            </Card>

            {/* Data Retention */}
            <Card className="mt-6 space-y-5">
              <h2 className="text-lg font-semibold text-text-primary">Data Retention</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label="Data Retention (Months)"
                  type="number"
                  min={1}
                  value={String(settings.retentionMonths)}
                  onChange={(e) => updateField('retentionMonths', parseInt(e.target.value, 10) || 1)}
                  helpText="How long to keep content data before purging."
                />
                <Input
                  label="Audit Log Retention (Months)"
                  type="number"
                  min={1}
                  value={String(settings.auditRetentionMonths)}
                  onChange={(e) => updateField('auditRetentionMonths', parseInt(e.target.value, 10) || 1)}
                  helpText="How long to keep audit log entries."
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

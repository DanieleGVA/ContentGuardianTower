import { test, expect } from '@playwright/test';
import { getStoredAdminToken } from './helpers.js';

test.describe('Settings', () => {
  test('shows settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('main').getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('settings page loads without errors', async ({ page }) => {
    await page.goto('/settings');
    const errorAlert = page.getByRole('alert');
    const hasError = await errorAlert.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasError).toBeFalsy();
  });

  test('can view system settings via API', async ({ request }) => {
    const token = getStoredAdminToken();

    const res = await request.get('http://localhost:3000/api/settings', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.id).toBe('default');
    expect(body.retentionDays).toBeDefined();
    expect(body.escalationAfterHours).toBeDefined();
  });

  test('can update system settings via API', async ({ request }) => {
    const token = getStoredAdminToken();

    const res = await request.put('http://localhost:3000/api/settings', {
      headers: { authorization: `Bearer ${token}` },
      data: { retentionDays: 180 },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.retentionDays).toBe(180);
  });
});

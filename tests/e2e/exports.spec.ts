import { test, expect } from '@playwright/test';
import { getStoredAdminToken } from './helpers.js';

test.describe('Exports', () => {
  test('shows exports page', async ({ page }) => {
    await page.goto('/exports');
    await expect(page.locator('main').getByRole('heading', { name: 'Exports' })).toBeVisible();
  });

  test('exports page loads without errors', async ({ page }) => {
    await page.goto('/exports');
    const errorAlert = page.getByRole('alert');
    const hasError = await errorAlert.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasError).toBeFalsy();
  });

  test('can trigger an export via API', async ({ request }) => {
    const token = getStoredAdminToken();

    const exportRes = await request.post('http://localhost:3000/api/exports', {
      headers: { authorization: `Bearer ${token}` },
      data: { exportType: 'TICKETS_CSV' },
    });
    expect(exportRes.ok()).toBeTruthy();
    const body = await exportRes.json();
    expect(body.id).toBeDefined();
    expect(body.exportType).toBe('TICKETS_CSV');
    expect(body.status).toBe('QUEUED');
  });

  test('can check export status via API', async ({ request }) => {
    const token = getStoredAdminToken();

    const listRes = await request.get('http://localhost:3000/api/exports', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.ok()).toBeTruthy();
    const body = await listRes.json();
    expect(body.data).toBeDefined();
    expect(body.meta).toBeDefined();
  });
});

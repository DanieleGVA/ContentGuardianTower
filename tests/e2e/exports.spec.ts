import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('Enter your username').fill('admin');
  await page.getByPlaceholder('Enter your password').fill('admin123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('Exports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('shows exports page', async ({ page }) => {
    await page.goto('/exports');
    await expect(page.getByText('Exports')).toBeVisible();
  });

  test('exports page loads without errors', async ({ page }) => {
    await page.goto('/exports');
    const errorAlert = page.getByRole('alert');
    const hasError = await errorAlert.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasError).toBeFalsy();
  });

  test('can trigger an export via API', async ({ request }) => {
    // Login via API to get token
    const loginRes = await request.post('http://localhost:3000/api/auth/login', {
      data: { username: 'admin', password: 'admin123' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();

    // Trigger export
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
    const loginRes = await request.post('http://localhost:3000/api/auth/login', {
      data: { username: 'admin', password: 'admin123' },
    });
    const { token } = await loginRes.json();

    const listRes = await request.get('http://localhost:3000/api/exports', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.ok()).toBeTruthy();
    const body = await listRes.json();
    expect(body.data).toBeDefined();
    expect(body.meta).toBeDefined();
  });
});

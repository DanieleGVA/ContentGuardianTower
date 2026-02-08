import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('Enter your username').fill('admin');
  await page.getByPlaceholder('Enter your password').fill('admin123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('shows settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('Settings')).toBeVisible();
  });

  test('settings page loads without errors', async ({ page }) => {
    await page.goto('/settings');
    const errorAlert = page.getByRole('alert');
    const hasError = await errorAlert.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasError).toBeFalsy();
  });

  test('can view system settings via API', async ({ request }) => {
    const loginRes = await request.post('http://localhost:3000/api/auth/login', {
      data: { username: 'admin', password: 'admin123' },
    });
    const { token } = await loginRes.json();

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
    const loginRes = await request.post('http://localhost:3000/api/auth/login', {
      data: { username: 'admin', password: 'admin123' },
    });
    const { token } = await loginRes.json();

    const res = await request.put('http://localhost:3000/api/settings', {
      headers: { authorization: `Bearer ${token}` },
      data: { retentionDays: 180 },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.retentionDays).toBe(180);
  });
});

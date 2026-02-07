import { test, expect } from '@playwright/test';

test.describe('Health Check', () => {
  test('API returns healthy status', async ({ request }) => {
    const response = await request.get('http://localhost:3000/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});

test.describe('Login Page', () => {
  test('shows login form when not authenticated', async ({ page }) => {
    await page.goto('/');
    // After auth is implemented, this should redirect to login
    await expect(page).toHaveTitle(/Content Guardian Tower/);
  });
});

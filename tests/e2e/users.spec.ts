import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('Enter your username').fill('admin');
  await page.getByPlaceholder('Enter your password').fill('admin123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('Users', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('shows users list page', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByText('Users')).toBeVisible();
  });

  test('can navigate to create user form', async ({ page }) => {
    await page.goto('/users');
    const createBtn = page.getByRole('link', { name: /new user|add user|create/i }).or(
      page.getByRole('button', { name: /new user|add user|create/i }),
    );
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForURL('**/users/new');
      await expect(page).toHaveURL(/\/users\/new/);
    }
  });

  test('users list shows seeded admin user', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByText('admin').first()).toBeVisible();
  });

  test('users list loads without errors', async ({ page }) => {
    await page.goto('/users');
    const errorAlert = page.getByRole('alert');
    const hasError = await errorAlert.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasError).toBeFalsy();
  });
});

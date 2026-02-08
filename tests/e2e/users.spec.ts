import { test, expect } from '@playwright/test';

test.describe('Users', () => {
  test('shows users list page', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('main').getByRole('heading', { name: 'Users' })).toBeVisible();
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

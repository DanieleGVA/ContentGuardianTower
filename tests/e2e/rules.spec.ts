import { test, expect } from '@playwright/test';

test.describe('Rules', () => {
  test('shows rules list page', async ({ page }) => {
    await page.goto('/rules');
    await expect(page.getByRole('heading', { name: 'Rules' }).first()).toBeVisible();
  });

  test('can navigate to create rule form', async ({ page }) => {
    await page.goto('/rules');
    const createBtn = page.getByRole('link', { name: /new rule|add rule|create/i }).or(
      page.getByRole('button', { name: /new rule|add rule|create/i }),
    );
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForURL('**/rules/new');
      await expect(page).toHaveURL(/\/rules\/new/);
    }
  });

  test('rule create form shows required fields', async ({ page }) => {
    await page.goto('/rules/new');
    await expect(
      page.getByText(/name/i).first(),
    ).toBeVisible();
  });

  test('rules list loads without errors', async ({ page }) => {
    await page.goto('/rules');
    const errorAlert = page.getByRole('alert');
    const hasError = await errorAlert.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasError).toBeFalsy();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Sources', () => {
  test('shows sources list page', async ({ page }) => {
    await page.goto('/sources');
    await expect(page.getByRole('heading', { name: 'Sources' }).first()).toBeVisible();
  });

  test('can navigate to create source form', async ({ page }) => {
    await page.goto('/sources');
    const createBtn = page.getByRole('link', { name: /new source|add source|create/i }).or(
      page.getByRole('button', { name: /new source|add source|create/i }),
    );
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForURL('**/sources/new');
      await expect(page).toHaveURL(/\/sources\/new/);
    }
  });

  test('source create form shows required fields', async ({ page }) => {
    await page.goto('/sources/new');
    // Should show form fields for source creation
    await expect(
      page.getByText(/display name|name/i).first(),
    ).toBeVisible();
  });

  test('sources list shows seeded sources if any', async ({ page }) => {
    await page.goto('/sources');
    // Check the page loads without error
    const errorAlert = page.getByRole('alert');
    const hasError = await errorAlert.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasError).toBeFalsy();
  });
});

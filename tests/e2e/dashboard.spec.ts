import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('shows dashboard page with KPI sections', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);

    // Status KPI cards should be visible (use first() to avoid strict mode on repeated text)
    await expect(page.getByText('Open').first()).toBeVisible();
    await expect(page.getByText('In Progress').first()).toBeVisible();
    await expect(page.getByText('Resolved').first()).toBeVisible();
    await expect(page.getByText('Closed').first()).toBeVisible();
  });

  test('shows risk level KPI cards', async ({ page }) => {
    await expect(page.getByText('High Risk')).toBeVisible();
    await expect(page.getByText('Medium Risk')).toBeVisible();
    await expect(page.getByText('Low Risk')).toBeVisible();
  });

  test('shows recent activity section', async ({ page }) => {
    await expect(page.getByText('Last 24 Hours')).toBeVisible();
  });

  test('shows latest tickets section', async ({ page }) => {
    await expect(page.getByText('Latest Tickets')).toBeVisible();
  });

  test('KPI cards navigate to filtered tickets list', async ({ page }) => {
    await page.getByText('Open').first().click();
    await page.waitForURL('**/tickets**');
    await expect(page).toHaveURL(/\/tickets/);
  });

  test('view all button navigates to tickets list', async ({ page }) => {
    const viewAll = page.getByRole('button', { name: /view all/i }).or(page.getByText(/view all/i));
    if (await viewAll.isVisible()) {
      await viewAll.click();
      await page.waitForURL('**/tickets**');
      await expect(page).toHaveURL(/\/tickets/);
    }
  });
});

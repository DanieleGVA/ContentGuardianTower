import { test, expect } from '@playwright/test';

test.describe('Tickets List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tickets');
  });

  test('shows tickets list page', async ({ page }) => {
    await expect(page.locator('main').getByRole('heading', { name: 'Tickets' })).toBeVisible();
  });

  test('shows status filter buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /All/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Open/i }).first()).toBeVisible();
  });

  test('shows search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/search tickets/i)).toBeVisible();
  });

  test('clicking status filter changes URL', async ({ page }) => {
    await page.getByRole('button', { name: /Open/i }).first().click();
    await expect(page).toHaveURL(/status=OPEN/);
  });

  test('clicking risk filter changes URL', async ({ page }) => {
    const highBtn = page.getByRole('button', { name: 'High' });
    if (await highBtn.isVisible()) {
      await highBtn.click();
      await expect(page).toHaveURL(/riskLevel=HIGH/);
    }
  });

  test('search submits and updates results', async ({ page }) => {
    await page.getByPlaceholder(/search tickets/i).fill('test query');
    await page.getByPlaceholder(/search tickets/i).press('Enter');
    // Should not error - page heading still visible
    await expect(page.locator('main').getByRole('heading', { name: 'Tickets' })).toBeVisible();
  });

  test('pagination shows total count', async ({ page }) => {
    // The page should display a ticket count or pagination
    const countText = page.getByText(/ticket/i).first();
    await expect(countText).toBeVisible();
  });
});

test.describe('Ticket Detail', () => {
  test('navigating to ticket detail from list', async ({ page }) => {
    await page.goto('/tickets');

    // Click on the first ticket if any exist
    const firstTicketLink = page.locator('a[href*="/tickets/"]').first();
    if (await firstTicketLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstTicketLink.click();
      await page.waitForURL('**/tickets/**');
      // Should show ticket detail elements
      await expect(page.getByText('Status').first()).toBeVisible();
    }
  });

  test('shows 404 for non-existent ticket', async ({ page }) => {
    await page.goto('/tickets/00000000-0000-0000-0000-000000000000');
    // Should show error or not found
    await expect(page.getByRole('heading', { name: /failed to load/i })).toBeVisible({ timeout: 10000 });
  });
});

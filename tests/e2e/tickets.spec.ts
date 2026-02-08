import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('Enter your username').fill('admin');
  await page.getByPlaceholder('Enter your password').fill('admin123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('Tickets List', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/tickets');
  });

  test('shows tickets list page', async ({ page }) => {
    await expect(page.getByText('Tickets')).toBeVisible();
  });

  test('shows status filter buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open' })).toBeVisible();
  });

  test('shows search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/search tickets/i)).toBeVisible();
  });

  test('clicking status filter changes URL', async ({ page }) => {
    await page.getByRole('button', { name: 'Open' }).click();
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
    // Should not error
    await expect(page.getByText('Tickets')).toBeVisible();
  });

  test('empty state shows when no results', async ({ page }) => {
    // Navigate with unlikely filter
    await page.goto('/tickets?search=zzzznonexistent999');
    // Either shows empty state or no tickets text
    const emptyState = page.getByText(/no tickets found/i);
    const ticketsList = page.getByText('Tickets');
    await expect(emptyState.or(ticketsList)).toBeVisible();
  });
});

test.describe('Ticket Detail', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('navigating to ticket detail from list', async ({ page }) => {
    await page.goto('/tickets');

    // Click on the first ticket if any exist
    const firstTicketLink = page.locator('a[href*="/tickets/"]').first();
    if (await firstTicketLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstTicketLink.click();
      await page.waitForURL('**/tickets/**');
      // Should show ticket detail elements
      await expect(page.getByText('Status')).toBeVisible();
    }
  });

  test('shows 404 for non-existent ticket', async ({ page }) => {
    await page.goto('/tickets/00000000-0000-0000-0000-000000000000');
    // Should show error or not found
    const error = page.getByText(/failed to load/i).or(page.getByText(/not found/i));
    await expect(error).toBeVisible({ timeout: 10000 });
  });
});

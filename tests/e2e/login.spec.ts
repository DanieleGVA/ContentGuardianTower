import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:3000';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows login form', async ({ page }) => {
    await expect(page.getByText('Content Guardian Tower')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your username')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('sign-in button is disabled when fields are empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.getByPlaceholder('Enter your username').fill('nonexistent');
    await page.getByPlaceholder('Enter your password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    // Use the seeded admin user
    await page.getByPlaceholder('Enter your username').fill('admin');
    await page.getByPlaceholder('Enter your password').fill('admin123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('shows session expired banner when ?expired=true', async ({ page }) => {
    await page.goto('/login?expired=true');
    await expect(page.getByText(/session.*expired/i)).toBeVisible();
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    // Clear any tokens
    await page.evaluate(() => localStorage.removeItem('cgt_token'));
    await page.goto('/dashboard');
    await page.waitForURL('**/login**');
    await expect(page).toHaveURL(/\/login/);
  });
});

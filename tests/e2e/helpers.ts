import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Read the admin JWT token from the saved Playwright storageState file.
 * Used by API-only tests to avoid hitting the login rate limit.
 */
export function getStoredAdminToken(): string {
  const statePath = join(__dirname, '.auth', 'admin.json');
  const state = JSON.parse(readFileSync(statePath, 'utf-8'));
  const origin = state.origins?.find(
    (o: { origin: string }) => o.origin === 'http://localhost:5173',
  );
  const tokenEntry = origin?.localStorage?.find(
    (e: { name: string; value: string }) => e.name === 'cgt_token',
  );
  if (!tokenEntry) throw new Error('Admin token not found in storage state');
  return tokenEntry.value;
}

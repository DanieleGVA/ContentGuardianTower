import type { CountryScopeType } from '@prisma/client';
import { ForbiddenError } from './errors.js';

interface ScopedUser {
  countryScopeType: CountryScopeType;
  countryCodes: string[];
}

/**
 * Build a Prisma where clause that filters by the user's country scope.
 * The field name defaults to 'countryCode' but can be customized.
 */
export function buildCountryScopeFilter(
  user: ScopedUser,
  fieldName = 'countryCode',
): Record<string, unknown> {
  if (user.countryScopeType === 'ALL') {
    return {};
  }
  return { [fieldName]: { in: user.countryCodes } };
}

/**
 * Assert the user has access to the given country code.
 * Throws ForbiddenError if not.
 */
export function assertCountryAccess(user: ScopedUser, countryCode: string): void {
  if (user.countryScopeType === 'ALL') return;
  if (!user.countryCodes.includes(countryCode)) {
    throw new ForbiddenError(`Access denied for country '${countryCode}'`);
  }
}

/**
 * Get the list of countries the user can access, or null for ALL.
 */
export function getUserCountries(user: ScopedUser): string[] | null {
  if (user.countryScopeType === 'ALL') return null;
  return user.countryCodes;
}

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useFilters<T extends Record<string, string>>(defaults?: Partial<T>) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const result: Record<string, string> = {};
    if (defaults) {
      for (const [k, v] of Object.entries(defaults)) {
        if (v !== undefined) result[k] = v;
      }
    }
    for (const [key, value] of searchParams.entries()) {
      result[key] = value;
    }
    return result as T;
  }, [searchParams, defaults]);

  const setFilter = useCallback(
    (key: string, value: string | undefined) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === undefined || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
        // Reset to page 1 when filters change
        if (key !== 'page') {
          next.set('page', '1');
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const activeFilters = useMemo(() => {
    return Object.entries(filters)
      .filter(([key, value]) => value && !['page', 'pageSize', 'sortBy', 'sortOrder'].includes(key))
      .map(([key, value]) => ({ key, value }));
  }, [filters]);

  return { filters, setFilter, clearFilters, activeFilters };
}

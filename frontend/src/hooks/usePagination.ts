import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface PaginationState {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

interface PaginationActions {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSort: (field: string) => void;
}

export function usePagination(defaults?: Partial<PaginationState>): PaginationState & PaginationActions {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo<PaginationState>(() => ({
    page: parseInt(searchParams.get('page') ?? String(defaults?.page ?? 1), 10),
    pageSize: parseInt(searchParams.get('pageSize') ?? String(defaults?.pageSize ?? 20), 10),
    sortBy: searchParams.get('sortBy') ?? defaults?.sortBy,
    sortOrder: (searchParams.get('sortOrder') ?? defaults?.sortOrder ?? 'desc') as 'asc' | 'desc',
  }), [searchParams, defaults]);

  const setPage = useCallback((page: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(page));
      return next;
    });
  }, [setSearchParams]);

  const setPageSize = useCallback((size: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('pageSize', String(size));
      next.set('page', '1');
      return next;
    });
  }, [setSearchParams]);

  const setSort = useCallback((field: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const currentSortBy = prev.get('sortBy');
      const currentOrder = prev.get('sortOrder') ?? 'desc';

      if (currentSortBy === field) {
        next.set('sortOrder', currentOrder === 'asc' ? 'desc' : 'asc');
      } else {
        next.set('sortBy', field);
        next.set('sortOrder', 'desc');
      }
      next.set('page', '1');
      return next;
    });
  }, [setSearchParams]);

  return { ...state, setPage, setPageSize, setSort };
}

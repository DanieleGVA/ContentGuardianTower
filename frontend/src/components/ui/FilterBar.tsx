import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

export interface FilterBarProps {
  children: ReactNode;
  activeFilters?: ActiveFilter[];
  onClearFilter?: (key: string) => void;
  onClearAll?: () => void;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
  advancedContent?: ReactNode;
  className?: string;
}

export function FilterBar({
  children,
  activeFilters = [],
  onClearFilter,
  onClearAll,
  showAdvanced,
  onToggleAdvanced,
  advancedContent,
  className,
}: FilterBarProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-card-bg', className)}>
      {/* Primary filters */}
      <div className="flex flex-wrap items-end gap-3 p-4">{children}</div>

      {/* Advanced toggle */}
      {onToggleAdvanced && (
        <div className="border-t border-border px-4 py-2">
          <button
            type="button"
            onClick={onToggleAdvanced}
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium text-text-secondary',
              'hover:text-text-primary transition-colors duration-150',
            )}
          >
            {showAdvanced ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Hide advanced filters
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Show advanced filters
              </>
            )}
          </button>
        </div>
      )}

      {/* Advanced filters content */}
      {showAdvanced && advancedContent && (
        <div className="border-t border-border px-4 py-3">
          <div className="flex flex-wrap items-end gap-3">{advancedContent}</div>
        </div>
      )}

      {/* Active filter pills */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
          {activeFilters.map((filter) => (
            <span
              key={filter.key}
              className={cn(
                'inline-flex items-center gap-1 rounded-full',
                'bg-primary-light px-2.5 py-1 text-xs font-medium text-primary',
              )}
            >
              <span className="text-text-secondary">{filter.label}:</span>
              {filter.value}
              {onClearFilter && (
                <button
                  type="button"
                  onClick={() => onClearFilter(filter.key)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-primary/10 transition-colors"
                  aria-label={`Remove ${filter.label} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {onClearAll && activeFilters.length > 1 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

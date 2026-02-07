import type { ReactNode } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/cn';

export interface TabItem {
  /** Unique tab value used for selection. */
  value: string;
  /** Display label for the tab trigger. */
  label: string;
  /** Optional count displayed as a small badge next to the label. */
  count?: number;
}

export interface TabsProps {
  /** Tab definitions. */
  tabs: TabItem[];
  /** Currently active tab value. */
  value: string;
  /** Callback when the active tab changes. */
  onValueChange: (value: string) => void;
  /** Tab panel content. Render <Tabs.Content value="..."> children inside. */
  children: ReactNode;
  /** Additional class names for the root element. */
  className?: string;
}

export function Tabs({ tabs, value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      className={cn('flex flex-col', className)}
    >
      <TabsPrimitive.List
        className="flex gap-1 border-b border-border"
        aria-label="Tabs"
      >
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium',
              'transition-colors duration-150',
              'border-transparent text-text-secondary',
              'hover:text-text-primary',
              'data-[state=active]:border-primary data-[state=active]:text-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none',
                  'bg-gray-100 text-text-secondary',
                  'group-data-[state=active]:bg-primary-light group-data-[state=active]:text-primary',
                )}
              >
                {tab.count}
              </span>
            )}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      {children}
    </TabsPrimitive.Root>
  );
}

/* Re-export TabsContent for consumers to wrap per-tab panels. */
export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.Content
      value={value}
      className={cn(
        'mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        className,
      )}
    >
      {children}
    </TabsPrimitive.Content>
  );
}

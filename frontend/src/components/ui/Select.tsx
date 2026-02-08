import { useId } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  /** Label rendered above the select. */
  label?: string;
  /** Error message. When set, the trigger shows a red border and the message below. */
  error?: string;
  /** The list of options to display. */
  options: SelectOption[];
  /** Controlled value. */
  value?: string;
  /** Callback when the value changes. */
  onValueChange?: (value: string) => void;
  /** Placeholder text when no value is selected. */
  placeholder?: string;
  /** Additional class names for the trigger element. */
  className?: string;
  /** Whether the select is disabled. */
  disabled?: boolean;
  /** HTML name attribute for form submission. */
  name?: string;
}

// Radix Select does not allow empty string values. Map them to a sentinel.
const EMPTY_SENTINEL = '__empty__';

export function Select({
  label,
  error,
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  className,
  disabled,
  name,
}: SelectProps) {
  const autoId = useId();
  const triggerId = `${autoId}-trigger`;
  const errorId = error ? `${autoId}-error` : undefined;

  const safeOptions = options.map((opt) => ({
    ...opt,
    value: opt.value === '' ? EMPTY_SENTINEL : opt.value,
  }));
  const safeValue = value === '' ? undefined : value;
  const handleChange = (val: string) => {
    onValueChange?.(val === EMPTY_SENTINEL ? '' : val);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={triggerId}
          className="text-sm font-medium text-text-primary"
        >
          {label}
        </label>
      )}

      <SelectPrimitive.Root
        value={safeValue}
        onValueChange={handleChange}
        disabled={disabled}
        name={name}
      >
        <SelectPrimitive.Trigger
          id={triggerId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            'inline-flex min-h-[44px] w-full items-center justify-between rounded-lg border px-3 py-2 text-sm',
            'text-text-primary',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60',
            'data-[placeholder]:text-text-muted',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-border hover:border-gray-400',
            className,
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown className="h-4 w-4 text-text-secondary" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className={cn(
              'z-50 max-h-60 min-w-[var(--radix-select-trigger-width)] overflow-auto',
              'rounded-lg border border-border bg-white shadow-lg',
              'animate-in fade-in-0 zoom-in-95',
            )}
          >
            <SelectPrimitive.Viewport className="p-1">
              {safeOptions.map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  className={cn(
                    'relative flex min-h-[36px] cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-sm',
                    'text-text-primary outline-none',
                    'data-[highlighted]:bg-primary-light data-[highlighted]:text-primary',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  )}
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2 flex items-center">
                    <Check className="h-4 w-4" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

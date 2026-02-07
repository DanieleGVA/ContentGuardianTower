import { forwardRef, type InputHTMLAttributes, useId } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label rendered above the input. */
  label?: string;
  /** Error message. When set, the input shows a red border and the message below. */
  error?: string;
  /** Help text rendered below the input (hidden when error is shown). */
  helpText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, className, id: idProp, ...rest }, ref) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const errorId = error ? `${id}-error` : undefined;
    const helpId = helpText && !error ? `${id}-help` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId ?? helpId}
          className={cn(
            'min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm text-text-primary',
            'placeholder:text-text-muted',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-border hover:border-gray-400',
            className,
          )}
          {...rest}
        />

        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}

        {helpText && !error && (
          <p id={helpId} className="text-xs text-text-secondary">
            {helpText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

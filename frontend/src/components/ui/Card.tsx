import { type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
  /** When provided, the card renders hover/focus styles and becomes clickable. */
  onClick?: () => void;
  /** HTML element to render as. Defaults to 'div'. */
  as?: ElementType;
}

export function Card({
  children,
  className,
  onClick,
  as: Component = 'div',
  ...rest
}: CardProps) {
  const interactive = typeof onClick === 'function';

  return (
    <Component
      className={cn(
        'rounded-lg bg-card-bg p-6 shadow-sm',
        interactive && [
          'cursor-pointer transition-shadow duration-150',
          'hover:shadow-md',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        ],
        className,
      )}
      onClick={onClick}
      {...(interactive ? { role: 'button', tabIndex: 0 } : {})}
      {...rest}
    >
      {children}
    </Component>
  );
}

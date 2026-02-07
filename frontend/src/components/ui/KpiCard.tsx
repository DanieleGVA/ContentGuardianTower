import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  color?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function KpiCard({
  icon,
  label,
  value,
  color = 'text-text-primary',
  href,
  onClick,
  className,
}: KpiCardProps) {
  const isClickable = Boolean(href || onClick);

  const content = (
    <>
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100', color)}>
        {icon}
      </div>
      <div className="mt-3">
        <p className={cn('text-2xl font-bold tracking-tight', color)}>{value}</p>
        <p className="mt-0.5 text-xs font-medium text-text-secondary">{label}</p>
      </div>
    </>
  );

  const sharedClasses = cn(
    'rounded-lg border border-border bg-card-bg p-5 text-left',
    'transition-all duration-150',
    isClickable && 'cursor-pointer hover:shadow-md hover:border-primary/30 active:shadow-sm',
    className,
  );

  if (href) {
    return (
      <a href={href} className={cn(sharedClasses, 'block no-underline')}>
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(sharedClasses, 'w-full')}>
        {content}
      </button>
    );
  }

  return <div className={sharedClasses}>{content}</div>;
}

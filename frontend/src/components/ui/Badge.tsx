import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import {
  TICKET_STATUS,
  RISK_LEVEL,
  ESCALATION_LEVEL,
  COMPLIANCE_STATUS,
} from '../../lib/design-tokens';

type TokenMap = Record<string, { label: string; color: string; bg: string; icon: string }>;

const TOKEN_MAPS: Record<string, TokenMap> = {
  status: TICKET_STATUS,
  risk: RISK_LEVEL,
  escalation: ESCALATION_LEVEL,
  compliance: COMPLIANCE_STATUS,
};

export interface BadgeProps {
  /** Which token map to look up the value in. Use 'custom' to skip token lookup. */
  variant: 'status' | 'risk' | 'escalation' | 'compliance' | 'custom';
  /** The enum key (e.g. 'OPEN', 'HIGH', 'REGIONAL') or display text for custom variant. */
  value: string;
  /** Override or supply extra classes (useful for custom variant). */
  className?: string;
  /** Optional leading icon element (overrides token icon). */
  icon?: ReactNode;
}

export function Badge({ variant, value, className, icon }: BadgeProps) {
  const tokenMap = variant !== 'custom' ? TOKEN_MAPS[variant] : undefined;
  const token = tokenMap?.[value];

  const label = token?.label ?? value;
  const colorClass = token?.color ?? 'text-text-secondary';
  const bgClass = token?.bg ?? 'bg-gray-100';
  const tokenIcon = token?.icon ?? '';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorClass,
        bgClass,
        className,
      )}
    >
      {icon ?? (tokenIcon ? <span aria-hidden="true">{tokenIcon}</span> : null)}
      {label}
    </span>
  );
}

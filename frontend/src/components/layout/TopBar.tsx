import { Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../lib/design-tokens';
import type { ReactNode } from 'react';

interface TopBarProps {
  onMenuToggle: () => void;
  breadcrumbs?: ReactNode;
  title?: string;
}

export function TopBar({ onMenuToggle, breadcrumbs, title }: TopBarProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card-bg px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-2 text-text-secondary hover:bg-page-bg lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <div>
          {breadcrumbs}
          {title && <h1 className="text-lg font-semibold tracking-tight text-text-primary">{title}</h1>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Country scope badges */}
        {user && user.countryScopeType === 'LIST' && user.countryCodes.length > 0 && (
          <div className="flex gap-1">
            {user.countryCodes.map((code) => (
              <span
                key={code}
                className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary"
              >
                {code}
              </span>
            ))}
          </div>
        )}
        {user && user.countryScopeType === 'ALL' && (
          <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
            ALL
          </span>
        )}

        {/* Role badge */}
        {user && (
          <span className="text-xs text-text-muted">
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
        )}
      </div>
    </header>
  );
}

import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { useAuth } from '../../hooks/useAuth';
import { NAV_VISIBILITY, type NavGroup } from '../../lib/design-tokens';
import {
  LayoutDashboard,
  Ticket,
  Activity,
  Globe,
  BookOpen,
  Users,
  Settings,
  Shield,
  Download,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_GROUPS: { group: NavGroup; label: string; items: NavItem[] }[] = [
  {
    group: 'OPERATE',
    label: 'Operate',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
      { label: 'Tickets', href: '/tickets', icon: <Ticket size={18} /> },
    ],
  },
  {
    group: 'MONITOR',
    label: 'Monitor',
    items: [
      { label: 'Ingestion Runs', href: '/ingestion-runs', icon: <Activity size={18} /> },
    ],
  },
  {
    group: 'CONFIGURE',
    label: 'Configure',
    items: [
      { label: 'Sources', href: '/sources', icon: <Globe size={18} /> },
      { label: 'Rules', href: '/rules', icon: <BookOpen size={18} /> },
      { label: 'Users', href: '/users', icon: <Users size={18} /> },
      { label: 'Settings', href: '/settings', icon: <Settings size={18} /> },
    ],
  },
  {
    group: 'GOVERN',
    label: 'Govern',
    items: [
      { label: 'Audit Log', href: '/audit-log', icon: <Shield size={18} /> },
    ],
  },
  {
    group: 'REPORT',
    label: 'Report',
    items: [
      { label: 'Exports', href: '/exports', icon: <Download size={18} /> },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const role = user?.role ?? '';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar-bg transition-transform duration-200 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Shield size={24} className="text-primary" />
            <span className="text-lg font-semibold tracking-tight text-sidebar-text">CGT</span>
          </div>
          <button onClick={onClose} className="text-sidebar-text lg:hidden">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map(({ group, label, items }) => {
            const allowedRoles = NAV_VISIBILITY[group];
            if (!allowedRoles.includes(role)) return null;

            return (
              <div key={group} className="mb-6">
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {label}
                </p>
                {items.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-active text-white'
                          : 'text-sidebar-text/70 hover:bg-white/10 hover:text-sidebar-text',
                      )
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* User profile */}
        {user && (
          <div className="border-t border-white/10 p-4">
            <div className="mb-2">
              <p className="text-sm font-medium text-sidebar-text">{user.fullName}</p>
              <p className="text-xs text-text-muted">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="w-full rounded-md px-3 py-1.5 text-left text-sm text-sidebar-text/70 hover:bg-white/10 hover:text-sidebar-text"
            >
              Logout
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

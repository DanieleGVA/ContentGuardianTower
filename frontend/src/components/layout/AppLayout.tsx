import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AppLayoutProps {
  children: ReactNode;
  breadcrumbs?: ReactNode;
  title?: string;
}

export function AppLayout({ children, breadcrumbs, title }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-page-bg">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64">
        <TopBar
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          breadcrumbs={breadcrumbs}
          title={title}
        />

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

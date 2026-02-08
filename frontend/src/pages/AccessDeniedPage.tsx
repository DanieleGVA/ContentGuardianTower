import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';

export function AccessDeniedPage() {
  return (
    <AppLayout title="Access Denied">
      <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <ShieldOff className="h-10 w-10 text-red-500" />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-text-primary">Access Denied</h1>

        <p className="mt-2 max-w-md text-sm text-text-secondary">
          You do not have permission to view this page. If you believe this is an error,
          please contact your administrator to request the appropriate access level.
        </p>

        <Link
          to="/dashboard"
          className="mt-8 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
        >
          Back to Dashboard
        </Link>
      </div>
    </AppLayout>
  );
}

import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketListPage } from './pages/tickets/TicketListPage';
import { TicketDetailPage } from './pages/tickets/TicketDetailPage';
import { SourceListPage } from './pages/sources/SourceListPage';
import { SourceDetailPage } from './pages/sources/SourceDetailPage';
import { SourceFormPage } from './pages/sources/SourceFormPage';
import { RuleListPage } from './pages/rules/RuleListPage';
import { RuleDetailPage } from './pages/rules/RuleDetailPage';
import { RuleFormPage } from './pages/rules/RuleFormPage';
import { UserListPage } from './pages/users/UserListPage';
import { UserFormPage } from './pages/users/UserFormPage';
import { IngestionRunListPage } from './pages/IngestionRunListPage';
import { IngestionRunDetailPage } from './pages/IngestionRunDetailPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SettingsPage } from './pages/SettingsPage';
import { ExportsPage } from './pages/ExportsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';

const ADMIN = ['ADMIN'];
const MANAGERS = ['ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER', 'LOCAL_MANAGER'];
const ALL_ROLES = ['ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER', 'LOCAL_MANAGER', 'VIEWER'];

export function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Operate (all roles) */}
        <Route path="/dashboard" element={<ProtectedRoute requiredRoles={ALL_ROLES}><DashboardPage /></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute requiredRoles={ALL_ROLES}><TicketListPage /></ProtectedRoute>} />
        <Route path="/tickets/:id" element={<ProtectedRoute requiredRoles={ALL_ROLES}><TicketDetailPage /></ProtectedRoute>} />

        {/* Monitor (managers+) */}
        <Route path="/ingestion-runs" element={<ProtectedRoute requiredRoles={MANAGERS}><IngestionRunListPage /></ProtectedRoute>} />
        <Route path="/ingestion-runs/:id" element={<ProtectedRoute requiredRoles={MANAGERS}><IngestionRunDetailPage /></ProtectedRoute>} />

        {/* Configure (admin only) */}
        <Route path="/sources" element={<ProtectedRoute requiredRoles={ADMIN}><SourceListPage /></ProtectedRoute>} />
        <Route path="/sources/new" element={<ProtectedRoute requiredRoles={ADMIN}><SourceFormPage /></ProtectedRoute>} />
        <Route path="/sources/:id" element={<ProtectedRoute requiredRoles={ADMIN}><SourceDetailPage /></ProtectedRoute>} />
        <Route path="/sources/:id/edit" element={<ProtectedRoute requiredRoles={ADMIN}><SourceFormPage /></ProtectedRoute>} />
        <Route path="/rules" element={<ProtectedRoute requiredRoles={ADMIN}><RuleListPage /></ProtectedRoute>} />
        <Route path="/rules/new" element={<ProtectedRoute requiredRoles={ADMIN}><RuleFormPage /></ProtectedRoute>} />
        <Route path="/rules/:id" element={<ProtectedRoute requiredRoles={ADMIN}><RuleDetailPage /></ProtectedRoute>} />
        <Route path="/rules/:id/edit" element={<ProtectedRoute requiredRoles={ADMIN}><RuleFormPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute requiredRoles={ADMIN}><UserListPage /></ProtectedRoute>} />
        <Route path="/users/new" element={<ProtectedRoute requiredRoles={ADMIN}><UserFormPage /></ProtectedRoute>} />
        <Route path="/users/:id/edit" element={<ProtectedRoute requiredRoles={ADMIN}><UserFormPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute requiredRoles={ADMIN}><SettingsPage /></ProtectedRoute>} />

        {/* Govern (admin only) */}
        <Route path="/audit-log" element={<ProtectedRoute requiredRoles={ADMIN}><AuditLogPage /></ProtectedRoute>} />

        {/* Report (managers+) */}
        <Route path="/exports" element={<ProtectedRoute requiredRoles={MANAGERS}><ExportsPage /></ProtectedRoute>} />

        {/* Error pages */}
        <Route path="/access-denied" element={<AccessDeniedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}

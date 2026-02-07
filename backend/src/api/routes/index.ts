import type { FastifyInstance } from 'fastify';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import sourcesRoutes from './sources.routes.js';
import rulesRoutes from './rules.routes.js';
import ticketsRoutes from './tickets.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import auditRoutes from './audit.routes.js';
import settingsRoutes from './settings.routes.js';
import exportsRoutes from './exports.routes.js';
import ingestionRunsRoutes from './ingestion-runs.routes.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(sourcesRoutes, { prefix: '/api/sources' });
  await app.register(rulesRoutes, { prefix: '/api/rules' });
  await app.register(ticketsRoutes, { prefix: '/api/tickets' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(auditRoutes, { prefix: '/api/audit-events' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });
  await app.register(exportsRoutes, { prefix: '/api/exports' });
  await app.register(ingestionRunsRoutes, { prefix: '/api/ingestion-runs' });
}

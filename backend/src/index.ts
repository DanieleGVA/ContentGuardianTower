import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { PrismaClient } from '@prisma/client';
import PgBoss from 'pg-boss';
import authPlugin from './api/plugins/auth.plugin.js';
import errorHandlerPlugin from './api/plugins/error-handler.plugin.js';
import { registerRoutes } from './api/routes/index.js';
import { registerWorkerHandlers } from './worker/index.js';
import { startScheduler } from './worker/scheduler/index.js';

const prisma = new PrismaClient();

// Augment Fastify with shared decorators
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    boss: PgBoss;
    authenticate: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>;
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty' }
          : undefined,
    },
  });

  // Plugins
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  });
  await app.register(helmet);
  await app.register(sensible);
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'change_me_in_production',
    sign: { expiresIn: '24h' },
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Decorate with shared instances
  app.decorate('prisma', prisma);

  // Error handler & auth
  await app.register(errorHandlerPlugin);
  await app.register(authPlugin);

  // Register API routes
  await registerRoutes(app);

  // Health check - matches OpenAPI HealthResponse schema
  app.get('/health', async () => {
    let dbConnected = false;
    let dbLatencyMs: number | undefined;
    try {
      const start = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Math.round((performance.now() - start) * 10) / 10;
      dbConnected = true;
    } catch {
      // database unreachable
    }
    return {
      status: dbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbConnected,
        ...(dbLatencyMs !== undefined && { latencyMs: dbLatencyMs }),
      },
    };
  });

  return app;
}

async function startWorker() {
  const boss = new PgBoss(DATABASE_URL!);

  boss.on('error', (error) => {
    console.error('pgboss error:', error);
  });

  await boss.start();
  console.log('pgboss worker started');

  // Register job handlers (must await for pgboss v10 subscriptions)
  await registerWorkerHandlers(boss, prisma);

  return boss;
}

async function main() {
  const app = await buildApp();
  const boss = await startWorker();

  // Decorate app with boss so routes can send jobs
  app.decorate('boss', boss);

  // Start scheduler
  const schedulerInterval = startScheduler(prisma, boss);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    clearInterval(schedulerInterval);
    await boss.stop();
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    await app.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();

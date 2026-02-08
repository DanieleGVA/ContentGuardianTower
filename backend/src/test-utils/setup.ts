import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import authPlugin from '../api/plugins/auth.plugin.js';
import errorHandlerPlugin from '../api/plugins/error-handler.plugin.js';
import { registerRoutes } from '../api/routes/index.js';

// Re-declare Fastify augmentation needed for tests
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>;
  }
}

const prisma = new PrismaClient();

export async function buildTestApp(): Promise<{ app: FastifyInstance; prisma: PrismaClient }> {
  const app = Fastify({ logger: false });

  await app.register(cors);
  await app.register(helmet);
  await app.register(sensible);
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'test-jwt-secret',
    sign: { expiresIn: '24h' },
  });
  await app.register(rateLimit, { max: 1000, timeWindow: '1 minute' });

  app.decorate('prisma', prisma);

  await app.register(errorHandlerPlugin);
  await app.register(authPlugin);

  // registerRoutes is a plain async function, not a Fastify plugin
  await registerRoutes(app);

  await app.ready();

  return { app, prisma };
}

interface SeedUserOptions {
  username?: string;
  email?: string;
  fullName?: string;
  password?: string;
  role?: 'ADMIN' | 'GLOBAL_MANAGER' | 'REGIONAL_MANAGER' | 'LOCAL_MANAGER' | 'VIEWER';
  countryScopeType?: 'ALL' | 'LIST';
  countryCodes?: string[];
  isEnabled?: boolean;
}

export async function seedTestUser(
  prismaClient: PrismaClient,
  opts: SeedUserOptions = {},
) {
  const password = opts.password ?? 'testpass123';
  const username = opts.username ?? `testuser_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const passwordHash = await bcrypt.hash(password, 4); // low rounds for speed

  const user = await prismaClient.user.create({
    data: {
      username,
      email: opts.email ?? `${username}@test.local`,
      fullName: opts.fullName ?? `Test User ${username}`,
      passwordHash,
      role: opts.role ?? 'ADMIN',
      countryScopeType: opts.countryScopeType ?? 'ALL',
      countryCodes: opts.countryCodes ?? [],
      isEnabled: opts.isEnabled ?? true,
    },
  });

  return { user, password };
}

export async function loginAs(
  app: FastifyInstance,
  username: string,
  password: string,
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username, password },
  });

  if (res.statusCode !== 200) {
    throw new Error(`Login failed for ${username}: ${res.statusCode} ${res.body}`);
  }

  const body = JSON.parse(res.body);
  return body.token;
}

export function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

export async function cleanupDatabase(prismaClient: PrismaClient) {
  // Delete in FK-safe order
  await prismaClient.ticketEvent.deleteMany();
  await prismaClient.ticketComment.deleteMany();
  await prismaClient.ticketAttachment.deleteMany();
  await prismaClient.ticket.deleteMany();
  await prismaClient.analysisResult.deleteMany();
  await prismaClient.contentRevision.deleteMany();
  await prismaClient.contentItem.deleteMany();
  await prismaClient.ingestionItem.deleteMany();
  await prismaClient.ingestionRun.deleteMany();
  await prismaClient.ruleVersion.deleteMany();
  await prismaClient.rule.deleteMany();
  await prismaClient.source.deleteMany();
  await prismaClient.platformCredential.deleteMany();
  await prismaClient.auditEvent.deleteMany();
  await prismaClient.export.deleteMany();
  await prismaClient.user.deleteMany();
  // Don't delete systemSettings — seed them instead
}

export async function seedSystemSettings(prismaClient: PrismaClient) {
  await prismaClient.systemSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      allowedCountryCodes: ['IT', 'ES', 'DE', 'FR'],
      languageConfidenceThreshold: 0.8,
      defaultDueHoursHigh: 24,
      defaultDueHoursMedium: 72,
      defaultDueDaysLow: 7,
      uncertainDefaultRiskLevel: 'UNCERTAIN_MEDIUM',
      escalationAfterHours: 48,
      retentionDays: 180,
      piiRedactionEnabledDefault: true,
      llmProvider: 'openai',
      llmModel: 'gpt-4o',
      llmMaxTokens: 4096,
      exportMaxRows: 50000,
      maxRetriesPerStep: 3,
      defaultScheduleIntervalMinutes: 1440,
    },
  });
}

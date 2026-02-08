import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import {
  buildTestApp,
  seedTestUser,
  loginAs,
  authHeader,
  cleanupDatabase,
  seedSystemSettings,
} from '../../../test-utils/setup.js';

describe('Auth Routes', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const testApp = await buildTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanupDatabase(prisma);
    await seedSystemSettings(prisma);
  });

  // ============================================================
  // POST /api/auth/login
  // ============================================================
  describe('POST /api/auth/login', () => {
    it('should return token and user on successful login', async () => {
      const { user, password } = await seedTestUser(prisma);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: user.username, password },
      });

      expect(res.statusCode).toBe(200);

      const body = res.json();
      expect(body).toHaveProperty('token');
      expect(typeof body.token).toBe('string');
      expect(body.token.length).toBeGreaterThan(0);

      expect(body).toHaveProperty('user');
      expect(body.user).toMatchObject({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        countryScopeType: user.countryScopeType,
        countryCodes: user.countryCodes,
      });

      // Password hash must never be returned
      expect(body.user).not.toHaveProperty('passwordHash');
      expect(body.user).not.toHaveProperty('password_hash');
    });

    it('should return 401 with wrong password', async () => {
      const { user } = await seedTestUser(prisma);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: user.username, password: 'wrong_password_here' },
      });

      expect(res.statusCode).toBe(401);

      const body = res.json();
      expect(body).toHaveProperty('error', 'UNAUTHORIZED');
      expect(body).toHaveProperty('message', 'Invalid username or password');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'nonexistent_user_xyz', password: 'anypassword' },
      });

      expect(res.statusCode).toBe(401);

      const body = res.json();
      expect(body).toHaveProperty('error', 'UNAUTHORIZED');
      expect(body).toHaveProperty('message', 'Invalid username or password');
    });

    it('should return 401 for disabled user', async () => {
      const { user, password } = await seedTestUser(prisma, { isEnabled: false });

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: user.username, password },
      });

      expect(res.statusCode).toBe(401);

      const body = res.json();
      expect(body).toHaveProperty('error', 'UNAUTHORIZED');
      expect(body).toHaveProperty('message', 'Invalid username or password');
    });

    it('should return 400 with empty body (Zod validation)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {},
      });

      expect(res.statusCode).toBe(400);

      const body = res.json();
      expect(body).toHaveProperty('error', 'VALIDATION_ERROR');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('details');
      expect(Array.isArray(body.details)).toBe(true);
      expect(body.details.length).toBeGreaterThan(0);
    });

    it('should return 400 with missing username', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { password: 'somepassword' },
      });

      expect(res.statusCode).toBe(400);

      const body = res.json();
      expect(body).toHaveProperty('error', 'VALIDATION_ERROR');
    });

    it('should return 400 with missing password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'someuser' },
      });

      expect(res.statusCode).toBe(400);

      const body = res.json();
      expect(body).toHaveProperty('error', 'VALIDATION_ERROR');
    });

    it('should update lastLoginAt on successful login', async () => {
      const { user, password } = await seedTestUser(prisma);

      // Verify lastLoginAt is initially null
      const userBefore = await prisma.user.findUnique({ where: { id: user.id } });
      expect(userBefore?.lastLoginAt).toBeNull();

      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: user.username, password },
      });

      const userAfter = await prisma.user.findUnique({ where: { id: user.id } });
      expect(userAfter?.lastLoginAt).not.toBeNull();
      expect(userAfter?.lastLoginAt).toBeInstanceOf(Date);
    });

    it('should create LOGIN_SUCCESS audit event on successful login', async () => {
      const { user, password } = await seedTestUser(prisma);

      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: user.username, password },
      });

      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          eventType: 'LOGIN_SUCCESS',
          entityId: user.id,
        },
      });

      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0]).toMatchObject({
        eventType: 'LOGIN_SUCCESS',
        entityType: 'USER',
        entityId: user.id,
        actorType: 'USER',
        actorUserId: user.id,
      });
      expect(auditEvents[0]?.message).toContain(user.username);
    });

    it('should create LOGIN_FAILURE audit event on wrong password', async () => {
      const { user } = await seedTestUser(prisma);

      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: user.username, password: 'wrong_password' },
      });

      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          eventType: 'LOGIN_FAILURE',
          entityId: user.id,
        },
      });

      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0]).toMatchObject({
        eventType: 'LOGIN_FAILURE',
        entityType: 'USER',
        entityId: user.id,
        actorType: 'USER',
        actorUserId: user.id,
      });
      expect(auditEvents[0]?.message).toContain(user.username);
    });

    it('should create LOGIN_FAILURE audit event for non-existent user', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'ghost_user', password: 'any' },
      });

      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          eventType: 'LOGIN_FAILURE',
          entityId: 'unknown',
        },
      });

      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0]).toMatchObject({
        eventType: 'LOGIN_FAILURE',
        entityType: 'USER',
        entityId: 'unknown',
      });
      expect(auditEvents[0]?.message).toContain('ghost_user');
    });

    it('should create LOGIN_FAILURE audit event for disabled user', async () => {
      const { user, password } = await seedTestUser(prisma, { isEnabled: false });

      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: user.username, password },
      });

      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          eventType: 'LOGIN_FAILURE',
          entityId: user.id,
        },
      });

      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0]).toMatchObject({
        eventType: 'LOGIN_FAILURE',
        entityType: 'USER',
        entityId: user.id,
      });
    });
  });

  // ============================================================
  // GET /api/auth/me
  // ============================================================
  describe('GET /api/auth/me', () => {
    it('should return user profile when authenticated', async () => {
      const { user, password } = await seedTestUser(prisma);
      const token = await loginAs(app, user.username, password);

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: authHeader(token),
      });

      expect(res.statusCode).toBe(200);

      const body = res.json();
      expect(body).toMatchObject({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        countryScopeType: user.countryScopeType,
        countryCodes: user.countryCodes,
        isEnabled: true,
      });

      // Must include createdAt and lastLoginAt
      expect(body).toHaveProperty('createdAt');
      expect(body).toHaveProperty('lastLoginAt');

      // Password hash must never be returned
      expect(body).not.toHaveProperty('passwordHash');
      expect(body).not.toHaveProperty('password_hash');
    });

    it('should return 401 without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(res.statusCode).toBe(401);

      const body = res.json();
      expect(body).toHaveProperty('error', 'UNAUTHORIZED');
    });

    it('should return 401 with invalid token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: authHeader('invalid.jwt.token'),
      });

      expect(res.statusCode).toBe(401);

      const body = res.json();
      expect(body).toHaveProperty('error', 'UNAUTHORIZED');
    });

    it('should return 401 with malformed authorization header', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: 'NotBearer sometoken' },
      });

      expect(res.statusCode).toBe(401);

      const body = res.json();
      expect(body).toHaveProperty('error', 'UNAUTHORIZED');
    });

    it('should return correct data for different roles', async () => {
      const { user: adminUser, password: adminPassword } = await seedTestUser(prisma, {
        role: 'ADMIN',
        username: 'test_admin',
        email: 'test_admin@cgt.local',
      });

      const token = await loginAs(app, adminUser.username, adminPassword);

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: authHeader(token),
      });

      expect(res.statusCode).toBe(200);

      const body = res.json();
      expect(body.role).toBe('ADMIN');
    });
  });

  // ============================================================
  // POST /api/auth/logout
  // ============================================================
  describe('POST /api/auth/logout', () => {
    it('should return success when authenticated', async () => {
      const { user, password } = await seedTestUser(prisma);
      const token = await loginAs(app, user.username, password);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: authHeader(token),
      });

      expect(res.statusCode).toBe(200);

      const body = res.json();
      expect(body).toHaveProperty('message');
      expect(body.message).toBe('Logged out successfully');
    });

    it('should return 401 without token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });

      expect(res.statusCode).toBe(401);

      const body = res.json();
      expect(body).toHaveProperty('error', 'UNAUTHORIZED');
    });

    it('should create LOGOUT audit event', async () => {
      const { user, password } = await seedTestUser(prisma);
      const token = await loginAs(app, user.username, password);

      await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: authHeader(token),
      });

      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          eventType: 'LOGOUT',
          entityId: user.id,
        },
      });

      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0]).toMatchObject({
        eventType: 'LOGOUT',
        entityType: 'USER',
        entityId: user.id,
        actorType: 'USER',
        actorUserId: user.id,
      });
      expect(auditEvents[0]?.message).toContain(user.username);
    });
  });

  // ============================================================
  // POST /api/auth/refresh
  // ============================================================
  describe('POST /api/auth/refresh', () => {
    it('should return a new token when authenticated', async () => {
      const { user, password } = await seedTestUser(prisma);
      const token = await loginAs(app, user.username, password);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: authHeader(token),
      });

      expect(res.statusCode).toBe(200);

      const body = res.json();
      expect(body).toHaveProperty('token');
      expect(typeof body.token).toBe('string');
      expect(body.token.length).toBeGreaterThan(0);
    });

    it('should return a different token from the original', async () => {
      const { user, password } = await seedTestUser(prisma);
      const originalToken = await loginAs(app, user.username, password);

      // Small delay to ensure iat claim differs
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: authHeader(originalToken),
      });

      const body = res.json();
      expect(body.token).not.toBe(originalToken);
    });

    it('should return 401 without token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
      });

      expect(res.statusCode).toBe(401);

      const body = res.json();
      expect(body).toHaveProperty('error', 'UNAUTHORIZED');
    });

    it('should return 401 with invalid token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: authHeader('expired.or.invalid.jwt'),
      });

      expect(res.statusCode).toBe(401);

      const body = res.json();
      expect(body).toHaveProperty('error', 'UNAUTHORIZED');
    });

    it('should produce a token that works for authenticated requests', async () => {
      const { user, password } = await seedTestUser(prisma);
      const originalToken = await loginAs(app, user.username, password);

      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: authHeader(originalToken),
      });

      const { token: newToken } = refreshRes.json();

      // Use the refreshed token to call /me
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: authHeader(newToken),
      });

      expect(meRes.statusCode).toBe(200);

      const meBody = meRes.json();
      expect(meBody.id).toBe(user.id);
      expect(meBody.username).toBe(user.username);
    });
  });
});

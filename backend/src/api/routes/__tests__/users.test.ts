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

describe('Users Routes', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let adminToken: string;

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
    const { password: adminPwd } = await seedTestUser(prisma, {
      role: 'ADMIN',
      username: 'testadmin',
      email: 'testadmin@test.local',
      fullName: 'Test Admin',
    });
    adminToken = await loginAs(app, 'testadmin', adminPwd);
  });

  // ---------------------------------------------------------------
  // GET /api/users
  // ---------------------------------------------------------------
  describe('GET /api/users', () => {
    it('returns paginated list for admin', async () => {
      // Seed two additional users so we have 3 total (admin + 2)
      await seedTestUser(prisma, { username: 'user_a', email: 'a@test.local', role: 'VIEWER' });
      await seedTestUser(prisma, { username: 'user_b', email: 'b@test.local', role: 'GLOBAL_MANAGER' });

      const res = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: authHeader(adminToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(3);
      expect(body.meta.total).toBe(3);
      expect(body.meta.page).toBe(1);
      expect(body.meta.pageSize).toBe(20);
      expect(body.meta.totalPages).toBe(1);

      // Each user object should NOT contain passwordHash
      for (const user of body.data) {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('fullName');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('countryScopeType');
        expect(user).toHaveProperty('countryCodes');
        expect(user).toHaveProperty('isEnabled');
        expect(user).toHaveProperty('createdAt');
        expect(user).not.toHaveProperty('passwordHash');
      }
    });

    it('respects pagination query params', async () => {
      // Create 5 additional users (6 total including admin)
      for (let i = 0; i < 5; i++) {
        await seedTestUser(prisma, {
          username: `paguser_${i}`,
          email: `paguser_${i}@test.local`,
        });
      }

      const res = await app.inject({
        method: 'GET',
        url: '/api/users?page=2&pageSize=2',
        headers: authHeader(adminToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBe(2);
      expect(body.meta.page).toBe(2);
      expect(body.meta.pageSize).toBe(2);
      expect(body.meta.total).toBe(6);
      expect(body.meta.totalPages).toBe(3);
    });

    it('supports sortBy and sortOrder params', async () => {
      await seedTestUser(prisma, {
        username: 'aaa_first',
        email: 'aaa@test.local',
        role: 'VIEWER',
      });
      await seedTestUser(prisma, {
        username: 'zzz_last',
        email: 'zzz@test.local',
        role: 'VIEWER',
      });

      const resAsc = await app.inject({
        method: 'GET',
        url: '/api/users?sortBy=username&sortOrder=asc',
        headers: authHeader(adminToken),
      });

      expect(resAsc.statusCode).toBe(200);
      const bodyAsc = JSON.parse(resAsc.body);
      const usernamesAsc = bodyAsc.data.map((u: { username: string }) => u.username);
      expect(usernamesAsc[0]).toBe('aaa_first');

      const resDesc = await app.inject({
        method: 'GET',
        url: '/api/users?sortBy=username&sortOrder=desc',
        headers: authHeader(adminToken),
      });

      expect(resDesc.statusCode).toBe(200);
      const bodyDesc = JSON.parse(resDesc.body);
      const usernamesDesc = bodyDesc.data.map((u: { username: string }) => u.username);
      expect(usernamesDesc[0]).toBe('zzz_last');
    });

    it('returns 401 without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/users',
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('UNAUTHORIZED');
    });

    it('returns 403 for VIEWER role', async () => {
      const { password } = await seedTestUser(prisma, {
        username: 'vieweruser',
        email: 'viewer@test.local',
        role: 'VIEWER',
      });
      const viewerToken = await loginAs(app, 'vieweruser', password);

      const res = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: authHeader(viewerToken),
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('FORBIDDEN');
    });

    it('returns 403 for GLOBAL_MANAGER role', async () => {
      const { password } = await seedTestUser(prisma, {
        username: 'gmgr',
        email: 'gmgr@test.local',
        role: 'GLOBAL_MANAGER',
      });
      const mgrToken = await loginAs(app, 'gmgr', password);

      const res = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: authHeader(mgrToken),
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 403 for REGIONAL_MANAGER role', async () => {
      const { password } = await seedTestUser(prisma, {
        username: 'rmgr',
        email: 'rmgr@test.local',
        role: 'REGIONAL_MANAGER',
      });
      const mgrToken = await loginAs(app, 'rmgr', password);

      const res = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: authHeader(mgrToken),
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 403 for LOCAL_MANAGER role', async () => {
      const { password } = await seedTestUser(prisma, {
        username: 'lmgr',
        email: 'lmgr@test.local',
        role: 'LOCAL_MANAGER',
      });
      const mgrToken = await loginAs(app, 'lmgr', password);

      const res = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: authHeader(mgrToken),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ---------------------------------------------------------------
  // POST /api/users
  // ---------------------------------------------------------------
  describe('POST /api/users', () => {
    it('admin can create a user with all fields', async () => {
      const payload = {
        username: 'newuser',
        email: 'newuser@example.com',
        fullName: 'New User',
        password: 'SecurePass1!',
        role: 'REGIONAL_MANAGER',
        countryScopeType: 'LIST',
        countryCodes: ['IT', 'ES'],
        isEnabled: true,
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: authHeader(adminToken),
        payload,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.username).toBe('newuser');
      expect(body.email).toBe('newuser@example.com');
      expect(body.fullName).toBe('New User');
      expect(body.role).toBe('REGIONAL_MANAGER');
      expect(body.countryScopeType).toBe('LIST');
      expect(body.countryCodes).toEqual(['IT', 'ES']);
      expect(body.isEnabled).toBe(true);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('createdAt');
      // Must not expose password hash
      expect(body).not.toHaveProperty('passwordHash');
      expect(body).not.toHaveProperty('password');
    });

    it('admin can create user with minimal fields (defaults applied)', async () => {
      const payload = {
        username: 'minuser',
        email: 'minuser@example.com',
        fullName: 'Min User',
        password: 'SecurePass1!',
        role: 'VIEWER',
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: authHeader(adminToken),
        payload,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.username).toBe('minuser');
      expect(body.countryScopeType).toBe('ALL');
      expect(body.countryCodes).toEqual([]);
      expect(body.isEnabled).toBe(true);
    });

    it('returns 400 for missing required fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: authHeader(adminToken),
        payload: { username: 'no_email' },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: authHeader(adminToken),
        payload: {
          username: 'bademail',
          email: 'not-an-email',
          fullName: 'Bad Email',
          password: 'SecurePass1!',
          role: 'VIEWER',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for password too short', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: authHeader(adminToken),
        payload: {
          username: 'shortpwd',
          email: 'shortpwd@test.local',
          fullName: 'Short Pwd',
          password: 'abc',
          role: 'VIEWER',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid role value', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: authHeader(adminToken),
        payload: {
          username: 'badrole',
          email: 'badrole@test.local',
          fullName: 'Bad Role',
          password: 'SecurePass1!',
          role: 'SUPERADMIN',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for username too short', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: authHeader(adminToken),
        payload: {
          username: 'ab',
          email: 'short@test.local',
          fullName: 'Short Username',
          password: 'SecurePass1!',
          role: 'VIEWER',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 409 for duplicate username (Prisma P2002)', async () => {
      await seedTestUser(prisma, {
        username: 'dupeuser',
        email: 'dupeuser@test.local',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: authHeader(adminToken),
        payload: {
          username: 'dupeuser',
          email: 'other@test.local',
          fullName: 'Dupe User',
          password: 'SecurePass1!',
          role: 'VIEWER',
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('CONFLICT');
    });

    it('returns 409 for duplicate email (Prisma P2002)', async () => {
      await seedTestUser(prisma, {
        username: 'emailowner',
        email: 'taken@test.local',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: authHeader(adminToken),
        payload: {
          username: 'newusername',
          email: 'taken@test.local',
          fullName: 'Email Dupe',
          password: 'SecurePass1!',
          role: 'VIEWER',
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('CONFLICT');
    });

    it('creates USER_CREATED audit event', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: authHeader(adminToken),
        payload: {
          username: 'auditcreate',
          email: 'auditcreate@test.local',
          fullName: 'Audit Create',
          password: 'SecurePass1!',
          role: 'VIEWER',
        },
      });

      expect(res.statusCode).toBe(200);
      const createdUser = JSON.parse(res.body);

      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          eventType: 'USER_CREATED',
          entityId: createdUser.id,
        },
      });

      expect(auditEvents.length).toBe(1);
      expect(auditEvents[0].entityType).toBe('USER');
      expect(auditEvents[0].actorType).toBe('USER');
      expect(auditEvents[0].message).toContain('auditcreate');
      expect(auditEvents[0].message).toContain('testadmin');
    });

    it('hashes the password (newly created user can log in)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: authHeader(adminToken),
        payload: {
          username: 'loginable',
          email: 'loginable@test.local',
          fullName: 'Login Able',
          password: 'LoginPass99!',
          role: 'VIEWER',
        },
      });

      expect(res.statusCode).toBe(200);

      // The newly created user should be able to log in
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'loginable', password: 'LoginPass99!' },
      });

      expect(loginRes.statusCode).toBe(200);
      const loginBody = JSON.parse(loginRes.body);
      expect(loginBody).toHaveProperty('token');
    });

    it('returns 401 without token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          username: 'notoken',
          email: 'notoken@test.local',
          fullName: 'No Token',
          password: 'SecurePass1!',
          role: 'VIEWER',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 403 for non-admin role', async () => {
      const { password } = await seedTestUser(prisma, {
        username: 'viewer_post',
        email: 'vp@test.local',
        role: 'VIEWER',
      });
      const viewerToken = await loginAs(app, 'viewer_post', password);

      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: authHeader(viewerToken),
        payload: {
          username: 'shouldfail',
          email: 'shouldfail@test.local',
          fullName: 'Should Fail',
          password: 'SecurePass1!',
          role: 'VIEWER',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ---------------------------------------------------------------
  // GET /api/users/:id
  // ---------------------------------------------------------------
  describe('GET /api/users/:id', () => {
    it('returns user by id', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'getme',
        email: 'getme@test.local',
        fullName: 'Get Me',
        role: 'REGIONAL_MANAGER',
        countryScopeType: 'LIST',
        countryCodes: ['IT', 'DE'],
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/users/${targetUser.id}`,
        headers: authHeader(adminToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.id).toBe(targetUser.id);
      expect(body.username).toBe('getme');
      expect(body.email).toBe('getme@test.local');
      expect(body.fullName).toBe('Get Me');
      expect(body.role).toBe('REGIONAL_MANAGER');
      expect(body.countryScopeType).toBe('LIST');
      expect(body.countryCodes).toEqual(['IT', 'DE']);
      expect(body.isEnabled).toBe(true);
      expect(body).toHaveProperty('createdAt');
      expect(body).toHaveProperty('updatedAt');
      expect(body).not.toHaveProperty('passwordHash');
    });

    it('returns 404 for non-existent id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app.inject({
        method: 'GET',
        url: `/api/users/${fakeId}`,
        headers: authHeader(adminToken),
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('NOT_FOUND');
    });

    it('returns 401 without token', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'noauth_get',
        email: 'noauth_get@test.local',
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/users/${targetUser.id}`,
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 403 for non-admin role', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'target_getid',
        email: 'target_getid@test.local',
      });

      const { password } = await seedTestUser(prisma, {
        username: 'viewer_getid',
        email: 'viewer_getid@test.local',
        role: 'VIEWER',
      });
      const viewerToken = await loginAs(app, 'viewer_getid', password);

      const res = await app.inject({
        method: 'GET',
        url: `/api/users/${targetUser.id}`,
        headers: authHeader(viewerToken),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ---------------------------------------------------------------
  // PUT /api/users/:id
  // ---------------------------------------------------------------
  describe('PUT /api/users/:id', () => {
    it('admin can update user fields', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'toupdate',
        email: 'toupdate@test.local',
        fullName: 'To Update',
        role: 'VIEWER',
      });

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${targetUser.id}`,
        headers: authHeader(adminToken),
        payload: {
          fullName: 'Updated Name',
          email: 'updated@test.local',
          role: 'LOCAL_MANAGER',
          isEnabled: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.fullName).toBe('Updated Name');
      expect(body.email).toBe('updated@test.local');
      expect(body.role).toBe('LOCAL_MANAGER');
      expect(body.isEnabled).toBe(false);
      expect(body.id).toBe(targetUser.id);
      expect(body).not.toHaveProperty('passwordHash');
    });

    it('admin can update only countryScopeType and countryCodes', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'scope_update',
        email: 'scope_update@test.local',
        countryScopeType: 'ALL',
        countryCodes: [],
      });

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${targetUser.id}`,
        headers: authHeader(adminToken),
        payload: {
          countryScopeType: 'LIST',
          countryCodes: ['IT', 'FR'],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.countryScopeType).toBe('LIST');
      expect(body.countryCodes).toEqual(['IT', 'FR']);
    });

    it('update with empty body is accepted (no changes)', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'noop_update',
        email: 'noop_update@test.local',
      });

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${targetUser.id}`,
        headers: authHeader(adminToken),
        payload: {},
      });

      expect(res.statusCode).toBe(200);
    });

    it('returns 404 for non-existent user id (Prisma P2025)', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${fakeId}`,
        headers: authHeader(adminToken),
        payload: { fullName: 'Ghost' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('creates USER_UPDATED audit event with payload', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'audit_update',
        email: 'audit_update@test.local',
        fullName: 'Audit Update',
      });

      const updatePayload = { fullName: 'Audit Updated Name', role: 'GLOBAL_MANAGER' as const };

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${targetUser.id}`,
        headers: authHeader(adminToken),
        payload: updatePayload,
      });

      expect(res.statusCode).toBe(200);

      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          eventType: 'USER_UPDATED',
          entityId: targetUser.id,
        },
      });

      expect(auditEvents.length).toBe(1);
      expect(auditEvents[0].entityType).toBe('USER');
      expect(auditEvents[0].actorType).toBe('USER');
      expect(auditEvents[0].message).toContain('audit_update');
      expect(auditEvents[0].message).toContain('testadmin');
      // The payload should contain the update data
      const eventPayload = auditEvents[0].payload as Record<string, unknown>;
      expect(eventPayload.fullName).toBe('Audit Updated Name');
      expect(eventPayload.role).toBe('GLOBAL_MANAGER');
    });

    it('returns 401 without token', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'noauth_put',
        email: 'noauth_put@test.local',
      });

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${targetUser.id}`,
        payload: { fullName: 'No Auth' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 403 for non-admin role', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'target_put',
        email: 'target_put@test.local',
      });

      const { password } = await seedTestUser(prisma, {
        username: 'viewer_put',
        email: 'viewer_put@test.local',
        role: 'VIEWER',
      });
      const viewerToken = await loginAs(app, 'viewer_put', password);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${targetUser.id}`,
        headers: authHeader(viewerToken),
        payload: { fullName: 'Hacked' },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ---------------------------------------------------------------
  // PUT /api/users/:id/password
  // ---------------------------------------------------------------
  describe('PUT /api/users/:id/password', () => {
    it('admin can change a user password', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'pwdchange',
        email: 'pwdchange@test.local',
        password: 'OldPassword1!',
      });

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${targetUser.id}/password`,
        headers: authHeader(adminToken),
        payload: { newPassword: 'NewPassword99!' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.message).toBe('Password updated successfully');
    });

    it('new password works for login after change', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'pwdlogin',
        email: 'pwdlogin@test.local',
        password: 'OldPassword1!',
      });

      // Change password
      const changeRes = await app.inject({
        method: 'PUT',
        url: `/api/users/${targetUser.id}/password`,
        headers: authHeader(adminToken),
        payload: { newPassword: 'BrandNew123!' },
      });
      expect(changeRes.statusCode).toBe(200);

      // Old password should fail
      const oldLoginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'pwdlogin', password: 'OldPassword1!' },
      });
      expect(oldLoginRes.statusCode).toBe(401);

      // New password should succeed
      const newLoginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'pwdlogin', password: 'BrandNew123!' },
      });
      expect(newLoginRes.statusCode).toBe(200);
      const loginBody = JSON.parse(newLoginRes.body);
      expect(loginBody).toHaveProperty('token');
    });

    it('returns 400 for password too short', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'shortpwd_chg',
        email: 'shortpwd_chg@test.local',
      });

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${targetUser.id}/password`,
        headers: authHeader(adminToken),
        payload: { newPassword: 'abc' },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for missing newPassword field', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'nopwd_field',
        email: 'nopwd_field@test.local',
      });

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${targetUser.id}/password`,
        headers: authHeader(adminToken),
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 404 for non-existent user id (Prisma P2025)', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${fakeId}/password`,
        headers: authHeader(adminToken),
        payload: { newPassword: 'DoesNotMatter1!' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('creates USER_PASSWORD_CHANGED audit event', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'audit_pwd',
        email: 'audit_pwd@test.local',
      });

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${targetUser.id}/password`,
        headers: authHeader(adminToken),
        payload: { newPassword: 'AuditPass99!' },
      });

      expect(res.statusCode).toBe(200);

      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          eventType: 'USER_PASSWORD_CHANGED',
          entityId: targetUser.id,
        },
      });

      expect(auditEvents.length).toBe(1);
      expect(auditEvents[0].entityType).toBe('USER');
      expect(auditEvents[0].actorType).toBe('USER');
      expect(auditEvents[0].message).toContain(targetUser.id);
      expect(auditEvents[0].message).toContain('testadmin');
    });

    it('returns 401 without token', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'noauth_pwd',
        email: 'noauth_pwd@test.local',
      });

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${targetUser.id}/password`,
        payload: { newPassword: 'ShouldFail1!' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 403 for non-admin role', async () => {
      const { user: targetUser } = await seedTestUser(prisma, {
        username: 'target_pwd',
        email: 'target_pwd@test.local',
      });

      const { password } = await seedTestUser(prisma, {
        username: 'viewer_pwd',
        email: 'viewer_pwd@test.local',
        role: 'VIEWER',
      });
      const viewerToken = await loginAs(app, 'viewer_pwd', password);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${targetUser.id}/password`,
        headers: authHeader(viewerToken),
        payload: { newPassword: 'NotAllowed1!' },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ---------------------------------------------------------------
  // RBAC: all non-admin roles get 403 on every endpoint
  // ---------------------------------------------------------------
  describe('RBAC - non-admin roles are denied on all endpoints', () => {
    const nonAdminRoles: Array<{ role: 'GLOBAL_MANAGER' | 'REGIONAL_MANAGER' | 'LOCAL_MANAGER' | 'VIEWER'; label: string }> = [
      { role: 'GLOBAL_MANAGER', label: 'GLOBAL_MANAGER' },
      { role: 'REGIONAL_MANAGER', label: 'REGIONAL_MANAGER' },
      { role: 'LOCAL_MANAGER', label: 'LOCAL_MANAGER' },
      { role: 'VIEWER', label: 'VIEWER' },
    ];

    for (const { role, label } of nonAdminRoles) {
      describe(`${label} role`, () => {
        let roleToken: string;
        let targetUserId: string;

        beforeEach(async () => {
          // Create a user with this role
          const roleUsername = `rbac_${label.toLowerCase()}`;
          const { password } = await seedTestUser(prisma, {
            username: roleUsername,
            email: `${roleUsername}@test.local`,
            role,
          });
          roleToken = await loginAs(app, roleUsername, password);

          // Create a target user to operate on
          const { user: target } = await seedTestUser(prisma, {
            username: `rbac_target_${label.toLowerCase()}`,
            email: `rbac_target_${label.toLowerCase()}@test.local`,
          });
          targetUserId = target.id;
        });

        it(`GET /api/users returns 403`, async () => {
          const res = await app.inject({
            method: 'GET',
            url: '/api/users',
            headers: authHeader(roleToken),
          });
          expect(res.statusCode).toBe(403);
        });

        it(`POST /api/users returns 403`, async () => {
          const res = await app.inject({
            method: 'POST',
            url: '/api/users',
            headers: authHeader(roleToken),
            payload: {
              username: 'should_not_create',
              email: 'shouldnot@test.local',
              fullName: 'Should Not',
              password: 'SecurePass1!',
              role: 'VIEWER',
            },
          });
          expect(res.statusCode).toBe(403);
        });

        it(`GET /api/users/:id returns 403`, async () => {
          const res = await app.inject({
            method: 'GET',
            url: `/api/users/${targetUserId}`,
            headers: authHeader(roleToken),
          });
          expect(res.statusCode).toBe(403);
        });

        it(`PUT /api/users/:id returns 403`, async () => {
          const res = await app.inject({
            method: 'PUT',
            url: `/api/users/${targetUserId}`,
            headers: authHeader(roleToken),
            payload: { fullName: 'Hacked Name' },
          });
          expect(res.statusCode).toBe(403);
        });

        it(`PUT /api/users/:id/password returns 403`, async () => {
          const res = await app.inject({
            method: 'PUT',
            url: `/api/users/${targetUserId}/password`,
            headers: authHeader(roleToken),
            payload: { newPassword: 'HackedPass1!' },
          });
          expect(res.statusCode).toBe(403);
        });
      });
    }
  });
});

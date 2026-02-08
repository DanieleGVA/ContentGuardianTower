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

let app: FastifyInstance;
let prisma: PrismaClient;

beforeAll(async () => {
  const t = await buildTestApp();
  app = t.app;
  prisma = t.prisma;
});

afterAll(async () => {
  await app.close();
});

describe('Sources Routes', () => {
  let adminToken: string;

  beforeEach(async () => {
    await cleanupDatabase(prisma);
    await seedSystemSettings(prisma);

    const { user, password } = await seedTestUser(prisma, {
      role: 'ADMIN',
      countryScopeType: 'ALL',
    });
    adminToken = await loginAs(app, user.username, password);
  });

  // -------------------------------------------------------
  // GET /api/sources — list
  // -------------------------------------------------------

  it('GET /api/sources: list works for admin, returns paginated', async () => {
    // Seed two sources
    await prisma.source.createMany({
      data: [
        {
          platform: 'web',
          channel: 'WEB',
          sourceType: 'WEB_OWNED',
          countryCode: 'IT',
          identifier: 'https://example.it',
          displayName: 'Example IT',
        },
        {
          platform: 'web',
          channel: 'WEB',
          sourceType: 'WEB_OWNED',
          countryCode: 'ES',
          identifier: 'https://example.es',
          displayName: 'Example ES',
        },
      ],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/sources',
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(2);
    expect(body.meta).toBeDefined();
    expect(body.meta.total).toBe(2);
    expect(body.meta.page).toBe(1);
    expect(body.meta.pageSize).toBeGreaterThan(0);
    expect(body.meta.totalPages).toBe(1);
  });

  it('GET /api/sources: country-scoped user only sees their country sources', async () => {
    // Create sources in two different countries
    await prisma.source.createMany({
      data: [
        {
          platform: 'web',
          channel: 'WEB',
          sourceType: 'WEB_OWNED',
          countryCode: 'IT',
          identifier: 'https://it-only.example.com',
          displayName: 'Italy Source',
        },
        {
          platform: 'web',
          channel: 'WEB',
          sourceType: 'WEB_OWNED',
          countryCode: 'ES',
          identifier: 'https://es-only.example.com',
          displayName: 'Spain Source',
        },
      ],
    });

    // Create a user scoped to IT only
    const { user: itUser, password: itPass } = await seedTestUser(prisma, {
      role: 'LOCAL_MANAGER',
      countryScopeType: 'LIST',
      countryCodes: ['IT'],
    });
    const itToken = await loginAs(app, itUser.username, itPass);

    const res = await app.inject({
      method: 'GET',
      url: '/api/sources',
      headers: authHeader(itToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].countryCode).toBe('IT');
  });

  it('GET /api/sources: requires authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/sources',
    });

    expect(res.statusCode).toBe(401);
  });

  // -------------------------------------------------------
  // POST /api/sources — create
  // -------------------------------------------------------

  it('POST /api/sources: admin can create a source', async () => {
    const payload = {
      platform: 'web',
      channel: 'WEB',
      sourceType: 'WEB_OWNED',
      countryCode: 'IT',
      identifier: 'https://newsite.example.com',
      displayName: 'New Site',
      crawlFrequencyMinutes: 1440,
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/sources',
      headers: authHeader(adminToken),
      payload,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBeDefined();
    expect(body.displayName).toBe('New Site');
    expect(body.channel).toBe('WEB');
    expect(body.countryCode).toBe('IT');
    expect(body.isDeleted).toBe(false);
    expect(body.isEnabled).toBe(true);
  });

  it('POST /api/sources: non-admin gets 403', async () => {
    const { user: viewer, password: viewerPass } = await seedTestUser(prisma, {
      role: 'VIEWER',
      countryScopeType: 'ALL',
    });
    const viewerToken = await loginAs(app, viewer.username, viewerPass);

    const payload = {
      platform: 'web',
      channel: 'WEB',
      sourceType: 'WEB_OWNED',
      countryCode: 'IT',
      identifier: 'https://blocked.example.com',
      displayName: 'Blocked Source',
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/sources',
      headers: authHeader(viewerToken),
      payload,
    });

    expect(res.statusCode).toBe(403);
  });

  // -------------------------------------------------------
  // GET /api/sources/:id — detail
  // -------------------------------------------------------

  it('GET /api/sources/:id: returns source with credential info', async () => {
    const source = await prisma.source.create({
      data: {
        platform: 'web',
        channel: 'WEB',
        sourceType: 'WEB_OWNED',
        countryCode: 'IT',
        identifier: 'https://detail.example.com',
        displayName: 'Detail Test',
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/sources/${source.id}`,
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(source.id);
    expect(body.displayName).toBe('Detail Test');
    // credential field is included (null when no credential linked)
    expect(body).toHaveProperty('credential');
  });

  it('GET /api/sources/:id: 404 for non-existent source', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await app.inject({
      method: 'GET',
      url: `/api/sources/${fakeId}`,
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(404);
  });

  // -------------------------------------------------------
  // PUT /api/sources/:id — update
  // -------------------------------------------------------

  it('PUT /api/sources/:id: admin can update a source', async () => {
    const source = await prisma.source.create({
      data: {
        platform: 'web',
        channel: 'WEB',
        sourceType: 'WEB_OWNED',
        countryCode: 'IT',
        identifier: 'https://update.example.com',
        displayName: 'Before Update',
      },
    });

    const res = await app.inject({
      method: 'PUT',
      url: `/api/sources/${source.id}`,
      headers: authHeader(adminToken),
      payload: { displayName: 'After Update' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.displayName).toBe('After Update');
  });

  // -------------------------------------------------------
  // DELETE /api/sources/:id — soft delete
  // -------------------------------------------------------

  it('DELETE /api/sources/:id: soft deletes the source', async () => {
    const source = await prisma.source.create({
      data: {
        platform: 'web',
        channel: 'WEB',
        sourceType: 'WEB_OWNED',
        countryCode: 'IT',
        identifier: 'https://delete.example.com',
        displayName: 'To Delete',
      },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/sources/${source.id}`,
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.message).toBe('Source deleted');

    // Verify it is soft-deleted in DB
    const deleted = await prisma.source.findUnique({ where: { id: source.id } });
    expect(deleted).not.toBeNull();
    expect(deleted!.isDeleted).toBe(true);
    expect(deleted!.isEnabled).toBe(false);
    expect(deleted!.deletedAt).not.toBeNull();
  });

  it('DELETE /api/sources/:id: source disappears from list after delete', async () => {
    const source = await prisma.source.create({
      data: {
        platform: 'web',
        channel: 'WEB',
        sourceType: 'WEB_OWNED',
        countryCode: 'IT',
        identifier: 'https://vanish.example.com',
        displayName: 'Will Vanish',
      },
    });

    // Delete
    await app.inject({
      method: 'DELETE',
      url: `/api/sources/${source.id}`,
      headers: authHeader(adminToken),
    });

    // Verify it no longer appears in list
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/sources',
      headers: authHeader(adminToken),
    });

    const body = JSON.parse(listRes.body);
    const ids = body.data.map((s: { id: string }) => s.id);
    expect(ids).not.toContain(source.id);
  });

  // -------------------------------------------------------
  // POST /api/sources/:id/test-credential — stub
  // -------------------------------------------------------

  it('POST /api/sources/:id/test-credential: returns success stub', async () => {
    const source = await prisma.source.create({
      data: {
        platform: 'web',
        channel: 'WEB',
        sourceType: 'WEB_OWNED',
        countryCode: 'IT',
        identifier: 'https://cred-test.example.com',
        displayName: 'Cred Test',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/sources/${source.id}/test-credential`,
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('SUCCESS');
  });

  // -------------------------------------------------------
  // POST /api/sources/:id/trigger — manual ingestion
  // -------------------------------------------------------

  it('POST /api/sources/:id/trigger: works for managers', async () => {
    const source = await prisma.source.create({
      data: {
        platform: 'web',
        channel: 'WEB',
        sourceType: 'WEB_OWNED',
        countryCode: 'IT',
        identifier: 'https://trigger.example.com',
        displayName: 'Trigger Test',
        isEnabled: true,
      },
    });

    // Create a LOCAL_MANAGER with IT access
    const { user: manager, password: mgrPass } = await seedTestUser(prisma, {
      role: 'LOCAL_MANAGER',
      countryScopeType: 'LIST',
      countryCodes: ['IT'],
    });
    const mgrToken = await loginAs(app, manager.username, mgrPass);

    const res = await app.inject({
      method: 'POST',
      url: `/api/sources/${source.id}/trigger`,
      headers: authHeader(mgrToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.message).toBe('Ingestion run queued');
    expect(body.sourceId).toBe(source.id);
  });

  it('POST /api/sources/:id/trigger: viewer gets 403', async () => {
    const source = await prisma.source.create({
      data: {
        platform: 'web',
        channel: 'WEB',
        sourceType: 'WEB_OWNED',
        countryCode: 'IT',
        identifier: 'https://trigger-denied.example.com',
        displayName: 'Trigger Denied',
        isEnabled: true,
      },
    });

    const { user: viewer, password: viewerPass } = await seedTestUser(prisma, {
      role: 'VIEWER',
      countryScopeType: 'ALL',
    });
    const viewerToken = await loginAs(app, viewer.username, viewerPass);

    const res = await app.inject({
      method: 'POST',
      url: `/api/sources/${source.id}/trigger`,
      headers: authHeader(viewerToken),
    });

    expect(res.statusCode).toBe(403);
  });
});

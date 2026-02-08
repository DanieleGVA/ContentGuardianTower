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

describe('Rules Routes', () => {
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
  // POST /api/rules — create
  // -------------------------------------------------------

  it('POST /api/rules: admin can create a rule', async () => {
    const payload = {
      name: 'No misleading claims',
      type: 'CONTENT_QUALITY',
      severity: 'HIGH',
      applicableChannels: ['WEB'],
      applicableCountries: ['IT'],
      payload: { keywords: ['misleading', 'fake'], description: 'Content must not contain misleading claims' },
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/rules',
      headers: authHeader(adminToken),
      payload,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBeDefined();
    expect(body.name).toBe('No misleading claims');
    expect(body.severity).toBe('HIGH');
    expect(body.activeVersion).toBeDefined();
    expect(body.activeVersion.version).toBe(1);
  });

  it('POST /api/rules: non-admin gets 403', async () => {
    const { user: viewer, password: viewerPass } = await seedTestUser(prisma, {
      role: 'VIEWER',
      countryScopeType: 'ALL',
    });
    const viewerToken = await loginAs(app, viewer.username, viewerPass);

    const res = await app.inject({
      method: 'POST',
      url: '/api/rules',
      headers: authHeader(viewerToken),
      payload: {
        name: 'Test Rule',
        type: 'COMPLIANCE',
        severity: 'LOW',
        applicableChannels: ['WEB'],
        applicableCountries: ['IT'],
        payload: {},
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('POST /api/rules: requires authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/rules',
      payload: {
        name: 'Test Rule',
        type: 'COMPLIANCE',
        severity: 'LOW',
        applicableChannels: ['WEB'],
        applicableCountries: ['IT'],
        payload: {},
      },
    });

    expect(res.statusCode).toBe(401);
  });

  // -------------------------------------------------------
  // GET /api/rules — list
  // -------------------------------------------------------

  it('GET /api/rules: returns paginated list', async () => {
    // Create a rule
    await app.inject({
      method: 'POST',
      url: '/api/rules',
      headers: authHeader(adminToken),
      payload: {
        name: 'Rule Alpha',
        type: 'COMPLIANCE',
        severity: 'MEDIUM',
        applicableChannels: ['WEB'],
        applicableCountries: ['IT'],
        payload: { test: true },
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/rules',
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.meta).toBeDefined();
    expect(body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/rules: filter by severity', async () => {
    // Create two rules with different severity
    await app.inject({
      method: 'POST',
      url: '/api/rules',
      headers: authHeader(adminToken),
      payload: {
        name: 'High Rule',
        type: 'COMPLIANCE',
        severity: 'HIGH',
        applicableChannels: ['WEB'],
        applicableCountries: ['IT'],
        payload: {},
      },
    });
    await app.inject({
      method: 'POST',
      url: '/api/rules',
      headers: authHeader(adminToken),
      payload: {
        name: 'Low Rule',
        type: 'COMPLIANCE',
        severity: 'LOW',
        applicableChannels: ['WEB'],
        applicableCountries: ['IT'],
        payload: {},
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/rules?severity=HIGH',
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('High Rule');
  });

  // -------------------------------------------------------
  // GET /api/rules/:id — detail
  // -------------------------------------------------------

  it('GET /api/rules/:id: returns rule with active version', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/rules',
      headers: authHeader(adminToken),
      payload: {
        name: 'Detail Rule',
        type: 'COMPLIANCE',
        severity: 'MEDIUM',
        applicableChannels: ['WEB', 'FACEBOOK'],
        applicableCountries: ['IT', 'ES'],
        payload: { keywords: ['forbidden'] },
      },
    });
    const created = JSON.parse(createRes.body);

    const res = await app.inject({
      method: 'GET',
      url: `/api/rules/${created.id}`,
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(created.id);
    expect(body.name).toBe('Detail Rule');
    expect(body.activeVersion).toBeDefined();
    expect(body.createdBy).toBeDefined();
  });

  it('GET /api/rules/:id: 404 for non-existent rule', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/rules/00000000-0000-0000-0000-000000000000',
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(404);
  });

  // -------------------------------------------------------
  // PUT /api/rules/:id — update (creates new version)
  // -------------------------------------------------------

  it('PUT /api/rules/:id: creates a new version on update', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/rules',
      headers: authHeader(adminToken),
      payload: {
        name: 'Versioned Rule',
        type: 'COMPLIANCE',
        severity: 'LOW',
        applicableChannels: ['WEB'],
        applicableCountries: ['IT'],
        payload: { keywords: ['old'] },
      },
    });
    const created = JSON.parse(createRes.body);

    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/rules/${created.id}`,
      headers: authHeader(adminToken),
      payload: {
        severity: 'HIGH',
        payload: { keywords: ['new'] },
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updated = JSON.parse(updateRes.body);
    expect(updated.severity).toBe('HIGH');
    expect(updated.activeVersion.version).toBe(2);
  });

  // -------------------------------------------------------
  // GET /api/rules/:id/versions — version history
  // -------------------------------------------------------

  it('GET /api/rules/:id/versions: returns version list', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/rules',
      headers: authHeader(adminToken),
      payload: {
        name: 'Multi Version Rule',
        type: 'COMPLIANCE',
        severity: 'MEDIUM',
        applicableChannels: ['WEB'],
        applicableCountries: ['IT'],
        payload: { v: 1 },
      },
    });
    const created = JSON.parse(createRes.body);

    // Create second version
    await app.inject({
      method: 'PUT',
      url: `/api/rules/${created.id}`,
      headers: authHeader(adminToken),
      payload: { payload: { v: 2 } },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/rules/${created.id}/versions`,
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const versions = JSON.parse(res.body);
    expect(versions).toHaveLength(2);
    expect(versions[0].version).toBe(2); // Newest first
    expect(versions[1].version).toBe(1);
    // Exactly one should be active
    const activeVersions = versions.filter((v: { isActive: boolean }) => v.isActive);
    expect(activeVersions).toHaveLength(1);
  });

  // -------------------------------------------------------
  // POST /api/rules/:id/activate & /deactivate
  // -------------------------------------------------------

  it('POST /api/rules/:id/deactivate: deactivates a rule', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/rules',
      headers: authHeader(adminToken),
      payload: {
        name: 'Active Rule',
        type: 'COMPLIANCE',
        severity: 'LOW',
        applicableChannels: ['WEB'],
        applicableCountries: ['IT'],
        payload: {},
      },
    });
    const created = JSON.parse(createRes.body);

    const res = await app.inject({
      method: 'POST',
      url: `/api/rules/${created.id}/deactivate`,
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);

    // Verify rule is deactivated
    const rule = await prisma.rule.findUnique({ where: { id: created.id } });
    expect(rule!.isActive).toBe(false);
  });

  it('POST /api/rules/:id/activate: activates a rule', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/rules',
      headers: authHeader(adminToken),
      payload: {
        name: 'Inactive Rule',
        type: 'COMPLIANCE',
        severity: 'LOW',
        applicableChannels: ['WEB'],
        applicableCountries: ['IT'],
        payload: {},
      },
    });
    const created = JSON.parse(createRes.body);

    // Deactivate first
    await app.inject({
      method: 'POST',
      url: `/api/rules/${created.id}/deactivate`,
      headers: authHeader(adminToken),
    });

    // Now activate
    const res = await app.inject({
      method: 'POST',
      url: `/api/rules/${created.id}/activate`,
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);

    const rule = await prisma.rule.findUnique({ where: { id: created.id } });
    expect(rule!.isActive).toBe(true);
  });
});

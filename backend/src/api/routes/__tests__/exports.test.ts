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

describe('Exports Routes', () => {
  let adminToken: string;
  let adminUserId: string;

  beforeEach(async () => {
    await cleanupDatabase(prisma);
    await seedSystemSettings(prisma);

    const { user, password } = await seedTestUser(prisma, {
      role: 'ADMIN',
      countryScopeType: 'ALL',
    });
    adminUserId = user.id;
    adminToken = await loginAs(app, user.username, password);
  });

  // -------------------------------------------------------
  // POST /api/exports — create export
  // -------------------------------------------------------

  it('POST /api/exports: admin can create a TICKETS_CSV export', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/exports',
      headers: authHeader(adminToken),
      payload: { exportType: 'TICKETS_CSV' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBeDefined();
    expect(body.exportType).toBe('TICKETS_CSV');
    expect(body.status).toBe('QUEUED');
    expect(body.requestedByUserId).toBe(adminUserId);
  });

  it('POST /api/exports: admin can create an AUDIT_CSV export', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/exports',
      headers: authHeader(adminToken),
      payload: { exportType: 'AUDIT_CSV' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.exportType).toBe('AUDIT_CSV');
  });

  it('POST /api/exports: viewer gets 403', async () => {
    const { user: viewer, password: viewerPass } = await seedTestUser(prisma, {
      role: 'VIEWER',
      countryScopeType: 'ALL',
    });
    const viewerToken = await loginAs(app, viewer.username, viewerPass);

    const res = await app.inject({
      method: 'POST',
      url: '/api/exports',
      headers: authHeader(viewerToken),
      payload: { exportType: 'TICKETS_CSV' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('POST /api/exports: requires authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/exports',
      payload: { exportType: 'TICKETS_CSV' },
    });

    expect(res.statusCode).toBe(401);
  });

  // -------------------------------------------------------
  // GET /api/exports — list
  // -------------------------------------------------------

  it('GET /api/exports: lists exports for current user', async () => {
    // Create two exports
    await prisma.export.createMany({
      data: [
        { exportType: 'TICKETS_CSV', requestedByUserId: adminUserId },
        { exportType: 'AUDIT_CSV', requestedByUserId: adminUserId },
      ],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/exports',
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(2);
  });

  it('GET /api/exports: user only sees their own exports', async () => {
    // Create export for admin
    await prisma.export.create({
      data: { exportType: 'TICKETS_CSV', requestedByUserId: adminUserId },
    });

    // Create another user with their own export
    const { user: manager, password: mgrPass } = await seedTestUser(prisma, {
      role: 'LOCAL_MANAGER',
      countryScopeType: 'ALL',
    });
    await prisma.export.create({
      data: { exportType: 'TICKETS_CSV', requestedByUserId: manager.id },
    });

    const mgrToken = await loginAs(app, manager.username, mgrPass);

    const res = await app.inject({
      method: 'GET',
      url: '/api/exports',
      headers: authHeader(mgrToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].requestedByUserId).toBe(manager.id);
  });

  // -------------------------------------------------------
  // GET /api/exports/:id — detail
  // -------------------------------------------------------

  it('GET /api/exports/:id: returns export detail', async () => {
    const exp = await prisma.export.create({
      data: { exportType: 'TICKETS_CSV', requestedByUserId: adminUserId },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/exports/${exp.id}`,
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(exp.id);
    expect(body.exportType).toBe('TICKETS_CSV');
  });

  it('GET /api/exports/:id: 404 for non-existent export', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/exports/00000000-0000-0000-0000-000000000000',
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(404);
  });

  // -------------------------------------------------------
  // GET /api/exports/:id/download — download
  // -------------------------------------------------------

  it('GET /api/exports/:id/download: 422 when export not ready', async () => {
    const exp = await prisma.export.create({
      data: { exportType: 'TICKETS_CSV', requestedByUserId: adminUserId, status: 'QUEUED' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/exports/${exp.id}/download`,
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('EXPORT_NOT_READY');
  });

  it('GET /api/exports/:id/download: 403 when non-owner non-privileged user', async () => {
    const exp = await prisma.export.create({
      data: {
        exportType: 'TICKETS_CSV',
        requestedByUserId: adminUserId,
        status: 'SUCCEEDED',
        storageKey: '/tmp/fake-export.csv',
      },
    });

    // Create a local manager (not the owner)
    const { user: other, password: otherPass } = await seedTestUser(prisma, {
      role: 'LOCAL_MANAGER',
      countryScopeType: 'ALL',
    });
    const otherToken = await loginAs(app, other.username, otherPass);

    const res = await app.inject({
      method: 'GET',
      url: `/api/exports/${exp.id}/download`,
      headers: authHeader(otherToken),
    });

    expect(res.statusCode).toBe(403);
  });

  it('GET /api/exports/:id/download: 404 for non-existent export', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/exports/00000000-0000-0000-0000-000000000000/download',
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(404);
  });
});

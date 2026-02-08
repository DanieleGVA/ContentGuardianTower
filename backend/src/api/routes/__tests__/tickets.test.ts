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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedTestSource(
  p: PrismaClient,
  opts?: Partial<{ countryCode: string; channel: string }>,
) {
  return p.source.create({
    data: {
      displayName: `Test Source ${Date.now()}`,
      platform: 'web',
      channel: (opts?.channel ?? 'WEB') as never,
      sourceType: 'WEB_OWNED' as never,
      countryCode: opts?.countryCode ?? 'IT',
      identifier: `https://example-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.com`,
    },
  });
}

/**
 * Creates the full chain of dependent records (ContentItem -> ContentRevision -> AnalysisResult)
 * that a Ticket requires, then creates and returns the ticket.
 */
async function seedTestTicket(
  p: PrismaClient,
  sourceId: string,
  opts?: Partial<{
    status: string;
    riskLevel: string;
    countryCode: string;
    channel: string;
  }>,
) {
  const channel = (opts?.channel ?? 'WEB') as never;
  const countryCode = opts?.countryCode ?? 'IT';
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 1. ContentItem
  const contentItem = await p.contentItem.create({
    data: {
      channel,
      countryCode,
      sourceId,
      contentType: 'WEB_PAGE' as never,
      externalId: `ext_${uniqueSuffix}`,
      url: `https://example.com/page-${uniqueSuffix}`,
      lastSeenAt: new Date(),
    },
  });

  // 2. ContentRevision
  const revision = await p.contentRevision.create({
    data: {
      contentId: contentItem.id,
      revisionNumber: 1,
      normalizedTextHash: `hash_${uniqueSuffix}`,
      title: 'Test revision',
      mainText: 'Some test content for compliance check.',
      firstSeenOrModifiedAt: new Date(),
    },
  });

  // 3. AnalysisResult
  const analysis = await p.analysisResult.create({
    data: {
      contentId: contentItem.id,
      revisionId: revision.id,
      channel,
      countryCode,
      complianceStatus: 'NON_COMPLIANT' as never,
      violations: [],
    },
  });

  // 4. Ticket
  return p.ticket.create({
    data: {
      ticketKey: `test:${uniqueSuffix}`,
      contentId: contentItem.id,
      revisionId: revision.id,
      analysisId: analysis.id,
      sourceId,
      channel,
      countryCode,
      riskLevel: (opts?.riskLevel ?? 'HIGH') as never,
      status: (opts?.status ?? 'OPEN') as never,
      title: 'Test ticket',
      summary: 'Test summary',
      violatedRuleVersionIds: [],
      createdBy: 'SYSTEM',
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Tickets Routes', () => {
  let adminToken: string;
  let adminUser: { id: string; username: string };

  beforeEach(async () => {
    await cleanupDatabase(prisma);
    await seedSystemSettings(prisma);

    const { user, password } = await seedTestUser(prisma, {
      role: 'ADMIN',
      countryScopeType: 'ALL',
    });
    adminUser = user;
    adminToken = await loginAs(app, user.username, password);
  });

  // -------------------------------------------------------
  // GET /api/tickets — list
  // -------------------------------------------------------

  it('GET /api/tickets: returns paginated list', async () => {
    const source = await seedTestSource(prisma);
    await seedTestTicket(prisma, source.id);
    await seedTestTicket(prisma, source.id);

    const res = await app.inject({
      method: 'GET',
      url: '/api/tickets',
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(2);
    expect(body.meta).toBeDefined();
    expect(body.meta.total).toBe(2);
    expect(body.meta.page).toBe(1);
    expect(body.meta.totalPages).toBe(1);
  });

  it('GET /api/tickets: filters by status', async () => {
    const source = await seedTestSource(prisma);
    await seedTestTicket(prisma, source.id, { status: 'OPEN' });
    await seedTestTicket(prisma, source.id, { status: 'IN_PROGRESS' });
    await seedTestTicket(prisma, source.id, { status: 'OPEN' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/tickets?status=OPEN',
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(2);
    for (const t of body.data) {
      expect(t.status).toBe('OPEN');
    }
  });

  it('GET /api/tickets: filters by riskLevel', async () => {
    const source = await seedTestSource(prisma);
    await seedTestTicket(prisma, source.id, { riskLevel: 'HIGH' });
    await seedTestTicket(prisma, source.id, { riskLevel: 'LOW' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/tickets?riskLevel=HIGH',
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].riskLevel).toBe('HIGH');
  });

  it('GET /api/tickets: country-scoped (IT-only user does not see ES tickets)', async () => {
    const itSource = await seedTestSource(prisma, { countryCode: 'IT' });
    const esSource = await seedTestSource(prisma, { countryCode: 'ES' });

    await seedTestTicket(prisma, itSource.id, { countryCode: 'IT' });
    await seedTestTicket(prisma, esSource.id, { countryCode: 'ES' });

    // Create IT-scoped user
    const { user: itUser, password: itPass } = await seedTestUser(prisma, {
      role: 'LOCAL_MANAGER',
      countryScopeType: 'LIST',
      countryCodes: ['IT'],
    });
    const itToken = await loginAs(app, itUser.username, itPass);

    const res = await app.inject({
      method: 'GET',
      url: '/api/tickets',
      headers: authHeader(itToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].countryCode).toBe('IT');
  });

  // -------------------------------------------------------
  // GET /api/tickets/:id — detail
  // -------------------------------------------------------

  it('GET /api/tickets/:id: returns ticket detail with relations', async () => {
    const source = await seedTestSource(prisma);
    const ticket = await seedTestTicket(prisma, source.id);

    const res = await app.inject({
      method: 'GET',
      url: `/api/tickets/${ticket.id}`,
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(ticket.id);
    expect(body.title).toBe('Test ticket');
    expect(body.source).toBeDefined();
    expect(body.source.id).toBe(source.id);
    expect(body.events).toBeDefined();
    expect(body.comments).toBeDefined();
    expect(body.attachments).toBeDefined();
  });

  it('GET /api/tickets/:id: 404 for non-existent ticket', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await app.inject({
      method: 'GET',
      url: `/api/tickets/${fakeId}`,
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(404);
  });

  // -------------------------------------------------------
  // PUT /api/tickets/:id/status — transitions
  // -------------------------------------------------------

  it('PUT /api/tickets/:id/status: valid transition OPEN -> IN_PROGRESS', async () => {
    const source = await seedTestSource(prisma);
    const ticket = await seedTestTicket(prisma, source.id, { status: 'OPEN' });

    const res = await app.inject({
      method: 'PUT',
      url: `/api/tickets/${ticket.id}/status`,
      headers: authHeader(adminToken),
      payload: { status: 'IN_PROGRESS' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('IN_PROGRESS');
  });

  it('PUT /api/tickets/:id/status: invalid transition OPEN -> RESOLVED returns error', async () => {
    const source = await seedTestSource(prisma);
    const ticket = await seedTestTicket(prisma, source.id, { status: 'OPEN' });

    const res = await app.inject({
      method: 'PUT',
      url: `/api/tickets/${ticket.id}/status`,
      headers: authHeader(adminToken),
      payload: { status: 'RESOLVED' },
    });

    // OPEN -> RESOLVED is not in the VALID_TRANSITIONS map
    expect(res.statusCode).toBe(400);
  });

  it('PUT /api/tickets/:id/status: creates a ticket event', async () => {
    const source = await seedTestSource(prisma);
    const ticket = await seedTestTicket(prisma, source.id, { status: 'OPEN' });

    await app.inject({
      method: 'PUT',
      url: `/api/tickets/${ticket.id}/status`,
      headers: authHeader(adminToken),
      payload: { status: 'IN_PROGRESS' },
    });

    const events = await prisma.ticketEvent.findMany({
      where: { ticketId: ticket.id, eventType: 'STATUS_CHANGED' },
    });

    expect(events).toHaveLength(1);
    expect(events[0].fromStatus).toBe('OPEN');
    expect(events[0].toStatus).toBe('IN_PROGRESS');
  });

  // -------------------------------------------------------
  // PUT /api/tickets/:id/assign
  // -------------------------------------------------------

  it('PUT /api/tickets/:id/assign: assign to user', async () => {
    const source = await seedTestSource(prisma);
    const ticket = await seedTestTicket(prisma, source.id);

    const res = await app.inject({
      method: 'PUT',
      url: `/api/tickets/${ticket.id}/assign`,
      headers: authHeader(adminToken),
      payload: { assigneeUserId: adminUser.id },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.assigneeUserId).toBe(adminUser.id);
  });

  it('PUT /api/tickets/:id/assign: unassign (null)', async () => {
    const source = await seedTestSource(prisma);
    const ticket = await seedTestTicket(prisma, source.id);

    // First assign
    await app.inject({
      method: 'PUT',
      url: `/api/tickets/${ticket.id}/assign`,
      headers: authHeader(adminToken),
      payload: { assigneeUserId: adminUser.id },
    });

    // Then unassign
    const res = await app.inject({
      method: 'PUT',
      url: `/api/tickets/${ticket.id}/assign`,
      headers: authHeader(adminToken),
      payload: { assigneeUserId: null },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.assigneeUserId).toBeNull();
  });

  // -------------------------------------------------------
  // POST /api/tickets/:id/comments — add comment
  // -------------------------------------------------------

  it('POST /api/tickets/:id/comments: add comment', async () => {
    const source = await seedTestSource(prisma);
    const ticket = await seedTestTicket(prisma, source.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/tickets/${ticket.id}/comments`,
      headers: authHeader(adminToken),
      payload: { body: 'This is a test comment.' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.body).toBe('This is a test comment.');
    expect(body.author).toBeDefined();
    expect(body.author.id).toBe(adminUser.id);
  });

  // -------------------------------------------------------
  // GET /api/tickets/:id/comments — list comments
  // -------------------------------------------------------

  it('GET /api/tickets/:id/comments: list comments', async () => {
    const source = await seedTestSource(prisma);
    const ticket = await seedTestTicket(prisma, source.id);

    // Add two comments
    await app.inject({
      method: 'POST',
      url: `/api/tickets/${ticket.id}/comments`,
      headers: authHeader(adminToken),
      payload: { body: 'First comment' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/tickets/${ticket.id}/comments`,
      headers: authHeader(adminToken),
      payload: { body: 'Second comment' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/tickets/${ticket.id}/comments`,
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const comments = JSON.parse(res.body);
    expect(comments).toHaveLength(2);
    // Comments ordered desc, so second comment first
    expect(comments[0].body).toBe('Second comment');
    expect(comments[1].body).toBe('First comment');
    // Each comment includes author
    expect(comments[0].author).toBeDefined();
  });

  // -------------------------------------------------------
  // RBAC: Viewer cannot change status
  // -------------------------------------------------------

  it('Viewer cannot change ticket status (403)', async () => {
    const source = await seedTestSource(prisma);
    const ticket = await seedTestTicket(prisma, source.id, { status: 'OPEN' });

    const { user: viewer, password: viewerPass } = await seedTestUser(prisma, {
      role: 'VIEWER',
      countryScopeType: 'ALL',
    });
    const viewerToken = await loginAs(app, viewer.username, viewerPass);

    const res = await app.inject({
      method: 'PUT',
      url: `/api/tickets/${ticket.id}/status`,
      headers: authHeader(viewerToken),
      payload: { status: 'IN_PROGRESS' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('Viewer cannot assign tickets (403)', async () => {
    const source = await seedTestSource(prisma);
    const ticket = await seedTestTicket(prisma, source.id);

    const { user: viewer, password: viewerPass } = await seedTestUser(prisma, {
      role: 'VIEWER',
      countryScopeType: 'ALL',
    });
    const viewerToken = await loginAs(app, viewer.username, viewerPass);

    const res = await app.inject({
      method: 'PUT',
      url: `/api/tickets/${ticket.id}/assign`,
      headers: authHeader(viewerToken),
      payload: { assigneeUserId: adminUser.id },
    });

    expect(res.statusCode).toBe(403);
  });

  it('Viewer cannot add comments (403)', async () => {
    const source = await seedTestSource(prisma);
    const ticket = await seedTestTicket(prisma, source.id);

    const { user: viewer, password: viewerPass } = await seedTestUser(prisma, {
      role: 'VIEWER',
      countryScopeType: 'ALL',
    });
    const viewerToken = await loginAs(app, viewer.username, viewerPass);

    const res = await app.inject({
      method: 'POST',
      url: `/api/tickets/${ticket.id}/comments`,
      headers: authHeader(viewerToken),
      payload: { body: 'Should fail' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('Viewer CAN read ticket list and details', async () => {
    const source = await seedTestSource(prisma);
    const ticket = await seedTestTicket(prisma, source.id);

    const { user: viewer, password: viewerPass } = await seedTestUser(prisma, {
      role: 'VIEWER',
      countryScopeType: 'ALL',
    });
    const viewerToken = await loginAs(app, viewer.username, viewerPass);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/tickets',
      headers: authHeader(viewerToken),
    });
    expect(listRes.statusCode).toBe(200);

    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/tickets/${ticket.id}`,
      headers: authHeader(viewerToken),
    });
    expect(detailRes.statusCode).toBe(200);

    const commentsRes = await app.inject({
      method: 'GET',
      url: `/api/tickets/${ticket.id}/comments`,
      headers: authHeader(viewerToken),
    });
    expect(commentsRes.statusCode).toBe(200);
  });
});

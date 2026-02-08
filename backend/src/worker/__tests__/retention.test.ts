import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { runRetentionPurge } from '../scheduler/retention.js';
import { seedSystemSettings, cleanupDatabase } from '../../test-utils/setup.js';

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Retention Purge', () => {
  beforeEach(async () => {
    await cleanupDatabase(prisma);
    await seedSystemSettings(prisma);
  });

  it('deletes audit events older than retention period', async () => {
    // Create an old audit event (200 days ago)
    const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
    await prisma.auditEvent.create({
      data: {
        eventType: 'LOGIN_SUCCESS',
        entityType: 'USER',
        entityId: 'test-user',
        actorType: 'USER',
        message: 'Old login event',
        createdAt: oldDate,
      },
    });

    // Create a recent audit event (1 day ago)
    await prisma.auditEvent.create({
      data: {
        eventType: 'LOGIN_SUCCESS',
        entityType: 'USER',
        entityId: 'test-user',
        actorType: 'USER',
        message: 'Recent login event',
      },
    });

    const result = await runRetentionPurge(prisma);

    expect(result.auditEventsDeleted).toBe(1);

    // Recent event should still exist
    const remaining = await prisma.auditEvent.findMany({
      where: { eventType: { not: 'RETENTION_RUN' } },
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].message).toBe('Recent login event');
  });

  it('deletes old completed ingestion runs', async () => {
    const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);

    // Create a source first
    const source = await prisma.source.create({
      data: {
        platform: 'web',
        channel: 'WEB',
        sourceType: 'WEB_OWNED',
        countryCode: 'IT',
        identifier: 'https://retention-test.example.com',
        displayName: 'Retention Test Source',
      },
    });

    // Create an old succeeded run
    const oldRun = await prisma.ingestionRun.create({
      data: {
        runType: 'CRAWL',
        sourceId: source.id,
        channel: 'WEB',
        countryCode: 'IT',
        status: 'SUCCEEDED',
        completedAt: oldDate,
        startedAt: oldDate,
        steps: [],
      },
    });

    // Create an ingestion item for the old run
    await prisma.ingestionItem.create({
      data: {
        runId: oldRun.id,
        sourceId: source.id,
        channel: 'WEB',
        countryCode: 'IT',
        externalId: 'old-item',
        url: 'https://old.example.com',
        fetchStatus: 'OK',
      },
    });

    // Create a recent running run (should not be deleted)
    await prisma.ingestionRun.create({
      data: {
        runType: 'CRAWL',
        sourceId: source.id,
        channel: 'WEB',
        countryCode: 'IT',
        status: 'RUNNING',
        startedAt: new Date(),
        steps: [],
      },
    });

    const result = await runRetentionPurge(prisma);

    expect(result.ingestionRunsDeleted).toBe(1);

    // Recent run should still exist
    const remainingRuns = await prisma.ingestionRun.findMany();
    expect(remainingRuns).toHaveLength(1);
    expect(remainingRuns[0].status).toBe('RUNNING');

    // Old run's items should be deleted too
    const remainingItems = await prisma.ingestionItem.findMany({
      where: { runId: oldRun.id },
    });
    expect(remainingItems).toHaveLength(0);
  });

  it('skips execution if last RETENTION_RUN was less than 24h ago', async () => {
    // Create a recent RETENTION_RUN audit event
    await prisma.auditEvent.create({
      data: {
        eventType: 'RETENTION_RUN',
        entityType: 'SYSTEM_SETTINGS',
        entityId: 'default',
        actorType: 'SYSTEM',
        message: 'Previous retention run',
        createdAt: new Date(), // now
      },
    });

    // Create an old audit event that would normally be deleted
    const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
    await prisma.auditEvent.create({
      data: {
        eventType: 'LOGIN_SUCCESS',
        entityType: 'USER',
        entityId: 'test-user',
        actorType: 'USER',
        message: 'Should not be deleted',
        createdAt: oldDate,
      },
    });

    const result = await runRetentionPurge(prisma);

    expect(result.auditEventsDeleted).toBe(0);
    expect(result.ingestionRunsDeleted).toBe(0);
  });

  it('logs RETENTION_RUN audit event after execution', async () => {
    await runRetentionPurge(prisma);

    const retentionEvents = await prisma.auditEvent.findMany({
      where: { eventType: 'RETENTION_RUN' },
    });
    expect(retentionEvents).toHaveLength(1);
    expect(retentionEvents[0].actorType).toBe('SYSTEM');
    expect(retentionEvents[0].entityType).toBe('SYSTEM_SETTINGS');
  });

  it('does not delete RETENTION_RUN events themselves', async () => {
    // Create an old RETENTION_RUN event
    const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
    await prisma.auditEvent.create({
      data: {
        eventType: 'RETENTION_RUN',
        entityType: 'SYSTEM_SETTINGS',
        entityId: 'default',
        actorType: 'SYSTEM',
        message: 'Old retention run',
        createdAt: oldDate,
      },
    });

    await runRetentionPurge(prisma);

    // The old RETENTION_RUN should still exist (excluded from deletion)
    const retentionEvents = await prisma.auditEvent.findMany({
      where: { eventType: 'RETENTION_RUN' },
    });
    // 1 old + 1 new from this run
    expect(retentionEvents.length).toBeGreaterThanOrEqual(2);
  });
});

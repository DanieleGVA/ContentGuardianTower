import type { PrismaClient, Prisma } from '@prisma/client';
import type { IngestionStep } from '../../shared/types/index.js';
import type { PipelineContext, StepDefinition } from './types.js';
import { runStart } from './steps/run-start.js';
import { fetchItems } from './steps/fetch-items.js';
import { normalizeHash } from './steps/normalize-hash.js';
import { storeRevision } from './steps/store-revision.js';
import { diff } from './steps/diff.js';
import { analyzeLlm } from './steps/analyze-llm.js';
import { upsertTicket } from './steps/upsert-ticket.js';
import { runFinish } from './steps/run-finish.js';

const PIPELINE_STEPS: StepDefinition[] = [
  { name: 'RUN_START', execute: runStart },
  { name: 'FETCH_ITEMS', execute: fetchItems },
  { name: 'NORMALIZE_HASH', execute: normalizeHash },
  { name: 'STORE_REVISION', execute: storeRevision },
  { name: 'DIFF', execute: diff },
  { name: 'ANALYZE_LLM', execute: analyzeLlm },
  { name: 'UPSERT_TICKET', execute: upsertTicket },
  { name: 'RUN_FINISH', execute: runFinish },
];

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function getRetryDelay(attempt: number): number {
  const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * exponential * 0.3;
  return exponential + jitter;
}

async function isCancelled(prisma: PrismaClient, runId: string): Promise<boolean> {
  const run = await prisma.ingestionRun.findUnique({
    where: { id: runId },
    select: { cancelRequested: true },
  });
  return run?.cancelRequested ?? false;
}

function initializeSteps(): IngestionStep[] {
  return PIPELINE_STEPS.map((s) => ({
    name: s.name,
    status: 'PENDING' as const,
    attempts: 0,
  }));
}

async function updateStepInRun(
  prisma: PrismaClient,
  runId: string,
  stepIndex: number,
  update: Partial<IngestionStep>,
): Promise<void> {
  const run = await prisma.ingestionRun.findUnique({
    where: { id: runId },
    select: { steps: true },
  });
  const steps = (run?.steps as unknown as IngestionStep[]) ?? [];
  steps[stepIndex] = { ...steps[stepIndex], ...update };

  await prisma.ingestionRun.update({
    where: { id: runId },
    data: { steps: steps as unknown as Prisma.InputJsonValue },
  });
}

export async function executePipeline(
  prisma: PrismaClient,
  source: { id: string },
  runId: string,
): Promise<void> {
  const sourceData = await prisma.source.findUnique({ where: { id: source.id } });
  if (!sourceData) throw new Error(`Source ${source.id} not found`);

  const run = await prisma.ingestionRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error(`Run ${runId} not found`);

  // Initialize steps
  const steps = initializeSteps();
  await prisma.ingestionRun.update({
    where: { id: runId },
    data: { steps: steps as unknown as Prisma.InputJsonValue },
  });

  const ctx: PipelineContext = {
    prisma,
    source: sourceData,
    run,
    fetchedItems: [],
    normalizedItems: [],
    storedRevisions: [],
    changedRevisions: [],
    analysisResults: [],
    ticketsCreated: 0,
  };

  for (let i = 0; i < PIPELINE_STEPS.length; i++) {
    const step = PIPELINE_STEPS[i];

    // Check for cancellation between steps
    if (i > 0 && await isCancelled(prisma, runId)) {
      // Mark remaining steps as SKIPPED
      for (let j = i; j < PIPELINE_STEPS.length; j++) {
        await updateStepInRun(prisma, runId, j, { status: 'SKIPPED' });
      }
      await prisma.ingestionRun.update({
        where: { id: runId },
        data: { status: 'CANCELED', completedAt: new Date() },
      });
      return;
    }

    let lastError: string | undefined;
    let succeeded = false;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      await updateStepInRun(prisma, runId, i, {
        status: 'RUNNING',
        attempts: attempt + 1,
        startedAt: new Date().toISOString(),
      });

      try {
        await step.execute(ctx);
        await updateStepInRun(prisma, runId, i, {
          status: 'SUCCEEDED',
          completedAt: new Date().toISOString(),
        });
        succeeded = true;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        await updateStepInRun(prisma, runId, i, { lastError });

        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, getRetryDelay(attempt)));
        }
      }
    }

    if (!succeeded) {
      await updateStepInRun(prisma, runId, i, {
        status: 'FAILED',
        completedAt: new Date().toISOString(),
        lastError,
      });

      // Mark remaining steps as SKIPPED
      for (let j = i + 1; j < PIPELINE_STEPS.length; j++) {
        await updateStepInRun(prisma, runId, j, { status: 'SKIPPED' });
      }

      await prisma.ingestionRun.update({
        where: { id: runId },
        data: { status: 'FAILED', completedAt: new Date(), lastError },
      });
      return;
    }
  }
}

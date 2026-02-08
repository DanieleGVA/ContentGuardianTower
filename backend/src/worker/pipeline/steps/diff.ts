import type { PipelineContext } from '../types.js';

export async function diff(ctx: PipelineContext): Promise<void> {
  let changedCount = 0;

  for (const stored of ctx.storedRevisions) {
    if (stored.isNew) {
      // New items are always "changed"
      stored.isChanged = true;
      changedCount++;
      continue;
    }

    // Compare hash with previous revision
    const previousRevision = await ctx.prisma.contentRevision.findFirst({
      where: {
        contentId: stored.contentItem.id,
        revisionNumber: stored.revision.revisionNumber - 1,
      },
      select: { normalizedTextHash: true },
    });

    if (!previousRevision || previousRevision.normalizedTextHash !== stored.revision.normalizedTextHash) {
      stored.isChanged = true;
      changedCount++;
    }
  }

  ctx.changedRevisions = ctx.storedRevisions.filter((s) => s.isChanged);

  await ctx.prisma.ingestionRun.update({
    where: { id: ctx.run.id },
    data: { itemsChanged: changedCount },
  });
}

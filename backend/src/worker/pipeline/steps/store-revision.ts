import type { PipelineContext, StoredRevision } from '../types.js';

export async function storeRevision(ctx: PipelineContext): Promise<void> {
  const results: StoredRevision[] = [];

  for (const item of ctx.normalizedItems) {
    // Upsert ContentItem
    let contentItem = await ctx.prisma.contentItem.findUnique({
      where: {
        sourceId_externalId: {
          sourceId: ctx.source.id,
          externalId: item.externalId,
        },
      },
    });

    const isNewItem = !contentItem;

    if (!contentItem) {
      contentItem = await ctx.prisma.contentItem.create({
        data: {
          channel: ctx.source.channel,
          countryCode: ctx.source.countryCode,
          sourceId: ctx.source.id,
          contentType: ctx.source.channel === 'WEB' ? 'WEB_PAGE' : 'SOCIAL_POST',
          externalId: item.externalId,
          url: item.url,
          authorHandle: item.authorHandle,
          publishedAt: item.publishedAt,
          lastSeenAt: new Date(),
        },
      });
    } else {
      contentItem = await ctx.prisma.contentItem.update({
        where: { id: contentItem.id },
        data: { lastSeenAt: new Date() },
      });
    }

    // Get next revision number
    const latestRevision = await ctx.prisma.contentRevision.findFirst({
      where: { contentId: contentItem.id },
      orderBy: { revisionNumber: 'desc' },
    });
    const nextRevisionNumber = (latestRevision?.revisionNumber ?? 0) + 1;

    // Create revision
    const revision = await ctx.prisma.contentRevision.create({
      data: {
        contentId: contentItem.id,
        revisionNumber: nextRevisionNumber,
        normalizedTextHash: item.normalizedTextHash,
        title: item.title,
        mainText: item.mainText,
        caption: item.caption,
        description: item.description,
        tags: item.tags ?? [],
        commentText: item.commentText,
        ocrText: item.ocrText,
        transcript: item.transcript,
        firstSeenOrModifiedAt: new Date(),
      },
    });

    // Update current revision pointer
    await ctx.prisma.contentItem.update({
      where: { id: contentItem.id },
      data: { currentRevisionId: revision.id },
    });

    results.push({
      contentItem,
      revision,
      isNew: isNewItem,
      isChanged: false, // Will be determined in diff step
    });
  }

  ctx.storedRevisions = results;
}

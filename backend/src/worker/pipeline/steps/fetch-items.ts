import type { PipelineContext } from '../types.js';
import { getConnectorForSource } from '../../connectors/index.js';

export async function fetchItems(ctx: PipelineContext): Promise<void> {
  const connector = getConnectorForSource(ctx.source);
  const items = await connector.fetch(ctx.source);

  // Record fetched items in database
  for (const item of items) {
    await ctx.prisma.ingestionItem.create({
      data: {
        runId: ctx.run.id,
        sourceId: ctx.source.id,
        channel: ctx.source.channel,
        countryCode: ctx.source.countryCode,
        externalId: item.externalId,
        url: item.url,
        fetchStatus: 'OK',
      },
    });
  }

  ctx.fetchedItems = items;

  await ctx.prisma.ingestionRun.update({
    where: { id: ctx.run.id },
    data: { itemsFetched: items.length },
  });
}

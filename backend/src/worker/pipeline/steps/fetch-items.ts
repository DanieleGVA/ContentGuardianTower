import type { PipelineContext } from '../types.js';
import { WebConnector } from '../../connectors/web.connector.js';
import type { IConnector } from '../../connectors/base.connector.js';

function getConnector(sourceType: string): IConnector {
  switch (sourceType) {
    case 'WEB_OWNED':
    case 'WEB_SEARCH_DISCOVERY':
      return new WebConnector();
    default:
      throw new Error(`No connector available for source type '${sourceType}'`);
  }
}

export async function fetchItems(ctx: PipelineContext): Promise<void> {
  const connector = getConnector(ctx.source.sourceType);
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

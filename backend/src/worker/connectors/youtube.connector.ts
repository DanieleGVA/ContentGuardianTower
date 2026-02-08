import type { Source } from '@prisma/client';
import type { IConnector } from './base.connector.js';
import type { FetchedItem } from '../pipeline/types.js';

export class YouTubeConnector implements IConnector {
  async fetch(source: Source): Promise<FetchedItem[]> {
    console.log(`YouTubeConnector: fetch not yet implemented for source '${source.displayName}'`);
    return [];
  }
}

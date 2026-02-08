import type { Source } from '@prisma/client';
import type { IConnector } from './base.connector.js';
import type { FetchedItem } from '../pipeline/types.js';

export class FacebookConnector implements IConnector {
  async fetch(source: Source): Promise<FetchedItem[]> {
    console.log(`FacebookConnector: fetch not yet implemented for source '${source.displayName}'`);
    return [];
  }
}

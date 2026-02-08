import type { Source } from '@prisma/client';
import type { IConnector } from './base.connector.js';
import type { FetchedItem } from '../pipeline/types.js';

export class LinkedInConnector implements IConnector {
  async fetch(source: Source): Promise<FetchedItem[]> {
    console.log(`LinkedInConnector: fetch not yet implemented for source '${source.displayName}'`);
    return [];
  }
}

import type { Source } from '@prisma/client';
import type { FetchedItem } from '../pipeline/types.js';

export interface IConnector {
  fetch(source: Source): Promise<FetchedItem[]>;
}

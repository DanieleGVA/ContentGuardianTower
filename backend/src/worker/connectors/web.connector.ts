import type { Source } from '@prisma/client';
import type { IConnector } from './base.connector.js';
import type { FetchedItem } from '../pipeline/types.js';
import { parse } from 'node-html-parser';

const FETCH_TIMEOUT_MS = 30_000;

export class WebConnector implements IConnector {
  async fetch(source: Source): Promise<FetchedItem[]> {
    const urls = source.startUrls;
    if (!urls || urls.length === 0) {
      throw new Error(`Source '${source.displayName}' has no start URLs configured`);
    }

    const results: FetchedItem[] = [];

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'ContentGuardianTower/1.0' },
        });

        clearTimeout(timeout);

        if (!response.ok) {
          console.warn(`HTTP ${response.status} for ${url}`);
          continue;
        }

        const html = await response.text();
        const root = parse(html);

        // Extract text content
        const title = root.querySelector('title')?.text?.trim() ?? undefined;
        const metaDescription = root
          .querySelector('meta[name="description"]')
          ?.getAttribute('content')
          ?.trim();

        // Remove script/style tags before extracting text
        root.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
        const mainText = root.querySelector('body')?.text?.replace(/\s+/g, ' ')?.trim();

        results.push({
          externalId: url,
          url,
          title,
          mainText: mainText ?? undefined,
          description: metaDescription,
          rawHtml: html,
        });
      } catch (err) {
        console.error(`Failed to fetch ${url}:`, err instanceof Error ? err.message : err);
      }
    }

    return results;
  }
}

import crypto from 'node:crypto';
import type { PipelineContext } from '../types.js';

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

export async function normalizeHash(ctx: PipelineContext): Promise<void> {
  ctx.normalizedItems = ctx.fetchedItems.map((item) => {
    const textParts = [
      item.title ?? '',
      item.mainText ?? '',
      item.caption ?? '',
      item.description ?? '',
      item.commentText ?? '',
      item.ocrText ?? '',
      item.transcript ?? '',
    ].filter(Boolean);

    const normalizedText = normalizeText(textParts.join(' '));
    const normalizedTextHash = sha256(normalizedText);
    const contentKey = sha256(normalizedText + (item.url ?? item.externalId));

    return {
      ...item,
      normalizedTextHash,
      contentKey,
    };
  });
}

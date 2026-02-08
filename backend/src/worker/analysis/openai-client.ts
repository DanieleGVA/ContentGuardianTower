import OpenAI from 'openai';
import type { PrismaClient } from '@prisma/client';

let clientInstance: OpenAI | null = null;

export async function getOpenAIClient(prisma: PrismaClient): Promise<{ client: OpenAI; model: string; maxTokens: number }> {
  const settings = await prisma.systemSettings.findFirst({ where: { id: 'default' } });
  const apiKey = process.env.LLM_API_KEY;

  if (!apiKey) {
    throw new Error('LLM_API_KEY environment variable is not set');
  }

  if (!clientInstance) {
    clientInstance = new OpenAI({ apiKey });
  }

  return {
    client: clientInstance,
    model: settings?.llmModel ?? 'gpt-4o',
    maxTokens: settings?.llmMaxTokens ?? 4096,
  };
}

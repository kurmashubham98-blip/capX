import type { ContextCapsule, ContextCapsuleSummary, Message } from './types';

export function generateId(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4) ;
}

export function estimateMessageTokens(messages: Message[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}

export function toSummary(capsule: ContextCapsule): ContextCapsuleSummary {
  return {
    id: capsule.id,
    title: capsule.title,
    source: capsule.source,
    model: capsule.model,
    timestamp: capsule.timestamp,
    messageCount: capsule.messages.length,
    tags: capsule.tags,
  };
}

export function truncateMessages(
  messages: Message[],
  maxTokens: number
): { truncated: Message[]; removed: number } {
  let total = 0;
  const kept: Message[] = [];
  for (const msg of [...messages].reverse()) {
    const tokens = estimateTokens(msg.content);
    if (total + tokens > maxTokens) {
      const remainingTokens = maxTokens - total;
      if (remainingTokens > 20) {
        kept.unshift({
          ...msg,
          content: msg.content.slice(0, remainingTokens * 4) + '\n\n[...truncated]',
        });
      }
      break;
    }
    total += tokens;
    kept.unshift(msg);
  }
  return { truncated: kept, removed: messages.length - kept.length };
}

export function chunkMessages(
  messages: Message[],
  maxTokens: number
): Message[][] {
  const chunks: Message[][] = [];
  let current: Message[] = [];
  let currentTokens = 0;

  for (const msg of messages) {
    const tokens = estimateTokens(msg.content);
    if (currentTokens + tokens > maxTokens && current.length > 0) {
      chunks.push([...current]);
      current = [];
      currentTokens = 0;
    }
    current.push(msg);
    currentTokens += tokens;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

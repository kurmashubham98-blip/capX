import type { ContextCapsule, LongContextStrategy, Message } from '@capx/core';
import { truncateMessages, chunkMessages, generateId, now } from '@capx/core';

export class ContextEngine {
  formatAsMarkdown(capsule: ContextCapsule): string {
    const lines: string[] = [];
    lines.push(`# ${capsule.title}`);
    lines.push('');
    lines.push(`- **Source**: ${capsule.source}`);
    lines.push(`- **Model**: ${capsule.model}`);
    lines.push(`- **Date**: ${new Date(capsule.timestamp).toISOString()}`);
    lines.push(`- **Messages**: ${capsule.messages.length}`);
    if (capsule.tags.length > 0) {
      lines.push(`- **Tags**: ${capsule.tags.join(', ')}`);
    }
    if (capsule.metadata.url) {
      lines.push(`- **URL**: ${capsule.metadata.url}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    for (const msg of capsule.messages) {
      const roleLabel = msg.role === 'user' ? '👤 User' : msg.role === 'assistant' ? '🤖 Assistant' : '⚙️ System';
      lines.push(`### ${roleLabel}`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
      if (msg.files && msg.files.length > 0) {
        for (const file of msg.files) {
          lines.push(`> 📎 **File**: ${file.name} (${file.type})`);
        }
        lines.push('');
      }
      if (msg.images && msg.images.length > 0) {
        for (const img of msg.images) {
          lines.push(`> 🖼️ **Image**: ${img.alt}`);
          if (img.src) lines.push(`> ![${img.alt}](${img.src})`);
        }
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  formatAsJSON(capsule: ContextCapsule): string {
    return JSON.stringify(capsule, null, 2);
  }

  handleLongContext(
    capsule: ContextCapsule,
    maxTokens: number,
    strategy: LongContextStrategy,
  ): ContextCapsule[] {
    if (strategy === 'truncate-warn') {
      const { truncated, removed } = truncateMessages(capsule.messages, maxTokens);
      return [
        {
          ...capsule,
          messages: truncated,
          metadata: {
            ...capsule.metadata,
            tokenCount: maxTokens,
          },
          tags: [...capsule.tags, `truncated:${removed}msgs`],
        },
      ];
    }

    if (strategy === 'auto-chunk') {
      const chunks = chunkMessages(capsule.messages, maxTokens);
      return chunks.map((messages, i) => ({
        ...capsule,
        id: chunks.length > 1 ? `${capsule.id}_chunk${i + 1}` : capsule.id,
        title: chunks.length > 1 ? `${capsule.title} (${i + 1}/${chunks.length})` : capsule.title,
        messages,
        metadata: {
          ...capsule.metadata,
          tokenCount: maxTokens,
        },
        tags: chunks.length > 1 ? [...capsule.tags, `chunk:${i + 1}/${chunks.length}`] : capsule.tags,
      }));
    }

    return [capsule];
  }

  formatForCLI(capsule: ContextCapsule): string {
    const lines: string[] = [];
    lines.push('[CONTEXT CAPSULE]');
    lines.push(`Title: ${capsule.title}`);
    lines.push(`Source: ${capsule.source} / ${capsule.model}`);
    lines.push(`Date: ${new Date(capsule.timestamp).toISOString()}`);
    lines.push('');

    for (const msg of capsule.messages) {
      const prefix = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
      lines.push(`<|${prefix}|>`);
      lines.push(msg.content);
      if (msg.files && msg.files.length > 0) {
        lines.push(`[Attached files: ${msg.files.map((f) => f.name).join(', ')}]`);
      }
      if (msg.images && msg.images.length > 0) {
        lines.push(`[Images: ${msg.images.map((i) => i.alt).join(', ')}]`);
      }
      lines.push(`<|/${prefix}|>`);
      lines.push('');
    }

    return lines.join('\n');
  }

  toCapsule(
    source: ContextCapsule['source'],
    model: string,
    title: string,
    messages: Message[],
    metadata: Partial<ContextCapsule['metadata']> = {},
    tags: string[] = [],
  ): ContextCapsule {
    return {
      id: generateId(),
      title,
      source,
      model,
      timestamp: now(),
      messages,
      metadata: {
        url: metadata.url ?? '',
        files: metadata.files ?? [],
        images: metadata.images ?? [],
        tokenCount: metadata.tokenCount,
      },
      tags,
    };
  }
}

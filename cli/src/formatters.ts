import type { ContextCapsule } from '@capx/core';

export type FormatTarget = 'opencode' | 'claude-code' | 'gemini-cli' | 'stdin';

export interface FormattedOutput {
  text: string;
  command: string;
}

function buildHeader(capsule: ContextCapsule): string {
  const lines = [
    '┌─────────────────────────────────────────────┐',
    `│  CapX - Context Import                       │`,
    `│  Source: ${capsule.source.padEnd(34)}│`,
    `│  Model: ${capsule.model.padEnd(35)}│`,
    `│  Title: ${capsule.title.padEnd(35)}│`,
    `│  Date:  ${new Date(capsule.timestamp).toISOString().padEnd(35)}│`,
    `│  Messages: ${String(capsule.messages.length).padEnd(28)}│`,
    '└─────────────────────────────────────────────┘',
    '',
  ];
  return lines.join('\n');
}

function buildConversation(capsule: ContextCapsule): string {
  return capsule.messages
    .map((msg) => {
      const label = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
      let text = `## ${label}\n\n${msg.content}`;
      if (msg.files?.length) {
        text += `\n\n[Files: ${msg.files.map((f) => f.name).join(', ')}]`;
      }
      if (msg.images?.length) {
        text += `\n\n[Images: ${msg.images.map((i) => i.alt).join(', ')}]`;
      }
      return text;
    })
    .join('\n\n---\n\n');
}

export function formatForOpencode(capsule: ContextCapsule): FormattedOutput {
  const text = [
    buildHeader(capsule),
    'This conversation was imported from ' + capsule.source + '. Continue as if this context was part of the current session.\n',
    '---\n',
    buildConversation(capsule),
    '\n---\n',
    '[End of imported context. Please continue the conversation.]',
  ].join('\n');

  return { text, command: 'opencode' };
}

export function formatForClaudeCode(capsule: ContextCapsule): FormattedOutput {
  const text = [
    buildHeader(capsule),
    `<context_import>
source: ${capsule.source}
model: ${capsule.model}
title: ${capsule.title}
date: ${new Date(capsule.timestamp).toISOString()}
</context_import>`,
    '',
    '<conversation>',
    capsule.messages
      .map((msg) => {
        const tag = msg.role === 'user' ? 'user_message' : 'assistant_message';
        return `<${tag}>\n${msg.content}\n</${tag}>`;
      })
      .join('\n\n'),
    '</conversation>',
    '',
    '<instruction>Continue the conversation as if it happened in this Claude Code session.</instruction>',
  ].join('\n');

  return { text, command: 'claude' };
}

export function formatForGeminiCli(capsule: ContextCapsule): FormattedOutput {
  const text = [
    `[CONTEXT IMPORT]`,
    `Source: ${capsule.source} / ${capsule.model}`,
    `Title: ${capsule.title}`,
    `Messages: ${capsule.messages.length}`,
    '',
    buildConversation(capsule),
    '',
    '[END OF IMPORTED CONTEXT]',
  ].join('\n');

  return { text, command: 'gemini-cli' };
}

export function formatForStdin(capsule: ContextCapsule): FormattedOutput {
  const text = [
    `# Context imported from ${capsule.source} (${capsule.model})`,
    `# Title: ${capsule.title}`,
    `# Date: ${new Date(capsule.timestamp).toISOString()}`,
    '',
    ...capsule.messages.map((msg) => {
      const prefix = msg.role === 'user' ? '> **User**' : msg.role === 'assistant' ? '> **Assistant**' : '> **System**';
      return `${prefix}\n>\n> ${msg.content.replace(/\n/g, '\n> ')}`;
    }),
    '',
    '---',
    'Continue from the above context.',
  ].join('\n');

  return { text, command: '' };
}

export function format(capsule: ContextCapsule, target: FormatTarget): FormattedOutput {
  switch (target) {
    case 'opencode':
      return formatForOpencode(capsule);
    case 'claude-code':
      return formatForClaudeCode(capsule);
    case 'gemini-cli':
      return formatForGeminiCli(capsule);
    case 'stdin':
      return formatForStdin(capsule);
  }
}

export function resolveCommand(target: FormatTarget): string {
  switch (target) {
    case 'opencode':
      return 'opencode';
    case 'claude-code':
      return 'claude';
    case 'gemini-cli':
      return 'gemini-cli';
    case 'stdin':
      return '';
  }
}

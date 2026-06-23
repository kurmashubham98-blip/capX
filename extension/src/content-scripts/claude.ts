import type { Message } from '@capx/core';
import { generateId, now } from '@capx/core';
import { waitForElement, waitForElements, htmlToText, extractImages } from './shared/dom-utils';
import { showToast } from './shared/ui';
import { initPlatform } from './shared/message-handler';

const S = {
  container: '[data-testid="conversation"]',
  messages: '[data-testid="message"], .font-claude-message, article[data-testid^="message"]',
  userMsg: '[data-testid="user-message"], [data-message-role="user"]',
  assistMsg: '[data-testid="assistant-message"], [data-message-role="assistant"]',
  content: '.message-content, .prose, .whitespace-pre-wrap',
  input: '.ProseMirror, [contenteditable="true"], [role="textbox"]',
  send: 'button[aria-label*="Send"], button:has(svg)',
};

async function parse(): Promise<Message[]> {
  const els = await waitForElements(S.messages);
  const msgs: Message[] = [];
  for (const el of els) {
    let role: 'user' | 'assistant' | null = null;
    if (el.closest(S.userMsg) || el.getAttribute('data-message-role') === 'user') role = 'user';
    else if (el.closest(S.assistMsg) || el.getAttribute('data-message-role') === 'assistant') role = 'assistant';
    if (!role) continue;
    const contentEl = el.querySelector(S.content) || el;
    const content = htmlToText(contentEl);
    if (!content) continue;
    const images = extractImages(contentEl);
    const msg: Message = { id: generateId(), role, content, timestamp: now() };
    if (images.length) msg.images = images;
    msgs.push(msg);
  }
  return msgs;
}

async function inject(capsule: import('@capx/core').ContextCapsule): Promise<void> {
  const proseMirror = document.querySelector<HTMLElement>(S.input);
  if (!proseMirror) { showToast('Chat input not found'); return; }
  for (const msg of capsule.messages) {
    if (msg.role !== 'user') continue;
    proseMirror.focus();
    document.execCommand('insertText', false, msg.content);
    proseMirror.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(500);
    const btn = document.querySelector<HTMLButtonElement>(S.send);
    if (btn && !btn.disabled) { btn.click(); await sleep(2000); }
  }
}

export async function initClaude(): Promise<void> {
  await waitForElement(S.container);
  initPlatform({
    parseMessages: parse, injectMessages: inject,
    getTitle: () => document.title || 'Claude Conversation',
    getModel: () => 'Claude',
    getSource: () => 'claude',
  });
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

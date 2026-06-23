import type { Message } from '@capx/core';
import { generateId, now } from '@capx/core';
import { waitForElement, waitForElements, htmlToText, extractImages } from './shared/dom-utils';
import { simulateReactInput } from './shared/injector';
import { showToast } from './shared/ui';
import { initPlatform } from './shared/message-handler';

const S = {
  container: 'main',
  messages: 'article[data-message-author-role]',
  roleAttr: 'data-message-author-role',
  content: '[data-message-author-role] > div:last-child',
  input: 'textarea[placeholder*="Message"], textarea:not([type="hidden"])',
  send: 'button[data-testid="send-button"], button[aria-label*="Send"], button:has(svg)',
  title: 'h1, [data-testid="conversation-title"], main h1',
  model: '[data-testid="model-selector-button"]',
};

async function parse(): Promise<Message[]> {
  const els = await waitForElements(S.messages);
  const msgs: Message[] = [];
  for (const el of els) {
    const role = el.getAttribute(S.roleAttr);
    if (role !== 'user' && role !== 'assistant') continue;
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
  const input = document.querySelector<HTMLTextAreaElement>(S.input);
  if (!input) { showToast('Chat input not found'); return; }
  for (const msg of capsule.messages) {
    if (msg.role !== 'user') continue;
    simulateReactInput(input, msg.content);
    await sleep(200);
    const btn = document.querySelector<HTMLButtonElement>(S.send);
    if (btn && !btn.disabled) { btn.click(); await sleep(1500); }
  }
}

export async function initChatGPT(): Promise<void> {
  await waitForElement(S.messages);
  initPlatform({
    parseMessages: parse,
    injectMessages: inject,
    getTitle: () => document.querySelector(S.title)?.textContent?.trim() || document.title || 'ChatGPT Conversation',
    getModel: () => document.querySelector(S.model)?.textContent?.trim() || 'ChatGPT',
    getSource: () => 'chatgpt',
  });
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

import { defineBackground } from 'wxt/sandbox';
import type { CapXMessage } from '../messages';

export default defineBackground(() => {
  console.log('[CapX] Background service worker started');

  browser.runtime.onMessage.addListener((message: unknown, sender: { tab?: { id?: number } }) => {
    const msg = message as CapXMessage;

    if (msg.type === 'CAPX_CAPTURE' || msg.type === 'CAPX_INJECT' || msg.type === 'CAPX_GET_STATUS') {
      if (sender.tab?.id) {
        return browser.tabs.sendMessage(sender.tab.id, msg);
      }
    }

    if (
      msg.type === 'CAPX_CAPTURE_RESULT' ||
      msg.type === 'CAPX_CAPTURE_ERROR' ||
      msg.type === 'CAPX_INJECT_RESULT' ||
      msg.type === 'CAPX_INJECT_ERROR' ||
      msg.type === 'CAPX_STATUS' ||
      msg.type === 'CAPX_EXPORT_RESULT' ||
      msg.type === 'CAPX_EXPORT_ERROR'
    ) {
      return Promise.resolve(msg);
    }

    return undefined;
  });

  browser.contextMenus.create({
    id: 'capx-capture',
    title: 'Capture conversation with CapX',
    contexts: ['page'],
    documentUrlPatterns: [
      'https://chatgpt.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*',
      'https://perplexity.ai/*',
      'https://www.perplexity.ai/*',
      'https://grok.com/*',
      'https://x.com/i/grok*',
      'https://chat.deepseek.com/*',
      'https://chat.mistral.ai/*',
      'https://console.mistral.ai/*',
    ],
  });

  browser.contextMenus.create({
    id: 'capx-inject',
    title: 'Inject CapX capsule into this chat',
    contexts: ['page'],
    documentUrlPatterns: [
      'https://chatgpt.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*',
      'https://perplexity.ai/*',
      'https://www.perplexity.ai/*',
      'https://grok.com/*',
      'https://x.com/i/grok*',
      'https://chat.deepseek.com/*',
      'https://chat.mistral.ai/*',
      'https://console.mistral.ai/*',
    ],
  });

  browser.contextMenus.onClicked.addListener((info: { menuItemId: string | number }, tab?: { id?: number }) => {
    if (!tab?.id) return;
    if (info.menuItemId === 'capx-capture') {
      browser.tabs.sendMessage(tab.id, { type: 'CAPX_CAPTURE' } as CapXMessage);
    }
    if (info.menuItemId === 'capx-inject') {
      browser.tabs.sendMessage(tab.id, { type: 'CAPX_GET_STATUS' } as CapXMessage).catch(() => {});
    }
  });
});

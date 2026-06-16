import type { ContextCapsule, LongContextStrategy } from '@capx/core';

export type CapXMessage =
  | { type: 'CAPX_CAPTURE' }
  | { type: 'CAPX_CAPTURE_RESULT'; capsule: ContextCapsule }
  | { type: 'CAPX_CAPTURE_ERROR'; error: string }
  | { type: 'CAPX_INJECT'; capsuleId: string; strategy?: LongContextStrategy }
  | { type: 'CAPX_INJECT_RESULT'; success: boolean; message: string }
  | { type: 'CAPX_INJECT_ERROR'; error: string }
  | { type: 'CAPX_GET_STATUS' }
  | { type: 'CAPX_STATUS'; hasContent: boolean }
  | { type: 'CAPX_EXPORT'; capsuleId: string; format: 'json' | 'markdown' }
  | { type: 'CAPX_EXPORT_RESULT'; format: 'json' | 'markdown'; content: string }
  | { type: 'CAPX_EXPORT_ERROR'; error: string };

export function sendToActiveTab(msg: CapXMessage): Promise<unknown> {
  return browser.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs: { id?: number }[]) => {
      const tabId = tabs[0]?.id;
      if (!tabId) throw new Error('No active tab');
      return browser.tabs.sendMessage(tabId, msg);
    });
}

export function sendToRuntime(msg: CapXMessage): Promise<unknown> {
  return browser.runtime.sendMessage(msg);
}

export function onMessage(handler: (msg: CapXMessage) => void): () => void {
  const listener = (message: unknown, _sender: unknown, _sendResponse: (...args: unknown[]) => void) => {
    handler(message as CapXMessage);
  };
  browser.runtime.onMessage.addListener(listener);
  return () => browser.runtime.onMessage.removeListener(listener);
}

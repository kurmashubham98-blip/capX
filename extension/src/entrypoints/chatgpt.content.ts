import { defineContentScript } from 'wxt/sandbox';
import { initChatGPT } from '../content-scripts/chatgpt';

export default defineContentScript({
  matches: ['https://chatgpt.com/*'],
  main() {
    initChatGPT();
  },
});

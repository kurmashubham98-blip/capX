import { defineContentScript } from 'wxt/sandbox';
import { initClaude } from '../content-scripts/claude';

export default defineContentScript({
  matches: ['https://claude.ai/*'],
  main() {
    initClaude();
  },
});

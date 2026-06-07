# CapX — Context Transfer Hub

Transfer full context between AI chat platforms and CLI tools. A browser extension + CLI companion.

## Features

- **7 supported platforms**: ChatGPT, Claude, Gemini, Perplexity, Grok, DeepSeek, Mistral
- **Web → Web**: Capture context from one AI chat and inject into another
- **Web → CLI**: Export context and pipe into opencode, Claude Code, Gemini CLI, or any stdin-based tool
- **Full context preservation**: Messages, code blocks, images, file references
- **Long context handling**: Auto-chunking and truncation strategies
- **Cloud sync**: Optional Supabase sync for cross-device access
- **Local-first storage**: All data stored in IndexedDB, private by default
- **Open source**: MIT licensed

## Quick Start

### Browser Extension

1. Clone the repo
2. `pnpm install`
3. `cd extension && npx wxt build`
4. Load the `extension/.output/chrome-mv3` directory as an unpacked extension in Chrome

### CLI Tool

```bash
cd cli
pnpm build

# Format a capsule and pipe into a target CLI
node bin/main.js format opencode --file capsule.json | opencode

# Or inject directly (spawns the target CLI with context piped in)
node bin/main.js inject opencode --file capsule.json

# List capsules in a directory
node bin/main.js list ./capsules
```

## Usage

### Capturing Context

1. Open any supported AI chat platform
2. Click the blue **Capture Context** button (bottom-right corner)
3. Or right-click the page and select "Capture conversation with CapX"
4. The conversation is saved to your local capsule store

### Injecting Context

**Web to Web:**
1. Open the target AI chat platform
2. Click the purple **Inject Context** button
3. The last captured capsule will be replayed into the chat

**Via Popup:**
1. Click the CapX extension icon
2. Click "Inject" on any capsule in the list
3. It will be injected into the active tab's chat

### Exporting

Use the extension popup to download capsules as:
- **JSON** — Full structured data, ideal for re-import
- **Markdown** — Human-readable conversation transcript

### Cloud Sync

1. Create a free Supabase project
2. Create a `capsules` table with columns: `id`, `title`, `source`, `model`, `timestamp`, `messages`, `metadata`, `tags`, `updated_at`
3. Open the CapX popup → click the cloud icon → add your Supabase URL + anon key
4. Use **Push to Cloud** / **Pull from Cloud** to sync

## Project Structure

```
capx/
├── packages/capx-core/        # Shared types, schemas, utilities
├── extension/                  # WXT browser extension
│   └── src/
│       ├── entrypoints/        # Background, popup, content scripts
│       ├── content-scripts/    # Per-platform parsers + injectors
│       ├── storage/            # IndexedDB via Dexie.js
│       ├── engine/             # Context normalization and formatting
│       ├── sync/               # Cloud sync adapters
│       └── messages.ts         # Extension message protocol
├── cli/                       # CLI companion tool
│   └── src/
│       ├── main.ts             # CLI entry point
│       ├── formatters.ts       # Output formatters per target
│       └── utils.ts            # File I/O and helpers
└── LICENSE (MIT)
```

## Development

```bash
pnpm install
cd extension && npx wxt dev     # Dev mode with HMR
cd cli && pnpm dev -- args...   # Run CLI in dev mode
```

## License

MIT

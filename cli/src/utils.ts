import { readFileSync, existsSync, readdirSync } from 'node:fs';
import type { ContextCapsule } from '@capx/core';

export function readCapsuleFromFile(filePath: string): ContextCapsule {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as ContextCapsule;
}

export function readCapsuleFromStdin(): Promise<ContextCapsule> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data) as ContextCapsule);
      } catch (err) {
        reject(new Error('Failed to parse capsule JSON from stdin'));
      }
    });
    process.stdin.on('error', reject);
  });
}

export function* walkCapsuleFiles(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      yield `${dir}/${entry.name}`;
    }
  }
}

export function usage(): void {
  console.log(`
CapX CLI - Context Transfer Tool

USAGE:
  capx inject <target> [options]    Inject context into a CLI tool
  capx format <target> [options]    Format context to stdout
  capx list [dir]                   List capsules in a directory

TARGETS:
  opencode        Format for opencode CLI
  claude-code     Format for Claude Code
  gemini-cli      Format for Gemini CLI
  stdin           Generic text format to stdout

OPTIONS:
  --file <path>   Path to capsule JSON file
  --stdin         Read capsule from stdin
  --output <path> Write to file instead of stdout (format only)
  --help          Show this help

EXAMPLES:
  capx format opencode --file capsule.json | opencode
  capx inject opencode --file capsule.json
  capx list ./capsules
  cat capsule.json | capx format stdin --stdin
`);
}

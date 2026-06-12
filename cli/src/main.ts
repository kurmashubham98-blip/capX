#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import type { ContextCapsule } from '@capx/core';
import type { FormatTarget } from './formatters.js';
import { format, resolveCommand } from './formatters.js';
import { readCapsuleFromFile, readCapsuleFromStdin, walkCapsuleFiles, usage } from './utils.js';

const args = process.argv.slice(2);

async function main() {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    usage();
    process.exit(0);
  }

  const command = args[0];

  try {
    switch (command) {
      case 'inject':
        await injectCommand(args.slice(1));
        break;
      case 'format':
        await formatCommand(args.slice(1));
        break;
      case 'list':
        listCommand(args.slice(1));
        break;
      default:
        console.error(`Unknown command: ${command}`);
        usage();
        process.exit(1);
    }
  } catch (err) {
    console.error('[CapX] Error:', (err as Error).message);
    process.exit(1);
  }
}

async function injectCommand(args: string[]) {
  const target = args[0] as FormatTarget;
  if (!target || !['opencode', 'claude-code', 'gemini-cli', 'stdin'].includes(target)) {
    console.error('Usage: capx inject <target> [--file <path> | --stdin]');
    process.exit(1);
  }

  const fileIdx = args.indexOf('--file');
  const useStdin = args.includes('--stdin');

  let capsule: ContextCapsule;

  if (fileIdx !== -1 && args[fileIdx + 1]) {
    capsule = readCapsuleFromFile(args[fileIdx + 1]);
  } else if (useStdin) {
    capsule = await readCapsuleFromStdin();
  } else {
    console.error('Specify --file <path> or --stdin');
    process.exit(1);
    return;
  }

  const formatted = format(capsule, target);

  if (target === 'stdin') {
    process.stdout.write(formatted.text);
    return;
  }

  const cmd = resolveCommand(target);
  if (!cmd) {
    process.stdout.write(formatted.text);
    return;
  }

  console.error(`[CapX] Injecting into "${cmd}"...`);
  const child = spawn(cmd, [], {
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: true,
  });

  child.stdin.write(formatted.text + '\n');
  child.stdin.end();

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

async function formatCommand(args: string[]) {
  const target = args[0] as FormatTarget;
  if (!target || !['opencode', 'claude-code', 'gemini-cli', 'stdin'].includes(target)) {
    console.error('Usage: capx format <target> [--file <path> | --stdin] [--output <path>]');
    process.exit(1);
  }

  const fileIdx = args.indexOf('--file');
  const useStdin = args.includes('--stdin');
  const outputIdx = args.indexOf('--output');

  let capsule: ContextCapsule;

  if (fileIdx !== -1 && args[fileIdx + 1]) {
    capsule = readCapsuleFromFile(args[fileIdx + 1]);
  } else if (useStdin) {
    capsule = await readCapsuleFromStdin();
  } else {
    console.error('Specify --file <path> or --stdin');
    process.exit(1);
    return;
  }

  const formatted = format(capsule, target);
  const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : null;

  if (outputPath) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(outputPath, formatted.text, 'utf-8');
    console.error(`[CapX] Written to ${outputPath}`);
  } else {
    process.stdout.write(formatted.text);
  }
}

function listCommand(args: string[]) {
  const dir = args[0] || '.';
  let count = 0;
  for (const file of walkCapsuleFiles(dir)) {
    try {
      const raw = readFileSync(file, 'utf-8');
      const capsule = JSON.parse(raw) as ContextCapsule;
      console.log(
        `${capsule.source.padEnd(12)} ${capsule.model.padEnd(20)} ${String(capsule.messages.length).padEnd(4)}msgs  ${capsule.title.slice(0, 40).padEnd(40)}  ${file}`,
      );
      count++;
    } catch {
      // skip invalid files
    }
  }
  if (count === 0) {
    console.log(`No capsules found in ${dir}`);
  } else {
    console.log(`\n${count} capsule(s) found`);
  }
}

main();

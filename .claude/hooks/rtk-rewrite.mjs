#!/usr/bin/env node
/**
 * rtk-rewrite.mjs — RTK CLI Enforcement Hook
 *
 * Enforces RULE-EFF-001: all CLI commands use RTK prefix for token savings.
 * Triggered: PreToolUse / Bash
 *
 * Behavior:
 *   - Detects CLI commands that should be run through RTK
 *   - Checks if RTK is installed
 *   - Adds additionalContext nudging Claude to use `rtk <cmd>` instead
 *   - If RTK is not installed, adds installation instructions
 */

import { execSync } from 'child_process';

const RTK_COMMANDS = new Set([
  'git', 'npm', 'yarn', 'pnpm', 'npx',
  'ls', 'find', 'grep', 'cat', 'head', 'tail', 'wc',
  'curl', 'wget',
  'docker', 'docker-compose',
  'kubectl', 'helm',
  'make', 'cargo', 'go', 'python', 'pip',
  'mvn', 'gradle',
]);

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function isRtkInstalled() {
  try {
    execSync('which rtk', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const raw = await readStdin();
  let input;

  try {
    input = JSON.parse(raw);
  } catch {
    // Not valid JSON — pass through
    process.stdout.write(raw);
    return;
  }

  if (input.tool_name !== 'Bash' || !input.tool_input?.command) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const command = input.tool_input.command.trim();

  // Skip multi-line scripts and already-RTK commands
  if (command.startsWith('rtk ') || command.includes('\n')) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const firstWord = command.split(/[\s|;&]/)[0];

  if (!RTK_COMMANDS.has(firstWord)) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const rtkInstalled = isRtkInstalled();

  let context;
  if (!rtkInstalled) {
    context = [
      `⚠️  RTK CLI not installed — RULE-EFF-001 requires it for 60-90% token savings.`,
      `Install: npm install -g rtk  (or see scripts/setup.sh)`,
      `Once installed, run: rtk ${command}`,
    ].join('\n');
  } else {
    context = [
      `📌 RULE-EFF-001 (RTK): Use \`rtk ${command}\` instead of \`${command}\`.`,
      `RTK compresses output and saves tokens. Rewrite the Bash command with the rtk prefix.`,
    ].join('\n');
  }

  const output = {
    ...input,
    additionalContext: context,
  };

  process.stdout.write(JSON.stringify(output));
}

main().catch((err) => {
  process.stderr.write(`[rtk-rewrite] Hook error: ${err.message}\n`);
  // Don't block on hook failure — pass through
  process.exit(0);
});

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

let _rtkInstalledCache = null;

function isRtkInstalled() {
  if (_rtkInstalledCache !== null) return _rtkInstalledCache;
  try {
    execSync('which rtk', { stdio: 'ignore' });
    _rtkInstalledCache = true;
  } catch {
    _rtkInstalledCache = false;
  }
  return _rtkInstalledCache;
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

  // Skip multi-line scripts
  if (command.includes('\n')) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const rtkInstalled = isRtkInstalled();

  // If RTK is NOT installed and command starts with "rtk " → block (guaranteed to fail)
  if (!rtkInstalled && command.startsWith('rtk ')) {
    const bareCommand = command.replace(/^rtk\s+/, '');
    process.stderr.write(`⚠️ RTK is NOT installed. Use the command without the rtk prefix:\n  ${bareCommand}\n`);
    process.exit(2);
  }

  // If command already has rtk prefix and RTK is installed → pass through
  if (command.startsWith('rtk ')) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const firstWord = command.split(/[\s|;&]/)[0];

  if (!RTK_COMMANDS.has(firstWord)) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  // RTK is installed but command lacks prefix → suggest adding it
  if (rtkInstalled) {
    const context = `📌 RULE-EFF-001: Use \`rtk ${command}\` instead of \`${command}\`.`;
    const existing = input.additionalContext || '';
    const output = {
      ...input,
      additionalContext: existing ? `${existing}\n\n${context}` : context,
    };
    process.stdout.write(JSON.stringify(output));
    return;
  }

  // RTK not installed, command doesn't have prefix → pass through silently
  process.stdout.write(JSON.stringify(input));
}

main().catch((err) => {
  process.stderr.write(`[rtk-rewrite] Hook error: ${err.message}\n`);
  // Don't block on hook failure — pass through
  process.exit(0);
});

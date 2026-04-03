#!/usr/bin/env node
/**
 * docker-guard.mjs — Docker Runtime Check [AUTO RULE-DOCKER-001]
 *
 * Triggered: SessionStart
 * Checks: docker-compose.yml exists + Docker daemon is running
 * Hard-blocks (exit 2) when compose file exists and Docker is not running.
 * Advisory only when no compose file (new project — scaffold will create it).
 */

import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function dockerRunning() {
  try {
    execSync('docker info', { stdio: 'pipe', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

function composeFileExists() {
  return existsSync('docker-compose.yml') || existsSync('docker-compose.yaml') || existsSync('compose.yml');
}

async function main() {
  const raw = await readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.stdout.write(raw || '{}');
    return;
  }

  const lines = [];
  const hasCompose = composeFileExists();
  const isRunning = dockerRunning();

  if (hasCompose && !isRunning) {
    // Hard-block: project requires Docker (compose file exists) but daemon is not running.
    // Exit 2 prevents session context injection and signals a blocking condition.
    process.stderr.write(
      '⛔ RULE-DOCKER-001 [BLOCKED] — docker-compose.yml found but Docker is not running.\n' +
      'Start Docker Desktop (macOS/Windows) or run: sudo systemctl start docker (Linux)\n' +
      'Then retry. All services for this project MUST run in Docker containers.\n'
    );
    process.exit(2);
  }

  if (!isRunning && !hasCompose) {
    // Advisory: new project, no compose file yet. Warn but don't block.
    lines.push('');
    lines.push('⚠️  DOCKER NOT RUNNING — [RULE-DOCKER-001]');
    lines.push('No docker-compose.yml found yet (new project). Docker will be required once /scaffold runs.');
    lines.push('Start Docker before running /build or /scaffold.');
  } else if (hasCompose) {
    lines.push('');
    lines.push('🐳 Docker running. Services via docker-compose.');
    lines.push('  Start: rtk docker compose up -d');
    lines.push('  Stop:  rtk docker compose down');
    lines.push('  Logs:  rtk docker compose logs -f');
  }

  if (lines.length === 0) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const output = {
    ...input,
    additionalContext: (input.additionalContext || '') + lines.join('\n'),
  };

  process.stdout.write(JSON.stringify(output));
}

main().catch((err) => {
  process.stderr.write(`[docker-guard] Hook error: ${err.message}\n`);
  process.exit(0);
});

#!/usr/bin/env node
/**
 * qa-gate.mjs — QA Gate Enforcement [AUTO]
 *
 * Triggered: PreToolUse / Bash
 *
 * On every git commit in feature/* branches:
 *   1. Runs full Cypress E2E suite → hard blocks (exit 2) if ANY spec fails
 *
 * On final build commit (message contains "chore(build)"):
 *   2. Also requires .claude/browser-qa-report.md with 0 BLOCKER and 0 MAJOR
 *
 * Skips when:
 *   - Not a git commit command
 *   - Not on a feature/* branch
 *   - No Cypress specs exist in tests/e2e/
 *   - Cypress not installed in node_modules
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

async function readStdin() {
  var chunks = [];
  for await (var chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function getBranch() {
  try {
    return execSync('git branch --show-current', { stdio: 'pipe', timeout: 3000 }).toString().trim();
  } catch { return ''; }
}

function hasCypressSpecs() {
  var e2eDir = 'tests/e2e';
  if (!existsSync(e2eDir)) return false;
  try {
    return readdirSync(e2eDir).some(function(f) {
      return f.endsWith('.cy.ts') || f.endsWith('.cy.js');
    });
  } catch { return false; }
}

function cypressInstalled() {
  return existsSync('node_modules/.bin/cypress');
}

function runCypress() {
  try {
    execSync('npx cypress run', {
      stdio: 'pipe',
      timeout: 300000,
      env: Object.assign({}, process.env, { CI: '1' }),
    });
    return { pass: true, summary: '' };
  } catch (err) {
    var text = String(err.stdout || '') + '\n' + String(err.stderr || '');
    var lines = text.split('\n');
    var failures = lines.filter(function(l) {
      return /failing|failed|✗|✖|AssertionError|Error:|expected/i.test(l);
    }).slice(0, 20);
    return { pass: false, summary: failures.join('\n') || text.substring(0, 2000) };
  }
}

function checkBrowserQaReport() {
  var path = '.claude/browser-qa-report.md';
  if (!existsSync(path)) {
    return {
      pass: false,
      reason: 'Browser QA report not found at .claude/browser-qa-report.md\n'
            + 'Run /browser-qa http://localhost:[port] before the final commit.',
    };
  }

  var content = readFileSync(path, 'utf8');
  var blockerMatch = content.match(/BLOCKER[Ss]?\s*[\(:]\s*(\d+)/i);
  var majorMatch = content.match(/MAJOR[Ss]?\s*[\(:]\s*(\d+)/i);

  var blockers = blockerMatch ? parseInt(blockerMatch[1]) : -1;
  var majors = majorMatch ? parseInt(majorMatch[1]) : -1;

  if (blockers < 0 || majors < 0) {
    return {
      pass: false,
      reason: 'Browser QA report exists but BLOCKER/MAJOR counts not found.\n'
            + 'Re-run /browser-qa to generate a valid report.',
    };
  }

  if (blockers > 0 || majors > 0) {
    return {
      pass: false,
      reason: 'Browser QA report: ' + blockers + ' BLOCKER(s), ' + majors + ' MAJOR(s).\n'
            + 'Fix all issues and re-run /browser-qa until 0 BLOCKER and 0 MAJOR.',
    };
  }

  return { pass: true };
}

async function main() {
  var raw = await readStdin();
  var input;
  try { input = JSON.parse(raw); } catch { process.stdout.write(raw || '{}'); return; }

  if (input.tool_name !== 'Bash') {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  var command = input.tool_input?.command || '';

  // Only inspect git commit commands (with or without rtk prefix)
  if (!command.includes('git commit')) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  // Only enforce on feature branches
  var branch = getBranch();
  if (!branch.startsWith('feature/')) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  // Skip if no Cypress specs or Cypress not installed
  if (!hasCypressSpecs() || !cypressInstalled()) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  // ── Gate 1: Cypress E2E (every commit) ──────────────────────────────────────
  var cypress = runCypress();
  if (!cypress.pass) {
    process.stderr.write([
      '',
      '⛔ QA-GATE [BLOCKED] — Cypress E2E tests failed. Commit rejected.',
      '',
      cypress.summary,
      '',
      'Fix the failing specs and retry the commit.',
      '',
    ].join('\n'));
    process.exit(2);
  }

  // ── Gate 2: Browser QA report (final commit only) ───────────────────────────
  var isFinal = command.includes('chore(build)');

  if (isFinal) {
    var report = checkBrowserQaReport();
    if (!report.pass) {
      process.stderr.write([
        '',
        '⛔ QA-GATE [BLOCKED] — Browser QA required for final build commit.',
        '',
        report.reason,
        '',
        '/browser-qa must show 0 BLOCKER and 0 MAJOR before the final commit.',
        '',
      ].join('\n'));
      process.exit(2);
    }
  }

  // All gates passed
  process.stdout.write(JSON.stringify(input));
}

main().catch(function(err) {
  process.stderr.write('[qa-gate] Hook error: ' + err.message + '\n');
  process.exit(0);
});

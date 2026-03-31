#!/usr/bin/env node
/**
 * architecture-guard.mjs — Hexagonal Architecture Enforcement Hook
 *
 * Enforces RULE-ARCH-001 and RULE-ARCH-002.
 * Triggered: PreToolUse / Write | Edit
 *
 * Deterministic checks (hard block via exit 2):
 *   - Domain files importing known infrastructure packages (ORMs, HTTP clients, etc.)
 *   - Application files importing infrastructure packages directly
 *
 * Advisory checks (additionalContext):
 *   - Layer reminder with allowed import paths
 *   - TDD test file reminder
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Known infrastructure/framework packages that must NEVER appear in domain or application
const FORBIDDEN_IN_DOMAIN = [
  // ORMs and DB clients
  'prisma', '@prisma', 'typeorm', 'sequelize', 'mongoose', 'knex', 'mikro-orm',
  'pg', 'mysql2', 'better-sqlite3', 'ioredis', 'redis',
  'sqlalchemy', 'alembic', 'peewee',
  'gorm', 'database/sql',
  'hibernate', 'jpa',
  // HTTP clients
  'axios', 'node-fetch', 'got', 'ky', 'superagent',
  'requests', 'httpx', 'aiohttp',
  'net/http',
  // Frameworks
  'express', 'fastify', 'koa', 'hapi', '@nestjs',
  'fastapi', 'flask', 'django', 'starlette',
  'gin', 'echo', 'fiber',
  'spring',
  // Cloud / infrastructure
  'aws-sdk', '@aws-sdk', 'azure', '@azure', 'google-cloud',
  'stripe', 'paypal', 'sendgrid', '@sendgrid', 'nodemailer',
  'amqplib', 'kafkajs', 'bull',
];

// These are also forbidden in application layer (direct infra access)
const FORBIDDEN_IN_APPLICATION = [...FORBIDDEN_IN_DOMAIN];

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function loadArchConfig() {
  const configPath = resolve('.claude/architecture.json');
  if (!existsSync(configPath)) return null;
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }
}

function detectLayer(filePath, config) {
  if (!config) return null;
  for (const [layerName, layerDef] of Object.entries(config.layers)) {
    if (filePath.includes(layerDef.pattern)) {
      return { name: layerName, ...layerDef };
    }
  }
  return null;
}

function isTestFile(filePath, config) {
  const exts = config?.testExtensions || ['.test.ts', '.test.js', '.spec.ts', '.spec.js'];
  return exts.some(ext => filePath.endsWith(ext));
}

/**
 * Extract import sources from TypeScript/JavaScript/Python/Go content.
 * Returns array of imported module paths/names.
 */
function extractImports(content) {
  const found = new Set();

  // TypeScript/JavaScript: import ... from '...'
  const esImport = /^\s*import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/gm;
  let m;
  while ((m = esImport.exec(content)) !== null) found.add(m[1]);

  // CommonJS: require('...')
  const cjsRequire = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = cjsRequire.exec(content)) !== null) found.add(m[1]);

  // Python: import x, from x import y
  const pyImport = /^(?:import|from)\s+([\w.]+)/gm;
  while ((m = pyImport.exec(content)) !== null) found.add(m[1]);

  // Go: import "..." or "..."
  const goImport = /["']([a-z][a-z0-9._/\-]+)["']/g;
  while ((m = goImport.exec(content)) !== null) found.add(m[1]);

  return [...found];
}

/**
 * Find forbidden imports in content for a given layer.
 * Returns array of forbidden package names found.
 */
function findForbiddenImports(content, layerName) {
  const imports = extractImports(content);
  const forbiddenList = layerName === 'domain'
    ? FORBIDDEN_IN_DOMAIN
    : layerName === 'application'
      ? FORBIDDEN_IN_APPLICATION
      : [];

  if (!forbiddenList.length) return [];

  return imports.filter(imp => {
    // Only check external packages (not relative imports)
    if (imp.startsWith('.') || imp.startsWith('/')) return false;
    return forbiddenList.some(pkg => imp === pkg || imp.startsWith(pkg + '/') || imp.startsWith(pkg + '.'));
  });
}

async function main() {
  const raw = await readStdin();
  let input;

  try {
    input = JSON.parse(raw);
  } catch {
    process.stdout.write(raw);
    return;
  }

  const toolName = input.tool_name;
  if (toolName !== 'Write' && toolName !== 'Edit') {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const filePath = (input.tool_input?.file_path || '').replace(/\\/g, '/');
  if (!filePath) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const config = loadArchConfig();
  const layer = detectLayer(filePath, config);

  if (!layer) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  // ── DETERMINISTIC CHECK: scan imports in file content ─────────────────────
  const content = input.tool_input?.content || input.tool_input?.new_string || '';

  if (content && (layer.name === 'domain' || layer.name === 'application') && !isTestFile(filePath, config)) {
    const forbidden = findForbiddenImports(content, layer.name);

    if (forbidden.length > 0) {
      const ruleId = layer.name === 'domain' ? 'RULE-ARCH-001' : 'RULE-ARCH-002';
      const msg = [
        `🚫 ${ruleId} VIOLATION — Architecture guard blocked this write.`,
        ``,
        `File: ${filePath}`,
        `Layer: ${layer.name} — ${layer.description}`,
        ``,
        `Forbidden imports detected:`,
        ...forbidden.map(pkg => `  ❌ "${pkg}" must not be imported in the ${layer.name} layer`),
        ``,
        `Fix: remove these imports and inject the dependency via a port interface instead.`,
        `Example: inject UserRepository port in the constructor instead of importing Prisma directly.`,
        ``,
        `See /hexagonal for architecture guidance.`,
      ].join('\n');

      process.stderr.write(msg + '\n');
      process.exit(2); // Hard block
    }
  }

  // ── ADVISORY: layer reminder as additionalContext ─────────────────────────
  const lines = [
    `🏛️  ARCHITECTURE GUARD — Layer: \`${layer.name}\``,
    `${layer.description}`,
    ``,
  ];

  if (layer.allowedImportPrefixes && layer.allowedImportPrefixes.length > 0) {
    lines.push(`Allowed relative imports (from project src/):`);
    for (const prefix of layer.allowedImportPrefixes) {
      lines.push(`  ✅ ${prefix}`);
    }
    lines.push(`  ❌ Any infrastructure or framework package`);
  } else if (layer.name === 'domain') {
    lines.push(`⛔ RULE-ARCH-001: Zero external dependencies — no ORMs, HTTP clients, frameworks.`);
  } else if (layer.name === 'shared') {
    lines.push(`⚠️  No business logic — config, logging, utilities only.`);
  }

  if (!isTestFile(filePath, config) && filePath.includes('src/')) {
    const mappedTest = Object.entries(config?.testMapping || {}).find(([src]) =>
      filePath.includes(src)
    );
    if (mappedTest) {
      const testDir = mappedTest[1];
      const fileName = filePath.split('/').pop().replace(/\.(ts|js|py|go|java|rb)$/, '');
      lines.push(``);
      lines.push(`📋 TDD: Write test first → ${testDir}${fileName}.test.*`);
    }
  }

  const output = {
    ...input,
    additionalContext: lines.join('\n'),
  };

  process.stdout.write(JSON.stringify(output));
}

main().catch((err) => {
  process.stderr.write(`[architecture-guard] Hook error: ${err.message}\n`);
  process.exit(0); // Don't block on hook errors
});

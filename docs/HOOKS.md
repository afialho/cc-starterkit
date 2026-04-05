# Hooks — Enforcement Audit

## Summary

**8 hooks total. 4 deterministic (hard block via exit 2). 4 advisory (additionalContext injection).**

---

## How Claude Code Hooks Work

| Output | Effect | Deterministic? |
|--------|--------|----------------|
| `process.exit(2)` + stderr message | Blocks the tool call — action does NOT happen | Yes |
| JSON with `additionalContext` | Injects text into Claude's context | No — LLM may ignore |
| Pass-through (echo input) | Action proceeds normally | N/A |

---

## Hook Registry

### SessionStart hooks (startup | resume | clear | compact)

#### 1. `session-start.mjs` — Context Injection [ADVISORY]

| Aspect | Detail |
|--------|--------|
| **Trigger** | Every session start |
| **Type** | Advisory (additionalContext) |
| **What it does** | Injects: detected stack, testing stack, architecture pattern, checkpoint restoration, RTK/agent-browser status |
| **Also** | Cleans stale `qa-gate-attempts.json` when branch changed or file is stale (>24h) |

#### 2. `docker-guard.mjs` — Docker Enforcement [DETERMINISTIC + ADVISORY]

| Aspect | Detail |
|--------|--------|
| **Trigger** | Every session start |
| **Type** | Hard block (exit 2) when `docker-compose.yml` exists but Docker daemon is down |
| **Advisory** | Warning when Docker is not running but no compose file exists yet |

### PreToolUse / Bash hooks

#### 3. `rtk-rewrite.mjs` — RTK CLI Enforcement [ADVISORY]

| Aspect | Detail |
|--------|--------|
| **Trigger** | Any Bash command matching RTK-eligible commands (git, npm, docker, etc.) |
| **Type** | Advisory (additionalContext) |
| **When RTK installed** | Suggests `rtk <cmd>` if command lacks prefix |
| **When RTK NOT installed** | If command starts with `rtk `, warns to retry without prefix. At session start, injects "do not use rtk prefix" |

#### 4. `commit-guard.mjs` — Conventional Commits [DETERMINISTIC]

| Aspect | Detail |
|--------|--------|
| **Trigger** | `git commit` commands |
| **Hard blocks** | `--no-verify` flag (RULE-GIT-003) |
| **Hard blocks** | Non-Conventional Commits format on `-m` flag (RULE-GIT-002) |
| **Advisory** | Suggests worktrees for new branch creation |

#### 5. `qa-gate.mjs` — QA Gate on Commits [DETERMINISTIC]

| Aspect | Detail |
|--------|--------|
| **Trigger** | `git commit` on `feature/*` branches |
| **Gate 1** | Runs Cypress E2E suite — hard blocks if ANY spec fails |
| **Gate 2** | On `chore(build)` commits: runs agent-browser crawl — hard blocks on issues |
| **Gate 3** | Validates `.claude/browser-qa-report.md` has 0 BLOCKER/MAJOR/MINOR |
| **Retry** | Tracks attempts in `.claude/qa-gate-attempts.json`. After 3 failures: escalates to human |
| **Skips** | Not on feature/* branch, no Cypress specs, Cypress not installed |

### PreToolUse / Write|Edit hooks

#### 6. `architecture-guard.mjs` — Layer Enforcement [DETERMINISTIC]

| Aspect | Detail |
|--------|--------|
| **Trigger** | Write/Edit to files in src/ matching architecture layers |
| **Hard blocks** | Test files (`.test.*`, `.spec.*`) placed inside `src/` (RULE-ARCH-FILES) |
| **Hard blocks** | Forbidden imports (ORMs, HTTP clients, frameworks) in domain/application layers (RULE-ARCH-001, RULE-ARCH-002) |
| **Advisory** | Layer reminder for domain/application/ports files |
| **Skips advisory** | Infrastructure and shared layers (saves ~1k tokens) |

#### 7. `security-scan.mjs` — Security Enforcement [DETERMINISTIC]

| Aspect | Detail |
|--------|--------|
| **Trigger** | Write/Edit to any file |
| **Hard blocks** | Hardcoded API keys, passwords, tokens (SEC-CRIT-001/002/003 — skipped in test files) |
| **Hard blocks** | AWS keys (SEC-CRIT-004), private keys (SEC-CRIT-005), DB connection strings (SEC-CRIT-006) |
| **Hard blocks** | SQL injection via template literal or string concatenation |
| **Hard blocks** | `eval()` with non-literal argument |
| **Advisory** | innerHTML XSS risk, Math.random() in security context |

### PostToolUse / Write hooks

#### 8. `tdd-guard.mjs` — Test-First Reminder [ADVISORY]

| Aspect | Detail |
|--------|--------|
| **Trigger** | After writing an implementation file |
| **Type** | Advisory (additionalContext) |
| **What it does** | Warns if corresponding test file does not exist |
| **Does not block** | Because test and implementation may be created in the same session |

---

## Deterministic Guarantees

| Guarantee | Hook | Confidence |
|-----------|------|------------|
| No `--no-verify` on commits | commit-guard.mjs | 100% |
| Conventional Commits format | commit-guard.mjs | 100% |
| No test files in `src/` | architecture-guard.mjs | 100% |
| No forbidden imports in domain/application | architecture-guard.mjs | 100% |
| No hardcoded secrets | security-scan.mjs | 100% |
| No SQL injection patterns | security-scan.mjs | 100% |
| Cypress must pass before commit | qa-gate.mjs | 100% |
| Browser crawl clean before final commit | qa-gate.mjs | 100% |
| Docker must be running (if compose exists) | docker-guard.mjs | 100% |

## Advisory Influence

| Behavior | Hook | Confidence |
|----------|------|------------|
| RTK prefix usage | rtk-rewrite.mjs | ~90% |
| TDD (test before implementation) | tdd-guard.mjs | ~80% |
| Architecture layer awareness | architecture-guard.mjs | ~85% |
| XSS prevention (innerHTML) | security-scan.mjs | ~85% |

## Complementary Guarantees

Hooks are one layer. Full coverage requires:

1. **Pre-commit git hooks** (Husky/Lefthook): lint, format, architecture check — 100% deterministic
2. **CI pipeline**: full test suite — 100% deterministic
3. **Code review**: `/code-review` skill or human — catches logic issues

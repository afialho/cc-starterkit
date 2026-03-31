# AI Development Starter Kit

Stack-agnostic boilerplate for teams using Claude Code.
Pre-configured for clean architecture, TDD, BDD, and autonomous AI agent teams.

## What's Included

### Core Configuration (auto-loaded by Claude Code)
| File | Purpose |
|------|---------|
| `CLAUDE.md` | Main AI instructions — principles, RTK, worktrees, testing, agent mode |
| `Agents.md` | Autonomous agent orchestration protocol |
| `Rules.md` | Project constraints (human-readable + machine-enforced) |

### Hooks (Deterministic Enforcement via `.claude/settings.json`)
| Hook | Trigger | Enforces |
|------|---------|---------|
| `rtk-rewrite` | Every Bash command | RULE-EFF-001: RTK CLI usage |
| `architecture-guard` | Write/Edit files | RULE-ARCH-001/002: Hexagonal layers |
| `tdd-guard` | After writing source files | RULE-TEST-001: TDD — test first |
| `rules-engine` | All tool calls | Hard rules from Rules.md |
| `session-start` | Session startup/resume | Injects project context |

### Skills (Slash Commands)
| Command | Purpose |
|---------|---------|
| `/plan` | Generate structured development plan with BDD scenarios and agent breakdown |
| `/feature-dev` | Full TDD + hexagonal implementation with autonomous agent teams |
| `/frontend-design` | Production-grade UI design and implementation |
| `/tdd` | Red-Green-Refactor workflow guidance |
| `/hexagonal` | Hexagonal architecture reference and validation |

### Testing Stack
| Layer | Tool | Location |
|-------|------|----------|
| Unit & Integration | Framework-native | `tests/unit/`, `tests/integration/` |
| BDD | Cucumber.js | `tests/bdd/features/*.feature` |
| E2E | Cypress | `tests/e2e/` |
| Load & Stress | k6 | `tests/load/` |

### Documentation
| File | Contents |
|------|---------|
| `docs/USAGE.md` | **Comece aqui** — guia completo com exemplo E2E de ponta a ponta |
| `docs/HOOKS.md` | O que é determinístico nos hooks e o que não é (honesto) |
| `docs/ARCHITECTURE.md` | Hexagonal architecture guide with examples |
| `docs/TESTING.md` | Full testing strategy — unit, integration, BDD, E2E, load |
| `docs/BDD.md` | Cucumber.js setup, Gherkin guide, step definitions |
| `docs/WORKTREES.md` | Git worktrees for parallel development |

## Quick Start

### 1. Setup dependencies
```bash
chmod +x scripts/setup.sh && ./scripts/setup.sh
```

### 2. Configure the project
- Replace `[Project Name]` in `CLAUDE.md`
- Verify architecture paths in `.claude/architecture.json` match your `src/` structure
- Add to `.gitignore` if needed

### 3. Start Claude Code
```bash
claude
```

### 4. Start a feature
```
/plan build user authentication with email and password
```

Then when ready to implement:
```
/feature-dev user-auth
```

## Architecture Overview

```
src/
├── domain/          Pure business logic — entities, value objects, domain services
├── application/     Use cases — orchestrates domain objects
├── ports/           Interface contracts — inbound and outbound
├── infrastructure/  Adapters — DB, HTTP, messaging, email, etc.
└── shared/          Cross-cutting concerns — config, logging, utils

tests/
├── unit/            Unit tests (TDD)
├── integration/     Integration tests
├── bdd/             Cucumber.js features + step definitions
├── e2e/             Cypress E2E tests
└── load/            k6 load and stress tests
```

## Autonomous Agent Mode

For complex features, the AI orchestrates teams of up to 5 parallel agents:

```
You: /feature-dev payment-processing

Claude (orchestrator):
  → Wave 1: [explorer-1, explorer-2]          — explore codebase
  → Wave 2: [planner, bdd-writer]             — plan + scenarios
  → Wave 3: [test-writer, implementer-domain] — TDD domain layer
  → Wave 4: [implementer-app, implementer-infra, test-integration] — full stack
  → Wave 5: [reviewer, e2e-writer]            — quality gates
```

Each agent is transient (1 task), with a max 100k token context, passing structured handoffs between waves.

## Key Principles

| Principle | Implementation |
|-----------|---------------|
| **Hexagonal Architecture** | Strict layer separation enforced by hooks |
| **TDD** | Test-first enforced by tdd-guard hook |
| **BDD** | Gherkin scenarios required before code |
| **Clean Code + SOLID** | Enforced in code review via `/feature-dev` loop |
| **Token Efficiency** | RTK CLI enforced by rtk-rewrite hook |
| **Parallel Work** | Git worktrees per feature/agent wave |
| **Continuous Improvement** | Built-in review → fix → test loop in `/feature-dev` |

## Requirements

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Runtime for hooks |
| Git | 2.5+ | Worktree support |
| RTK CLI | latest | Token-efficient CLI proxy |
| k6 | latest | Load & stress testing |
| Cypress | latest | E2E testing |
| Cucumber.js | latest | BDD testing |

Install everything: `./scripts/setup.sh`

## Using with a Specific Stack

This starter kit is stack-agnostic by design. When your project uses a specific stack:

1. Update `.claude/architecture.json` with your actual source paths
2. Add stack-specific test commands to the docs
3. Add a `package.json` (or equivalent) with test scripts
4. The hooks, skills, and agent protocol work regardless of framework

Stack examples:
- **Next.js**: `src/` → App Router, `src/domain/` stays framework-free
- **Express/Node**: `src/` follows hexagonal structure directly
- **Python/FastAPI**: Update path patterns in `architecture.json`
- **Go**: Update `implementationExtensions` and `testExtensions` in `architecture.json`
- **Java/Spring**: Update extension patterns, add `src/main/java/` paths

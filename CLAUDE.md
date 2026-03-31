# CLAUDE.md — [Project Name]

> Stack-agnostic AI development starter kit.
> Replace `[Project Name]` with your project name before using.

@Rules.md
@Agents.md

---

## Core Development Principles

### 1. Hexagonal Architecture
All code follows the hexagonal (ports & adapters) architecture. Layers are sacred — no shortcuts.

```
src/
  domain/         Pure business logic. Zero external dependencies.
  application/    Use cases. Depends only on Domain + Ports.
  ports/          Interface contracts (inbound + outbound).
  infrastructure/ Adapters implementing ports (DB, HTTP, messaging).
  shared/         Cross-cutting concerns (config, logging, utils).
```

Run `/hexagonal` for detailed guidance on any component.

### 2. TDD — Test-Driven Development
**RED → GREEN → REFACTOR. Always. No exceptions.**

1. Write a failing test that describes the desired behavior
2. Write the minimum code to make the test pass
3. Refactor for quality without breaking tests

Never write implementation code without a failing test first.
Run `/tdd` for workflow guidance.

### 3. BDD — Behavior-Driven Development
Every feature starts with a Gherkin scenario before any code is written.

```gherkin
Feature: [Feature Name]
  As a [role]
  I want to [action]
  So that [outcome]

  Scenario: [Scenario description]
    Given [initial context]
    When [action occurs]
    Then [expected outcome]
```

Tool: **Cucumber.js** (`@cucumber/cucumber`)
Location: `tests/bdd/features/*.feature`

### 4. Clean Code + SOLID

**S** — Single Responsibility: One reason to change per class/function
**O** — Open/Closed: Open for extension, closed for modification
**L** — Liskov Substitution: Subtypes fully substitutable for base types
**I** — Interface Segregation: Many specific interfaces over one general
**D** — Dependency Inversion: Depend on abstractions, not concretions

Code must be readable without comments. Names reveal intent.
No magic numbers. No dead code. No premature optimization.
Functions < 20 lines (prefer < 10). Classes < 200 lines (prefer < 100).

---

## RTK CLI — Token Efficiency (MANDATORY)

**ALWAYS** use the `rtk` prefix for all CLI commands.

```bash
# Correct
rtk git status
rtk git add .
rtk npm test
rtk npm install
rtk ls -la

# Wrong — never do this
git status
npm test
ls -la
```

RTK provides **60–90% token savings** on dev operations by filtering and compressing CLI output.
**Prefer CLIs over MCP** when a CLI alternative exists. CLIs are faster, cheaper, and more deterministic.

If RTK is not installed: `npm install -g rtk` (see scripts/setup.sh)

---

## Git Worktrees — Parallel Work Without Conflicts

Use worktrees whenever work can be parallelized. Never develop two unrelated features in the same working tree.

```bash
# Create worktree for a new feature
rtk git worktree add ../$PROJECT-feature-name -b feature/name

# List all worktrees
rtk git worktree list

# Remove when done (after merging)
rtk git worktree remove ../$PROJECT-feature-name
```

Each agent team wave working in parallel **MUST** use a separate worktree.
See `docs/WORKTREES.md` for patterns and best practices.

---

## Testing Strategy

### Pyramid
```
         [E2E — Cypress]          few, critical user journeys
        /                \
   [Integration]       [BDD — Cucumber.js]     key scenarios
  /                                       \
[Unit — TDD]                          [Load — k6]  when relevant
```

### Locations and Tools

| Type        | Location                   | Tool                    | When                              |
|-------------|----------------------------|-------------------------|-----------------------------------|
| Unit        | `tests/unit/`              | Framework-native        | Every domain/application function |
| Integration | `tests/integration/`       | Framework-native        | Every port/adapter boundary       |
| BDD         | `tests/bdd/features/`      | Cucumber.js             | Every user-facing feature         |
| E2E         | `tests/e2e/`               | Cypress                 | Every user-facing flow            |
| Load/Stress | `tests/load/`              | k6                      | Every new API endpoint            |

### k6 Load Tests — When to Create
Create a k6 test in `tests/load/` for every new HTTP endpoint or performance-sensitive operation.

Baseline targets (adjust per project SLAs):
- p95 response time < 200ms at steady load
- p99 response time < 500ms at steady load
- Error rate < 0.1% under normal load
- System stable under 2x expected peak load (stress test)

See `docs/TESTING.md` and `docs/BDD.md` for detailed guides.

---

## Context Budget Protocol

The main context window starts with ~45k tokens of system context (CLAUDE.md + Rules.md + Agents.md + hooks). The working budget is ~15–20k tokens before quality degrades. **Threshold: 60k tokens total estimated.**

### Token estimation per operation
| Operation | Estimated tokens |
|-----------|-----------------|
| File read (avg) | 1k |
| Agent call | 8k |
| Long response | 2k |
| Phase completed | 3k |

### Rules
1. **Track after every phase or agent wave**: add to running estimate
2. **At threshold (~60k total)**: write `.claude/checkpoint.md` and output: `↺ Contexto em ~60k — escrevi checkpoint. Recomendo /compact agora.`
3. **After /compact or /clear**: context resets automatically — the SessionStart hook injects the checkpoint, then run `/resume`
4. **Checkpoint format** (write to `.claude/checkpoint.md`):

```markdown
# Checkpoint — [timestamp]

## Tarefa em andamento
Skill: [/feature-dev | /plan | /agent-teams | etc.]
Feature: [nome da feature]
Phase: [N/Total] [Phase Name]

## Arquivos criados/modificados
- [path] — [o que foi feito]

## Estado atual
[O que já está completo. O que está funcionando. Testes passando.]

## Próximo passo
[Instrução exata de onde continuar — phase, step, arquivo, ação]

## Decisões tomadas
- [decisões relevantes que a próxima sessão precisa saber]
```

---

## Autonomous Agent Mode

When executing complex tasks, orchestrate agent teams following **Agents.md**.

### Core Rules
- **Max 5 agents in parallel** — never exceed
- **1 activity per agent** — each agent is transient with exactly one task
- **100k token budget per agent** — monitor and write handoff before exceeding
- **Runtime profiles** — the orchestrator defines agent types based on task analysis
- **Context chain** — each wave passes a structured handoff to the next

Use `/feature-dev` to trigger the full autonomous workflow.

---

## Continuous Improvement Loop

Every feature implementation goes through this loop until all gates pass:

```
Implement → Review → Test → Fix → [loop back if failures]
                                 ↓ (all pass)
                           Load Test (if endpoint)
                                 ↓
                           E2E / Cypress
                                 ↓
                              DONE
```

No feature is complete until:
- [ ] All unit tests green
- [ ] All integration tests green
- [ ] All BDD scenarios pass
- [ ] Code review approved (no blockers)
- [ ] k6 load test within SLA (if endpoint added)
- [ ] Cypress E2E tests pass (if UI added)

---

## Code Review Protocol

When reviewing code, always check:

1. **Architecture** — Does it follow hexagonal layers? No cross-layer violations?
2. **Tests** — Is there a test for every behavior? TDD was followed?
3. **SOLID** — Does it respect all five principles?
4. **Clean Code** — Is it readable? Self-documenting names?
5. **Performance** — Any obvious bottlenecks or N+1 queries?
6. **Security** — Any injection risks, auth gaps, data exposure?

Output format:
```
REVIEW: [PASS | FAIL | PASS_WITH_SUGGESTIONS]
Blockers: [list or "None"]
Suggestions: [list or "None"]
```

---

## Progress Reporting

Whenever executing a multi-step skill workflow (`/feature-dev`, `/agent-teams`, `/plan`, `/tdd`, `/build`, etc.), emit a compact status line **before starting each phase or major step**:

```
▶ [N/Total] Phase Name
```

One line only. No preamble. Then proceed immediately with the work.

---

## Available Skills

| Skill              | Usage                                  | Purpose                                         |
|--------------------|----------------------------------------|-------------------------------------------------|
| `/build`           | `/build <raw idea>`                    | **Full lifecycle**: refine → plan → execute autonomously with parallel agent teams |
| `/plan`            | `/plan [feature or task description]`  | Generate structured development plan            |
| `/feature-dev`     | `/feature-dev [feature name]`          | Implement with full TDD + hexagonal workflow    |
| `/frontend-design` | `/frontend-design [component or page]` | Design and implement production-grade UI        |
| `/tdd`             | `/tdd [what to implement]`             | TDD workflow: red → green → refactor            |
| `/hexagonal`       | `/hexagonal [component name]`          | Hexagonal architecture guidance                 |
| `/agent-teams`     | `/agent-teams`                         | Multi-team parallel orchestration for large work |

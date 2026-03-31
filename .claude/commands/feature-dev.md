# /feature-dev — Feature Implementation

Extends the official Anthropic feature-dev workflow with project-specific requirements:
TDD (Red→Green→Refactor), Hexagonal Architecture, BDD (Cucumber), Load Tests (k6), and Git Worktrees.

---

## Workflow (7 Phases)

### Phase 1 — Discovery
Understand the requirement fully before touching any code.

- Restate the feature in your own words to confirm understanding
- Identify the user-facing behavior (what changes for the user?)
- Identify business rules and invariants (what must always be true?)
- Clarify ambiguities — ask the user if anything is unclear
- Define the Definition of Done (acceptance criteria)

### Phase 2 — Codebase Exploration
Use the **code-explorer** agent to map the existing codebase.

```
Agent: code-explorer
Task: Map existing architecture layers, identify patterns, trace execution paths
      relevant to this feature. Report:
      - Current file structure in src/domain/, src/application/, src/ports/, src/infrastructure/
      - Existing test patterns (unit, integration, BDD)
      - Conventions used (naming, error handling, dependency injection)
      - Any existing code this feature will interact with
```

Output: context handoff with architecture map and conventions summary.

### Phase 3 — Clarifying Questions
Based on exploration, surface any remaining unknowns:

- Are there existing domain objects this feature extends or replaces?
- Are there existing ports that cover the needed interfaces, or new ones required?
- Are there performance requirements? (determines if k6 load test is needed)
- Is there a UI component? (determines if Cypress E2E is needed)
- Are there security constraints? (auth, authorization, data validation)

Ask the user. Wait for answers before proceeding.

### Phase 4 — Architecture Design
Use the **code-architect** agent to propose implementation approaches.

```
Agent: code-architect
Task: Propose 2–3 implementation approaches for this feature in hexagonal architecture.
      For each approach document:
      - Domain model changes (new/modified entities, value objects, domain events)
      - Application layer: use cases needed
      - Ports: new inbound/outbound interfaces
      - Infrastructure: adapters to implement
      - Trade-offs and recommended approach
      - BDD scenarios (Gherkin) for the feature
      - Test plan (unit / integration / E2E / load)
```

Present the options to the user. Get approval on the chosen approach before implementing.

**Architecture constraints (always apply):**
- Domain layer: zero external dependencies (enforced by `architecture-guard` hook)
- Application layer: depends only on domain + port interfaces
- All external deps behind port interfaces in `src/ports/outbound/`
- Run `/hexagonal` if guidance needed on any component

### Phase 5 — Implementation (TDD)
Implement using strict Red→Green→Refactor. Git worktree isolation is mandatory.

#### 5.1 — Create worktree
```bash
rtk git worktree add ../[project]-[feature-name] -b feature/[feature-name]
```

#### 5.2 — BDD Feature File (FIRST — before any code)
Create `tests/bdd/features/[feature-name].feature` with the Gherkin scenarios from Phase 4.
This is the acceptance criteria. Nothing is done until these scenarios pass.

#### 5.3 — TDD Cycle (repeat for each behavior)

```
RED:      Write a failing test that describes one behavior
GREEN:    Write the minimum code to make it pass
REFACTOR: Improve readability, remove duplication, apply SOLID
```

**Order of implementation (inside-out):**
1. Domain entities and value objects (unit tests)
2. Port interfaces (`src/ports/`)
3. Application use cases (unit tests with fake adapters)
4. Infrastructure adapters (integration tests with real/containerized deps)
5. Composition root (wire adapters to ports)
6. Cucumber step definitions

**At each Write/Edit the `architecture-guard` hook fires:**
- Checks the file's layer
- Scans imports for forbidden packages (Prisma, axios, etc. in domain/application)
- Blocks if violation found

#### 5.4 — Agent Teams (for complex features)
If the feature requires parallel implementation across multiple layers, decompose into waves.
Max 5 agents per wave. Each agent: 1 granular activity. Max 100k tokens per agent.
See `Agents.md` for the full orchestration protocol.

**Example waves:**
```
Wave 1: [code-explorer]                                   — re-explore if needed
Wave 2: [test-writer-domain, bdd-writer]                  — tests first
Wave 3: [implementer-domain, implementer-ports]           — domain layer
Wave 4: [implementer-app, implementer-infra, test-integ]  — app + infra
Wave 5: [code-reviewer]                                   — quality gate
```

### Phase 6 — Quality Review
Use the **code-reviewer** agent to inspect all changes.

```
Agent: code-reviewer
Task: Review all files modified in this feature. Check:
      1. Architecture — hexagonal layers respected? No cross-layer violations?
      2. TDD — every behavior has a test? Tests test behavior, not internals?
      3. SOLID — Single Responsibility, Open/Closed, Liskov, Interface Segregation, DI?
      4. Clean Code — readable names? No magic numbers? No dead code?
      5. Security — injection risks? Auth gaps? Data exposure?
      6. Performance — N+1 queries? Obvious bottlenecks?

Output format:
  REVIEW: [PASS | FAIL | PASS_WITH_SUGGESTIONS]
  Blockers: [list or "None"]
  Suggestions: [list or "None"]
```

**Continuous improvement loop:**
```
run tests → if failures → fix → run tests again
run review → if blockers → fix → run review again
repeat until: all tests green AND review PASS
```

**Additional quality gates (run after review passes):**
- Cypress E2E (if UI involved): `rtk npx cypress run --spec tests/e2e/[feature].cy.ts`
- k6 load test (if endpoint added): `rtk k6 run tests/load/[feature].js`
  - Required threshold: p95 < 200ms at expected load
  - Required threshold: error rate < 1%

### Phase 7 — Summary
After all quality gates pass, produce a completion summary and commit.

**Commit (conventional commits format):**
```bash
rtk git add [specific files — never git add .]
rtk git commit -m "feat([scope]): [description]"
```

**Completion summary:**
```
FEATURE COMPLETE: [feature name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files created:    [N] files
Files modified:   [N] files
Tests added:      [N] unit, [N] integration, [N] BDD scenarios
Quality gates:
  ✅ All unit tests pass
  ✅ All integration tests pass
  ✅ BDD scenarios pass (Cucumber)
  ✅ Code review: PASS
  ✅ Cypress E2E pass       (if applicable)
  ✅ k6 load within SLA     (if applicable)
Branch: feature/[name]
Worktree: clean up with `rtk git worktree remove ../[project]-[feature-name]`
```

---

## Quick Reference — Test Commands

```bash
rtk npm test                                    # all tests
rtk npm test -- tests/unit                      # unit only
rtk npm test -- tests/integration               # integration only
rtk npx cucumber-js                             # BDD
rtk npx cypress run                             # E2E
rtk k6 run tests/load/[feature].js             # load test
```

---

## Deviating from this workflow

Only skip phases with explicit user approval:
- Skip Phase 3 (clarifying questions) if requirements are unambiguous
- Skip load test if the feature has no HTTP endpoints or performance requirements
- Skip Cypress if the feature is backend-only with no UI
- Never skip Phase 4 (architecture design) or Phase 6 (code review)

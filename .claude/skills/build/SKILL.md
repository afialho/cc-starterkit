---
name: build
description: Full lifecycle from raw idea to implemented feature. Refines the idea with the user (max 5 questions, one approval gate), then executes fully autonomously with parallel agent teams.
disable-model-invocation: true
argument-hint: <raw idea or feature description>
---

# /build — Idea to Implementation

One entry point. One approval gate. Full autonomous execution.

---

## How it works

```
/build <raw idea>
    │
    ├─ Phase 1: Refinement (you + Claude, max 5 questions)
    │
    ├─ ⏸ SINGLE GATE: "Ready to build. Proceed?"
    │
    ├─ Phase 2: Plan (auto)
    ├─ Phase 3: Decompose into workstreams (auto)
    ├─ Phase 4: Launch parallel agent teams (auto)
    └─ Phase 5: Review, commit, summary (auto)
```

**After you approve at the gate, Claude does not ask you anything else.**
Agents make all architecture, implementation, and testing decisions autonomously.

---

## Phase 1 — Refinement (interactive)

Ask the user at most **5 targeted questions** to make the idea implementation-ready.
Stop asking as soon as you have enough to proceed — never ask all 5 if fewer suffice.

Focus on what is genuinely unknown:

1. **Acceptance criteria** — What does "done" look like from the user's perspective?
2. **Integration scope** — Does this touch existing code or start from scratch?
3. **Interface** — Does it need a UI, an API endpoint, or is it pure backend logic?
4. **Constraints** — Any hard performance, security, or compatibility requirements?
5. **Out of scope** — Is there anything that looks related but should NOT be included?

Do not ask about stack, architecture, or testing strategy — those are defined in CLAUDE.md, Rules.md, and Agents.md.

Present a **Refinement Summary** when done:

```
REFINED SPEC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:       [name]
Goal:          [one sentence — what the user achieves]
Acceptance:    [bulleted list of done criteria]
Touches:       [existing files/modules OR "greenfield"]
Interface:     [UI / API endpoint / backend only]
Constraints:   [list or "None beyond standard SLAs"]
Out of scope:  [explicit exclusions]
```

Then ask: **"Ready to build? I'll plan, decompose, and implement this fully autonomously."**

Wait for a single "yes" / "go" / "proceed" confirmation. Do not start before receiving it.

---

## Phase 2 — Plan (autonomous, no user input)

Generate the full development plan internally. Do not present it to the user — execute it.

Plan must cover:

**Hexagonal architecture mapping:**
- Domain: entities, value objects, domain services, domain events
- Application: use cases (one per user action)
- Ports: inbound + outbound interfaces
- Infrastructure: adapters (DB, HTTP, messaging, etc.)

**BDD scenarios (Gherkin):**
- Happy path
- Error cases
- Edge cases

**Test plan:**
- Unit tests per domain entity and use case
- Integration tests per adapter
- E2E (Cypress) if UI involved
- Load test (k6) if HTTP endpoint added

**Implementation sequence (TDD inside-out):**
1. BDD feature file
2. Domain entities (test first)
3. Port interfaces
4. Application use cases (test first)
5. Infrastructure adapters (integration tests)
6. Composition root wiring
7. Cucumber step definitions
8. Cypress E2E (if UI)
9. k6 load test (if endpoint)

---

## Phase 3 — Decompose into Workstreams (autonomous)

Break the plan into independent parallel workstreams following `/agent-teams` protocol.

**Rules:**
- Each workstream: max 25 files to read, max 15 files to create/modify, max 300 lines of code
- Estimate token budget per workstream (must be < 85k tokens)
- If a workstream exceeds 85k → split into two
- Map dependencies: workstreams with data dependencies run in separate waves

**Output a Time Brief for each workstream** (internal, not shown to user):

```
TIME BRIEF — [Name]
─────────────────────────────────────────
Workstream:   [what this team builds]
Worktree:     rtk git worktree add ../[proj]-[name] -b feature/[name]
Reads:        [exact file list — max 25]
Writes:       [exact file list — max 15]
Agents (3–5): [type + single-sentence task each]
Budget:       [Xk tokens estimated]
Wave:         [1 | 2 | 3 — which execution wave]
```

---

## Phase 4 — Execute (autonomous, parallel agent teams)

### Agent Autonomy Rules (mandatory)

Every agent launched under this skill operates under these constraints:

1. **Make decisions, don't ask.** If a choice must be made (naming, pattern, approach), pick the best option based on existing codebase conventions and SOLID principles. Document the decision in the handoff.
2. **Resolve blockers independently.** If a dependency is missing, add it. If a pattern is unclear, follow the closest existing example in the codebase. Only escalate if the blocker makes the entire workstream impossible.
3. **TDD is non-negotiable.** Write failing test before every implementation. No exceptions.
4. **Architecture guard is active.** Never import across forbidden layer boundaries (see architecture.json).
5. **Follow conventions.** Match naming, error handling, and DI patterns already present in the codebase.

### Execution Protocol

**Create all worktrees before launching any team:**
```bash
rtk git worktree add ../[proj]-[workstream] -b feature/[workstream]
```

**Launch teams in parallel waves** (all teams in the same wave run simultaneously):
```
Wave 1: Agent(Team A) + Agent(Team B) + Agent(Team C)  ← parallel
Wave 2: Agent(Team D) + Agent(Team E)                  ← only after Wave 1 completes
```

Max 5 agents per wave across all teams combined (not per team).

**Each team runs internal waves:**
```
Internal Wave 1 — Explorer:     map codebase context for this workstream
Internal Wave 2 — Test-writer:  write failing tests (RED)
Internal Wave 3 — Implementer:  make tests pass (GREEN → REFACTOR)
Internal Wave 4 — Reviewer:     check architecture + SOLID compliance
```

**Each team returns a handoff:**
```
TEAM REPORT — [Name]
─────────────────────────────────────────
Status:        [COMPLETE | PARTIAL | BLOCKED]
Files created: [list]
Files modified:[list]
Tests:         [N unit, N integration, N BDD]
Decisions:     [key choices made and rationale]
Issues:        [blockers or "None"]
```

---

## Phase 5 — Review, Commit, Summary (autonomous)

### After all teams complete:

1. **Merge worktrees** into a single feature branch:
   ```bash
   rtk git checkout -b feature/[feature-name]
   rtk git merge feature/[workstream-a]
   rtk git merge feature/[workstream-b]
   # ... all workstreams
   ```

2. **Run full test suite:**
   ```bash
   rtk npm test
   rtk npx cucumber-js
   rtk npx cypress run          # if UI was built
   rtk k6 run tests/load/[f].js # if endpoint was added
   ```

3. **Fix failures** (if any): spawn targeted fix agents. Repeat until all green.

4. **Global code review** (code-reviewer agent):
   - Hexagonal layer compliance
   - SOLID principles
   - Test coverage (every behavior tested)
   - Security (no injection, no auth gaps)
   - If review returns FAIL → fix loop until PASS

5. **Commit:**
   ```bash
   rtk git add [specific files — never git add .]
   rtk git commit -m "feat([scope]): [description]

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
   ```

6. **Clean up worktrees:**
   ```bash
   rtk git worktree remove ../[proj]-[workstream-a]
   # ... all worktrees
   ```

7. **Present final summary to user:**

```
BUILD COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:        [feature name]
Branch:         feature/[name]

What was built:
  [2–4 bullet points describing what was implemented]

Files:
  Created:   [N]
  Modified:  [N]

Tests:
  Unit:        [N] passing
  Integration: [N] passing
  BDD:         [N] scenarios passing
  E2E:         [N] passing     (if applicable)
  Load:        p95 Xms @ Y rps (if applicable)

Teams used:   [N] parallel teams across [N] waves
Review:       PASS

Next: merge feature/[name] into main when ready.
```

---

## Failure handling

| Situation | Agent behavior |
|-----------|---------------|
| Test won't pass after 3 attempts | Document in handoff, mark workstream PARTIAL, continue others |
| Architecture violation detected | Fix the violation, document the decision |
| Missing dependency (npm package) | Install it, document in handoff |
| Ambiguous requirement | Choose the simpler interpretation, document the assumption |
| Workstream BLOCKED (truly impossible) | Report in handoff, orchestrator decides whether to skip or adapt |

Agents never ask the user for help during execution. They decide, document, and continue.

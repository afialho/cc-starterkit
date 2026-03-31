---
name: plan
description: Generate a complete development plan with hexagonal architecture mapping, BDD scenarios, TDD test plan, agent wave decomposition, and git strategy before writing any code.
disable-model-invocation: true
argument-hint: <feature or task description>
---

# /plan — Development Planning

Generate a complete, structured development plan before writing any code.

## Instructions

When this skill is invoked with `/plan [description]`, produce a comprehensive plan following these steps:

### 1. Understand the Feature
- Restate the requirement in your own words to confirm understanding
- Identify the user-facing behavior (what the user can do)
- Identify the business rules (invariants, validations, constraints)

### 2. Hexagonal Architecture Mapping
Map the feature to the hexagonal architecture layers:

```
Domain Layer (src/domain/):
  - Entities: [list new/modified entities]
  - Value Objects: [list new value objects]
  - Domain Services: [list domain services if needed]
  - Domain Events: [list events if applicable]

Application Layer (src/application/):
  - Use Cases: [list use cases with input/output types]

Ports (src/ports/):
  - Inbound ports: [interfaces for use case inputs]
  - Outbound ports: [interfaces for infrastructure adapters]

Infrastructure Layer (src/infrastructure/):
  - Adapters: [list adapters needed: DB, HTTP, messaging, etc.]

Shared (src/shared/):
  - Config/utils needed
```

### 3. BDD Scenarios (write these FIRST)
Write Gherkin scenarios before any implementation. Create the feature file path: `tests/bdd/features/[feature-name].feature`

```gherkin
Feature: [Feature Name]
  As a [role]
  I want to [action]
  So that [outcome]

  Scenario: [Happy path]
    Given ...
    When ...
    Then ...

  Scenario: [Error case 1]
    Given ...
    When ...
    Then ...

  Scenario: [Edge case]
    Given ...
    When ...
    Then ...
```

### 4. Test Plan
```
Unit Tests (tests/unit/):
  - [list each test case with: "describe: context / it: expected behavior"]

Integration Tests (tests/integration/):
  - [list adapter boundary tests]

E2E Tests (tests/e2e/):
  - [list Cypress scenarios if UI involved]

Load Tests (tests/load/):
  - [k6 script if new API endpoint — target: p95 < 200ms at X RPS]
```

### 5. Implementation Order (TDD sequence)
```
Step 1: Write BDD feature file → tests/bdd/features/[feature].feature
Step 2: Write failing unit tests (RED) for domain entities
Step 3: Implement domain entities (GREEN)
Step 4: Refactor domain (REFACTOR)
Step 5: Write failing unit tests for use cases
Step 6: Implement use cases
Step 7: Write failing integration tests for adapters
Step 8: Implement infrastructure adapters
Step 9: Wire everything in composition root
Step 10: Write Cucumber step definitions
Step 11: Write Cypress E2E tests (if UI)
Step 12: Write k6 load test (if endpoint)
Step 13: Run full test suite → all green
Step 14: Code review pass
```

### 6. Agent Team Decomposition (for complex features)
If the feature is complex enough to benefit from parallel agents, list the waves:

```
Wave 1 (Exploration):
  - explorer-1: [what to explore]

Wave 2 (Planning):
  - planner: [architecture decisions]
  - bdd-writer: [BDD scenarios]

Wave 3 (Domain):
  - test-writer: [failing domain tests]
  - implementer: [domain implementation]

Wave 4 (Application + Infrastructure):
  - implementer-A: [use cases]
  - implementer-B: [adapters]
  - test-writer-2: [integration tests]

Wave 5 (Quality):
  - reviewer: [full code review]
  - e2e-writer: [Cypress tests]
```

### 7. Git Strategy
```
Branch: feature/[feature-name]
Worktree: rtk git worktree add ../[project]-[feature-name] -b feature/[feature-name]

Commit sequence:
  test(domain): add failing tests for [entity]
  feat(domain): implement [entity]
  test(application): add failing tests for [use-case]
  feat(application): implement [use-case]
  feat(infrastructure): implement [adapter]
  test(bdd): add cucumber step definitions
  test(e2e): add cypress tests for [flow]
  test(load): add k6 load test for [endpoint]
```

### 8. Definition of Done
- [ ] All BDD scenarios pass (Cucumber)
- [ ] All unit tests pass (100% of business logic)
- [ ] All integration tests pass
- [ ] Code review approved (no blockers)
- [ ] Cypress E2E tests pass (if UI)
- [ ] k6 load test within SLA (if endpoint)
- [ ] No linting errors
- [ ] Architecture layers respected (no cross-layer violations)

---

After presenting the plan, ask: **"Shall I proceed with `/feature-dev [feature-name]` to implement this?"**

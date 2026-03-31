---
name: tdd
description: Guide Red→Green→Refactor TDD cycle for any implementation. Covers unit and integration test guidelines, mocking strategy, test smells to avoid, and TDD with hexagonal architecture.
disable-model-invocation: true
argument-hint: <what to implement>
---

# /tdd — Test-Driven Development Workflow

Guide through the Red-Green-Refactor cycle for any implementation.

## Instructions

When invoked with `/tdd [what to implement]`, guide the full TDD workflow:

### The TDD Cycle (Non-Negotiable)

```
    ┌─────────────────────────────────────┐
    │                                     │
    │   RED → write a FAILING test        │
    │    ↓                                │
    │   GREEN → write MINIMUM code        │
    │    ↓                                │
    │   REFACTOR → improve the code       │
    │    ↓                                │
    └─────────────────────────────────────┘
           repeat for next behavior
```

Never skip steps. Never write implementation before a failing test.

---

### Step 1 — RED: Write the Failing Test

Before writing any implementation, write the test:

**What to test:**
- One behavior at a time
- The "what" not the "how" (behavior, not implementation)
- Edge cases: null inputs, empty collections, boundary values
- Error cases: invalid inputs, external failures

**Test structure (Arrange-Act-Assert):**
```
Arrange: set up the test context (create objects, mock dependencies)
Act:     call the function/method being tested
Assert:  verify the expected outcome
```

**Naming convention:**
```
describe('[Subject under test]', () => {
  describe('when [context/condition]', () => {
    it('[expected behavior in plain English]', () => {
      // ...
    });
  });
});
```

**Run the test to confirm it FAILS for the right reason:**
- Test should fail because the behavior doesn't exist yet
- Not because of a syntax error or test setup issue
- The failure message should clearly describe what's missing

### Step 2 — GREEN: Write the Minimum Code

Write the simplest code that makes the test pass:
- Resist the urge to write more than what the test requires
- "Fake it till you make it" is acceptable at this stage
- Return hardcoded values if that's what makes the test pass initially
- Complexity emerges through more tests, not speculation

**Run the test to confirm it PASSES.**

If you can't make it pass without changing the test, you may have:
- A design problem (rethink the interface)
- A dependency you didn't account for (add it to the arrange)

### Step 3 — REFACTOR: Improve Without Breaking

With a green test, now improve the code:
- Remove duplication (DRY)
- Improve naming to reveal intent
- Extract functions if a function has too many responsibilities
- Simplify conditionals
- Apply SOLID principles

**Run the test after each refactor to confirm it stays GREEN.**

Refactor tests too:
- Remove duplication in test setup (use beforeEach/fixtures)
- Improve test readability
- Ensure test names still describe the behavior accurately

---

### Unit Test Guidelines

**What belongs in unit tests:**
- Domain entities (business rules, invariants)
- Application use cases (input → output transformations)
- Pure functions and utilities
- Algorithm correctness

**What does NOT belong in unit tests:**
- Database queries (use integration tests)
- HTTP calls (use integration tests)
- File system operations (use integration tests)

**Mocking strategy:**
- Mock at port boundaries (outbound interfaces)
- Never mock domain objects — test them for real
- Use the simplest possible mock (return value > stub > spy > full mock)

### Integration Test Guidelines

**What belongs in integration tests:**
- Infrastructure adapters (repositories, HTTP clients)
- Port implementations
- Service composition (use case + adapter together)

**Setup:**
- Use real or containerized dependencies (Docker for DB, HTTP server for API)
- Reset state between tests (truncate tables, clear cache)
- Use test-specific data that doesn't pollute other tests

---

### BDD Connection

TDD drives implementation from the inside out (unit → integration).
BDD drives features from the outside in (user behavior → scenarios).

They work together:
1. BDD scenario defines the acceptance criteria
2. TDD drives the implementation of each behavior

```
BDD Feature File (Gherkin)
    ↓
Cucumber Step Definitions
    ↓
Use Case Tests (TDD)
    ↓
Domain Tests (TDD)
```

---

### Test Smells to Avoid

| Smell | Problem | Fix |
|-------|---------|-----|
| Test that tests internals | Brittle, breaks on refactor | Test public behavior only |
| Multiple assertions per test | Hard to know what failed | One logical assertion per test |
| Test that never fails | Gives false confidence | Verify RED phase first |
| Slow tests | Discourages running them | Mock external deps in unit tests |
| Flaky tests | Undermines trust | Fix non-determinism (time, random, order) |
| Tests that depend on each other | Ordering issues | Each test is fully isolated |
| No arrange/act/assert structure | Hard to read | Always structure clearly |

---

### TDD With Hexagonal Architecture

```
Start with domain (no dependencies):
  1. Write test: User entity — email must be valid
  2. Implement: User entity with email validation
  3. Refactor: extract EmailAddress value object

Then application (depends on domain ports):
  4. Write test: LoginUseCase — correct password returns session
  5. Implement: LoginUseCase using UserRepository port (mocked)
  6. Refactor: extract auth logic

Then infrastructure (depends on ports):
  7. Write integration test: PostgresUserRepository.findByEmail
  8. Implement: real DB adapter
  9. Refactor: query optimization
```

---

### Quick Reference — Test Commands

```bash
# Run all tests
rtk npm test

# Run only unit tests
rtk npm test -- tests/unit

# Run only integration tests
rtk npm test -- tests/integration

# Run BDD tests
rtk npx cucumber-js tests/bdd/features/

# Watch mode (TDD loop)
rtk npm test -- --watch

# Coverage report
rtk npm test -- --coverage

# Run E2E (Cypress)
rtk npx cypress open
rtk npx cypress run

# Run load tests (k6)
rtk k6 run tests/load/[script].js
```

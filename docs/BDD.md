# BDD with Cucumber.js

Behavior-Driven Development guide using Gherkin + Cucumber.js.

## Installation

```bash
npm install --save-dev @cucumber/cucumber @cucumber/pretty-formatter
```

For TypeScript:
```bash
npm install --save-dev ts-node @types/node
```

## Configuration

`cucumber.js` (project root):
```javascript
module.exports = {
  default: {
    require: ['tests/bdd/steps/**/*.ts'],
    requireModule: ['ts-node/register'],
    paths: ['tests/bdd/features/**/*.feature'],
    format: [
      'progress-bar',
      '@cucumber/pretty-formatter',
      'html:reports/cucumber.html',
    ],
    publishQuiet: true,
  },
};
```

## Writing Feature Files

Feature files use Gherkin syntax. They are written BEFORE any code.

### Structure
```gherkin
Feature: [Feature name — what the user can do]
  As a [role/persona]
  I want to [action/goal]
  So that [business value]

  Background:
    Given [shared context for all scenarios in this feature]

  Scenario: [Specific case — plain English]
    Given [initial state]
    And [additional context]
    When [user action]
    And [additional action]
    Then [expected outcome]
    And [additional assertion]
    But [exception to the outcome]

  Scenario Outline: [Parameterized scenario]
    Given a user with <role>
    When they attempt <action>
    Then the result is <outcome>

    Examples:
      | role    | action    | outcome  |
      | admin   | delete    | success  |
      | viewer  | delete    | denied   |
```

### Good Gherkin Practices

**Write from the user's perspective** — not technical steps:
```gherkin
# Bad — technical (implementation detail)
Given the user table has a row with email "user@test.com" and password_hash "abc123"
When a POST request is made to /api/auth/login with body {"email":"user@test.com"}

# Good — user perspective
Given a registered user with email "user@test.com" and password "correct"
When the user logs in with those credentials
Then they should be redirected to the dashboard
```

**One behavior per scenario** — don't test multiple things:
```gherkin
# Bad — testing two behaviors
Scenario: Login and view profile
  Given a logged-in user
  When they view their profile
  Then they see their email
  And they can logout            # separate concern

# Good — focused scenarios
Scenario: User views their profile
  Given a logged-in user with email "user@test.com"
  When they navigate to their profile
  Then they see their email "user@test.com"

Scenario: User logs out
  Given a logged-in user
  When they click logout
  Then they are redirected to the login page
```

**Use concrete values** — not vague descriptions:
```gherkin
# Vague
Then the user should see a success message

# Concrete
Then the user should see "Welcome back, John!"
```

## Writing Step Definitions

Map Gherkin steps to code:

```typescript
// tests/bdd/steps/auth.steps.ts
import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { expect } from 'chai';  // or vitest/jest expect

// Shared state between steps
interface World {
  response?: Response;
  token?: string;
  user?: any;
}

Before(function (this: World) {
  // Reset state before each scenario
});

Given('a registered user with email {string} and password {string}',
  async function (this: World, email: string, password: string) {
    // Create user in test DB or mock
    this.user = await createTestUser({ email, password });
  }
);

When('the user logs in with those credentials',
  async function (this: World) {
    this.response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.user.email,
        password: this.user.password,
      }),
    });
  }
);

Then('they should be redirected to the dashboard',
  async function (this: World) {
    expect(this.response?.status).to.equal(200);
    const body = await this.response?.json();
    expect(body.redirectTo).to.equal('/dashboard');
  }
);

Then('they should receive a valid session token',
  async function (this: World) {
    const body = await this.response?.json();
    expect(body.token).to.match(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/); // JWT
  }
);
```

## Running Cucumber

```bash
# Run all BDD tests
rtk npx cucumber-js

# Run a specific feature
rtk npx cucumber-js tests/bdd/features/auth.feature

# Run specific tag
rtk npx cucumber-js --tags @smoke

# Generate HTML report
rtk npx cucumber-js --format html:reports/bdd.html

# Dry run (validate steps exist without executing)
rtk npx cucumber-js --dry-run
```

## File Structure

```
tests/bdd/
├── features/
│   ├── auth.feature
│   ├── user-profile.feature
│   ├── orders.feature
│   └── [feature].feature
├── steps/
│   ├── auth.steps.ts
│   ├── user-profile.steps.ts
│   ├── common.steps.ts          ← shared Given/When/Then
│   └── [feature].steps.ts
└── support/
    ├── world.ts                  ← custom World class
    ├── hooks.ts                  ← Before/After/BeforeAll/AfterAll
    └── helpers/
        ├── test-users.ts
        └── api-client.ts
```

## BDD + TDD Workflow

BDD and TDD work at different levels:

```
1. Write Gherkin scenario (BDD) ← defines acceptance criteria
      ↓
2. Run Cucumber → scenario pending (step definitions missing)
      ↓
3. Write step definitions → they call use cases
      ↓
4. Run Cucumber → fails (use case not implemented)
      ↓
5. TDD loop: write unit test → implement → refactor
      ↓
6. Run Cucumber → scenario passes
      ↓
7. All scenarios green = feature complete
```

## Tags

Use tags to organize and filter scenarios:

```gherkin
@smoke @auth
Feature: Authentication

  @happy-path
  Scenario: Successful login
    ...

  @edge-case
  Scenario: Login with expired session
    ...

  @wip
  Scenario: OAuth login (in progress)
    ...
```

Run by tag:
```bash
rtk npx cucumber-js --tags "@smoke"
rtk npx cucumber-js --tags "@smoke and @auth"
rtk npx cucumber-js --tags "not @wip"
```

## Integration with CI

```yaml
# .github/workflows/test.yml (example)
- name: Run BDD Tests
  run: npx cucumber-js --format html:reports/cucumber.html

- name: Upload BDD Report
  uses: actions/upload-artifact@v3
  with:
    name: bdd-report
    path: reports/cucumber.html
```

# Hexagonal Architecture Guide

This project follows the hexagonal (ports & adapters) architecture pattern.
Run `/hexagonal` in Claude Code for interactive architecture guidance.

## Why Hexagonal?

**Testability**: Business logic can be tested without databases, HTTP, or any infrastructure running.
**Flexibility**: Swap infrastructure implementations without touching business logic.
**Clarity**: Where to put code is never ambiguous.
**Maintainability**: Changes in one layer don't cascade to others.

## Directory Structure

```
src/
├── domain/                    Pure business logic
│   ├── [entity]/
│   │   ├── [Entity].ts        Entity definition
│   │   ├── [Entity]Id.ts      Typed ID value object
│   │   └── [Entity]Events.ts  Domain events (if applicable)
│   ├── [value-object]/
│   │   └── [ValueObject].ts
│   └── constants/
│       └── index.ts
│
├── application/               Use cases
│   ├── [feature]/
│   │   ├── [Action][Entity]UseCase.ts
│   │   ├── [Action][Entity]Command.ts  Input DTO
│   │   └── [Action][Entity]Result.ts   Output DTO
│   └── shared/
│
├── ports/                     Interface contracts
│   ├── inbound/               What the app exposes
│   │   └── I[Action][Entity]UseCase.ts
│   └── outbound/              What the app needs
│       ├── [Entity]Repository.ts
│       └── [Service]Port.ts
│
├── infrastructure/            Adapters
│   ├── persistence/
│   │   └── [technology]/
│   │       └── [Technology][Entity]Repository.ts
│   ├── http/
│   │   └── [technology]/
│   │       └── [Technology][Service].ts
│   └── [other-adapters]/
│
├── shared/                    Cross-cutting concerns
│   ├── config/
│   ├── logging/
│   ├── errors/
│   └── validation/
│
└── main.ts                    Composition root — wire everything here
```

## Layer Rules (Enforced by Hooks)

| Layer | Can Import From | Cannot Import From |
|-------|-----------------|-------------------|
| `domain` | `domain`, `shared` | Everything else |
| `application` | `domain`, `ports`, `shared` | `infrastructure` |
| `ports` | `domain` | `application`, `infrastructure` |
| `infrastructure` | All layers | — |
| `shared` | Nothing | Business logic |

## Adding a New Feature — Checklist

1. **Define the domain model**
   - [ ] Entity or Value Object in `src/domain/[feature]/`
   - [ ] Domain rules as methods on the entity (not in use cases)

2. **Define port interfaces**
   - [ ] Outbound port for any data storage: `src/ports/outbound/[Feature]Repository.ts`
   - [ ] Outbound port for any external service: `src/ports/outbound/[Feature]ServicePort.ts`

3. **Implement use cases**
   - [ ] One use case per user action: `src/application/[feature]/[Action][Feature]UseCase.ts`
   - [ ] Input/Output DTOs alongside each use case

4. **Implement infrastructure adapters**
   - [ ] Each adapter in `src/infrastructure/[technology]/`
   - [ ] Each adapter implements its port interface

5. **Wire in composition root**
   - [ ] Add new adapters and use cases to `src/main.ts`

6. **Tests**
   - [ ] Domain: `tests/unit/domain/[Feature].test.ts`
   - [ ] Use cases: `tests/unit/application/[Feature]UseCase.test.ts`
   - [ ] Adapters: `tests/integration/[Feature]Repository.test.ts`
   - [ ] BDD: `tests/bdd/features/[feature].feature`

## Common Mistakes

### Mistake: Infrastructure in domain
```typescript
// WRONG — database in entity
import { prisma } from '../infrastructure/db'; // ❌

// RIGHT — domain entity is pure
export class User {
  // No imports from infrastructure
}
```

### Mistake: Concrete class instead of port
```typescript
// WRONG — use case depends on concrete adapter
import { PostgresUserRepo } from '../infrastructure/...'; // ❌

// RIGHT — use case depends on port interface
import { UserRepository } from '../ports/outbound/UserRepository'; // ✅
constructor(private readonly users: UserRepository) {}
```

### Mistake: Business logic in infrastructure
```typescript
// WRONG — business rule in adapter
class PostgresUserRepo implements UserRepository {
  async findByEmail(email: string) {
    const user = await db.query('SELECT...');
    if (!user.isActive) throw new Error('Account suspended'); // ❌ business logic here
    return user;
  }
}

// RIGHT — adapter just adapts data
class PostgresUserRepo implements UserRepository {
  async findByEmail(email: string) {
    const row = await db.query('SELECT...');
    return row ? User.reconstitute(row) : null; // ✅ just data mapping
  }
}
```

---
name: hexagonal
description: Hexagonal (ports & adapters) architecture reference. Layer definitions, dependency rules, DI patterns, testing strategy per layer, and pre-commit checklist. Auto-loads when working on domain, application, ports, or infrastructure files.
argument-hint: [component name]
paths: src/domain/**, src/application/**, src/ports/**, src/infrastructure/**
---

# /hexagonal — Hexagonal Architecture Reference

Guidance for implementing and validating hexagonal (ports & adapters) architecture.

## Instructions

When invoked with `/hexagonal [component]`, provide architecture guidance for that component.

---

## The Architecture

```
                    ┌─────────────────────────────────┐
                    │          DOMAIN CORE            │
  Inbound           │  Entities, Value Objects,       │           Outbound
  Requests ──────►  │  Domain Services,               │  ──────►  Adapters
  (HTTP, CLI,       │  Business Rules                 │           (DB, Email,
  Events, etc)      │                                 │           Payment, etc)
                    └─────────────────────────────────┘
                              ↑         ↑
                        Application     │
                           Layer        │
                       (Use Cases)      │
                                   Port Interfaces
```

### The Golden Rule
**Dependencies always point INWARD.**
Domain knows nothing about infrastructure. Infrastructure knows everything about ports.

---

## Layer Definitions

### Domain Layer (`src/domain/`)
The heart of the application. No external dependencies — ever.

**What goes here:**
- **Entities**: Objects with identity that change over time (User, Order, Product)
- **Value Objects**: Immutable objects defined by their attributes (Money, Email, Address)
- **Domain Services**: Business logic that doesn't belong to a single entity
- **Domain Events**: Significant things that happened in the domain
- **Aggregates**: Clusters of entities/VOs that form a consistency boundary
- **Domain Exceptions**: Business rule violations

**What NEVER goes here:**
- Database imports (`prisma`, `mongoose`, `pg`, `sqlalchemy`, etc.)
- HTTP clients (`axios`, `fetch`, `requests`)
- Frameworks (`express`, `fastapi`, `spring`)
- Third-party libraries (except pure utility types)

**Example entity structure:**
```typescript
// src/domain/user/User.ts
export class User {
  private constructor(
    private readonly id: UserId,
    private readonly email: Email,
    private name: UserName,
    private readonly createdAt: Date,
  ) {}

  static create(props: CreateUserProps): User { /* ... */ }

  changeName(name: UserName): void { /* domain rule validation */ }

  // No DB calls. No HTTP calls. Pure business logic.
}
```

### Application Layer (`src/application/`)
Orchestrates the flow of data. Depends on Domain + Ports, nothing else.

**What goes here:**
- **Use Cases** (one per user action): `LoginUseCase`, `RegisterUserUseCase`, `PlaceOrderUseCase`
- **Application Services**: Coordinate multiple use cases
- **Command/Query objects**: Typed input for use cases (CQRS pattern if applicable)
- **DTOs**: Data Transfer Objects for crossing layer boundaries

**Structure per use case:**
```typescript
// src/application/auth/LoginUseCase.ts
export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,   // port interface
    private readonly passwordHasher: PasswordHasher,   // port interface
    private readonly tokenService: TokenService,       // port interface
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) throw new UserNotFoundError();
    // ... business orchestration
  }
}
```

### Ports (`src/ports/`)
Interface contracts. The "shape" of what infrastructure must provide.

**Inbound ports** (what the application exposes to the outside):
```typescript
// src/ports/inbound/ILoginUseCase.ts
export interface ILoginUseCase {
  execute(command: LoginCommand): Promise<LoginResult>;
}
```

**Outbound ports** (what the application needs from infrastructure):
```typescript
// src/ports/outbound/UserRepository.ts
export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: UserId): Promise<void>;
}
```

### Infrastructure Layer (`src/infrastructure/`)
Concrete implementations of the ports. All external dependencies live here.

**Organize by technology or by port:**
```
src/infrastructure/
  persistence/
    postgres/           ← if using Postgres
      PostgresUserRepository.ts    implements UserRepository port
      PostgresOrderRepository.ts
    mongodb/
      MongoUserRepository.ts
  http/
    axios/
      AxiosPaymentGateway.ts       implements PaymentGateway port
  email/
    sendgrid/
      SendGridEmailService.ts      implements EmailService port
  auth/
    jwt/
      JwtTokenService.ts           implements TokenService port
```

Every adapter class MUST implement its corresponding port interface.

### Shared (`src/shared/`)
Cross-cutting concerns only. No business logic.

```
src/shared/
  config/             Environment variables, constants
  logging/            Logger abstraction
  errors/             Base error classes
  types/              Shared TypeScript types/utilities
  validation/         Input validation schemas (at boundaries)
```

---

## Dependency Injection (Composition Root)

Wire everything together in one place — the composition root:

```typescript
// src/main.ts or src/composition-root.ts
import { PostgresUserRepository } from './infrastructure/persistence/postgres/PostgresUserRepository';
import { JwtTokenService } from './infrastructure/auth/jwt/JwtTokenService';
import { BcryptPasswordHasher } from './infrastructure/auth/bcrypt/BcryptPasswordHasher';
import { LoginUseCase } from './application/auth/LoginUseCase';

// Build the object graph here — nowhere else
const userRepository = new PostgresUserRepository(db);
const tokenService = new JwtTokenService(config.jwtSecret);
const passwordHasher = new BcryptPasswordHasher();

export const loginUseCase = new LoginUseCase(
  userRepository,
  passwordHasher,
  tokenService,
);
```

---

## Testing Strategy per Layer

| Layer | Test Type | Dependencies Mocked? |
|-------|-----------|---------------------|
| Domain | Unit | Nothing (no deps to mock) |
| Application | Unit | Ports mocked (not infrastructure) |
| Infrastructure | Integration | Real DB/service (or container) |
| Full flow | E2E (Cypress) | Nothing |

**Key insight**: Because infrastructure is behind port interfaces, you can test use cases with mock adapters that return exactly what you need — without a database running.

---

## Common Patterns

### Value Object
```typescript
export class Email {
  private constructor(private readonly value: string) {}

  static create(value: string): Email {
    if (!EMAIL_REGEX.test(value)) throw new InvalidEmailError(value);
    return new Email(value.toLowerCase());
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string { return this.value; }
}
```

### Repository Port
```typescript
export interface [Entity]Repository {
  findById(id: [Entity]Id): Promise<[Entity] | null>;
  save(entity: [Entity]): Promise<void>;
  findAll(filter?: [Entity]Filter): Promise<[Entity][]>;
  delete(id: [Entity]Id): Promise<void>;
}
```

### Use Case
```typescript
export class [Action][Entity]UseCase {
  constructor(private readonly deps: [Action][Entity]UseCaseDeps) {}

  async execute(command: [Action][Entity]Command): Promise<[Action][Entity]Result> {
    // 1. Validate command at application boundary
    // 2. Fetch required domain objects via ports
    // 3. Execute domain logic
    // 4. Persist changes via ports
    // 5. Trigger domain events (if applicable)
    // 6. Return result DTO
  }
}
```

---

## Checklist Before Committing

- [ ] Domain files import ONLY from `src/domain/` and `src/shared/`
- [ ] Application files import ONLY from `src/domain/`, `src/ports/`, `src/shared/`
- [ ] Every infrastructure adapter implements a port interface
- [ ] No `new ConcreteClass()` inside use cases (dependency injection used)
- [ ] No business logic in infrastructure adapters
- [ ] No database/HTTP logic in domain entities
- [ ] Composition root is the only place where adapters are wired to ports

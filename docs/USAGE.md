# Como Usar o Starter Kit — Guia Completo

## O fluxo em 3 comandos

```
/plan [o que quer construir]     → gera o plano completo
/feature-dev [nome-da-feature]   → orquestra a implementação
/tdd ou /hexagonal               → consulta durante a implementação
```

---

## Exemplo End-to-End: "Cadastro de Usuário"

Vamos implementar do zero a feature de cadastro de usuário.
Essa feature exercita **todas** as camadas e **todos** os tipos de teste.

---

### Passo 1 — Planejamento com `/plan`

Digite no Claude Code:
```
/plan cadastro de usuário com email e senha
```

O Claude vai produzir:

**Mapeamento hexagonal:**
```
Domain:         User (entity), Email (value object), Password (value object)
Application:    RegisterUserUseCase
Ports:          UserRepository (outbound), EmailService (outbound)
Infrastructure: PostgresUserRepository, SendGridEmailService
```

**BDD scenarios (criados antes de qualquer código):**
```gherkin
Feature: Cadastro de Usuário
  Scenario: Cadastro com dados válidos
    Given que não existe usuário com email "joao@test.com"
    When o usuário se cadastra com email "joao@test.com" e senha "Senha@123"
    Then o cadastro é realizado com sucesso
    And um email de confirmação é enviado para "joao@test.com"

  Scenario: Email já cadastrado
    Given que já existe usuário com email "joao@test.com"
    When o usuário tenta se cadastrar com email "joao@test.com"
    Then o cadastro é rejeitado com mensagem "Email já cadastrado"

  Scenario: Senha fraca
    When o usuário tenta se cadastrar com senha "123"
    Then o cadastro é rejeitado com mensagem "Senha deve ter ao menos 8 caracteres"
```

**Plano de agentes (para feature simples — modo direto):**
```
Wave 1: [explorer]              → entende estrutura atual
Wave 2: [bdd-writer, planner]   → BDD + design da API
Wave 3: [test-writer, impl-domain] → domínio TDD
Wave 4: [impl-app, impl-infra]  → use case + adapter
Wave 5: [reviewer, e2e-writer]  → qualidade
```

---

### Passo 2 — Implementação com `/feature-dev`

```
/feature-dev user-registration
```

O Claude orquestra automaticamente. Veja o que acontece por dentro:

---

#### 2.1 — Cria worktree isolada

```bash
rtk git worktree add ../myapp-user-registration -b feature/user-registration
```

Todos os agentes trabalham aqui. Nenhum conflito com outras features em andamento.

---

#### 2.2 — BDD Feature File (criado PRIMEIRO)

`tests/bdd/features/user-registration.feature`:
```gherkin
Feature: Cadastro de Usuário
  As a visitante do site
  I want to criar minha conta
  So that eu possa acessar a plataforma

  Background:
    Given o sistema está funcionando

  Scenario: Cadastro com dados válidos
    Given que não existe usuário com email "joao@test.com"
    When o usuário se cadastra com email "joao@test.com" e senha "Senha@123"
    Then o cadastro é realizado com sucesso
    And um email de confirmação é enviado para "joao@test.com"

  Scenario: Email já cadastrado
    Given que já existe usuário com email "joao@test.com"
    When o usuário tenta se cadastrar com email "joao@test.com" e senha "Senha@123"
    Then o cadastro é rejeitado com mensagem "Email já cadastrado"

  Scenario: Senha fraca
    Given que não existe usuário com email "novo@test.com"
    When o usuário tenta se cadastrar com email "novo@test.com" e senha "123"
    Then o cadastro é rejeitado com mensagem "Senha deve ter ao menos 8 caracteres"
```

---

#### 2.3 — Testes de domínio: RED phase (ANTES da implementação)

`tests/unit/domain/Email.test.ts`:
```typescript
describe('Email', () => {
  describe('quando o email é válido', () => {
    it('cria o value object com sucesso', () => {
      const email = Email.create('joao@test.com');
      expect(email.toString()).toBe('joao@test.com');
    });

    it('normaliza para lowercase', () => {
      const email = Email.create('JOAO@TEST.COM');
      expect(email.toString()).toBe('joao@test.com');
    });
  });

  describe('quando o email é inválido', () => {
    it('lança InvalidEmailError para email sem @', () => {
      expect(() => Email.create('invalido')).toThrow(InvalidEmailError);
    });

    it('lança InvalidEmailError para string vazia', () => {
      expect(() => Email.create('')).toThrow(InvalidEmailError);
    });
  });
});
```

Nesse ponto: **os testes falham** (RED ✅ — Email não existe ainda).

---

#### 2.4 — Implementação do domínio: GREEN phase

`src/domain/user/Email.ts`:
```typescript
export class InvalidEmailError extends Error {
  constructor(value: string) {
    super(`Email inválido: "${value}"`);
    this.name = 'InvalidEmailError';
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(private readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      throw new InvalidEmailError(raw);
    }
    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
```

> 📌 **Hook disparou:** `architecture-guard.mjs` verificou que `Email.ts` está em `src/domain/`
> e que não há imports proibidos. Passou. ✅

Testes rodam: **GREEN ✅**

---

#### 2.5 — Value object para Password

`tests/unit/domain/Password.test.ts` (RED → GREEN → REFACTOR — mesmo ciclo):
```typescript
describe('Password', () => {
  it('aceita senha com 8+ caracteres', () => {
    expect(() => Password.create('Senha@123')).not.toThrow();
  });

  it('rejeita senha com menos de 8 caracteres', () => {
    expect(() => Password.create('123')).toThrow('Senha deve ter ao menos 8 caracteres');
  });
});
```

`src/domain/user/Password.ts`:
```typescript
export class Password {
  private constructor(private readonly hashed: string) {}

  static create(raw: string): Password {
    if (raw.length < 8) {
      throw new Error('Senha deve ter ao menos 8 caracteres');
    }
    return new Password(raw); // hashing será feito pelo adapter
  }

  getValue(): string { return this.hashed; }
}
```

---

#### 2.6 — Entidade User

`tests/unit/domain/User.test.ts` (RED → GREEN):
```typescript
describe('User', () => {
  describe('User.create()', () => {
    it('cria usuário com email e senha válidos', () => {
      const user = User.create({
        email: Email.create('joao@test.com'),
        password: Password.create('Senha@123'),
      });
      expect(user.getEmail().toString()).toBe('joao@test.com');
      expect(user.getId()).toBeDefined();
    });
  });
});
```

`src/domain/user/User.ts`:
```typescript
import { randomUUID } from 'crypto'; // OK — crypto é built-in, não infraestrutura
import { Email } from './Email';
import { Password } from './Password';

export class User {
  private constructor(
    private readonly id: string,
    private readonly email: Email,
    private readonly password: Password,
    private readonly createdAt: Date,
  ) {}

  static create(props: { email: Email; password: Password }): User {
    return new User(randomUUID(), props.email, props.password, new Date());
  }

  getId(): string { return this.id; }
  getEmail(): Email { return this.email; }
  getPassword(): Password { return this.password; }
}
```

---

#### 2.7 — Porta (interface do repositório)

`src/ports/outbound/UserRepository.ts`:
```typescript
import { User } from '../../domain/user/User';
import { Email } from '../../domain/user/Email';

export interface UserRepository {
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
}
```

`src/ports/outbound/EmailService.ts`:
```typescript
export interface EmailService {
  sendWelcomeEmail(to: string, name: string): Promise<void>;
}
```

---

#### 2.8 — Use Case com TDD

`tests/unit/application/RegisterUserUseCase.test.ts` (RED):
```typescript
// Fake adapter — implementação em memória do port, SEM banco de dados real
class FakeUserRepository implements UserRepository {
  private users: User[] = [];

  async findByEmail(email: Email): Promise<User | null> {
    return this.users.find(u => u.getEmail().equals(email)) ?? null;
  }

  async save(user: User): Promise<void> {
    this.users.push(user);
  }
}

class FakeEmailService implements EmailService {
  public sentEmails: string[] = [];

  async sendWelcomeEmail(to: string): Promise<void> {
    this.sentEmails.push(to);
  }
}

describe('RegisterUserUseCase', () => {
  let repo: FakeUserRepository;
  let emailService: FakeEmailService;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    repo = new FakeUserRepository();
    emailService = new FakeEmailService();
    useCase = new RegisterUserUseCase(repo, emailService);
  });

  it('cadastra usuário com dados válidos', async () => {
    await useCase.execute({ email: 'joao@test.com', password: 'Senha@123' });
    const saved = await repo.findByEmail(Email.create('joao@test.com'));
    expect(saved).not.toBeNull();
  });

  it('envia email de boas-vindas', async () => {
    await useCase.execute({ email: 'joao@test.com', password: 'Senha@123' });
    expect(emailService.sentEmails).toContain('joao@test.com');
  });

  it('rejeita email duplicado', async () => {
    await useCase.execute({ email: 'joao@test.com', password: 'Senha@123' });
    await expect(
      useCase.execute({ email: 'joao@test.com', password: 'Outra@123' })
    ).rejects.toThrow('Email já cadastrado');
  });
});
```

`src/application/user/RegisterUserUseCase.ts` (GREEN):
```typescript
import { Email } from '../../domain/user/Email';
import { Password } from '../../domain/user/Password';
import { User } from '../../domain/user/User';
import { UserRepository } from '../../ports/outbound/UserRepository';
import { EmailService } from '../../ports/outbound/EmailService';

export class RegisterUserUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(command: { email: string; password: string }): Promise<void> {
    const email = Email.create(command.email);
    const password = Password.create(command.password);

    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new Error('Email já cadastrado');

    const user = User.create({ email, password });
    await this.userRepo.save(user);
    await this.emailService.sendWelcomeEmail(email.toString(), '');
  }
}
```

> 📌 **Hook disparou:** `architecture-guard.mjs` verificou `RegisterUserUseCase.ts` em `src/application/`
> e confirmou que não há imports de `prisma`, `axios`, etc. Passou. ✅

---

#### 2.9 — Adapter de infraestrutura (com teste de integração)

`tests/integration/PostgresUserRepository.test.ts`:
```typescript
// Este teste usa um banco de dados REAL (ou containerizado)
describe('PostgresUserRepository', () => {
  let repo: PostgresUserRepository;

  beforeAll(async () => {
    // Conecta ao banco de teste
    repo = new PostgresUserRepository(testDbConnection);
  });

  beforeEach(async () => {
    await truncateUsersTable(); // Estado limpo entre testes
  });

  it('salva e recupera usuário por email', async () => {
    const user = User.create({
      email: Email.create('test@test.com'),
      password: Password.create('Senha@123'),
    });

    await repo.save(user);
    const found = await repo.findByEmail(Email.create('test@test.com'));

    expect(found).not.toBeNull();
    expect(found!.getEmail().toString()).toBe('test@test.com');
  });

  it('retorna null quando usuário não existe', async () => {
    const found = await repo.findByEmail(Email.create('ghost@test.com'));
    expect(found).toBeNull();
  });
});
```

`src/infrastructure/persistence/postgres/PostgresUserRepository.ts`:
```typescript
import { Pool } from 'pg'; // ✅ Infraestrutura pode importar pg
import { UserRepository } from '../../../ports/outbound/UserRepository';
import { User } from '../../../domain/user/User';
import { Email } from '../../../domain/user/Email';
import { Password } from '../../../domain/user/Password';

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmail(email: Email): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
      [email.toString()]
    );
    if (!result.rows[0]) return null;
    return this.toEntity(result.rows[0]);
  }

  async save(user: User): Promise<void> {
    await this.pool.query(
      'INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, $4)',
      [user.getId(), user.getEmail().toString(), user.getPassword().getValue(), new Date()]
    );
  }

  private toEntity(row: any): User {
    // Reconstitui a entidade a partir dos dados do banco
    return User.reconstitute({
      id: row.id,
      email: Email.create(row.email),
      password: Password.fromHash(row.password_hash),
      createdAt: row.created_at,
    });
  }
}
```

---

#### 2.10 — Cucumber Step Definitions

`tests/bdd/steps/user-registration.steps.ts`:
```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

Given('que não existe usuário com email {string}', async function(email: string) {
  await this.userRepo.clear(); // limpa estado de teste
});

Given('que já existe usuário com email {string}', async function(email: string) {
  await this.useCase.execute({ email, password: 'Senha@123' });
});

When('o usuário se cadastra com email {string} e senha {string}',
  async function(email: string, password: string) {
    try {
      await this.useCase.execute({ email, password });
      this.result = { success: true };
    } catch (e) {
      this.result = { success: false, error: e.message };
    }
  }
);

Then('o cadastro é realizado com sucesso', function() {
  expect(this.result.success).to.be.true;
});

Then('o cadastro é rejeitado com mensagem {string}', function(msg: string) {
  expect(this.result.success).to.be.false;
  expect(this.result.error).to.include(msg);
});

Then('um email de confirmação é enviado para {string}', function(email: string) {
  expect(this.fakeEmailService.sentEmails).to.include(email);
});
```

Roda BDD: `rtk npx cucumber-js` → ✅ todos os cenários passam.

---

#### 2.11 — Cypress E2E

`tests/e2e/user-registration.cy.ts`:
```typescript
describe('Cadastro de Usuário', () => {
  beforeEach(() => {
    cy.visit('/register');
  });

  it('cadastra com dados válidos', () => {
    cy.get('[data-testid="email"]').type('novo@test.com');
    cy.get('[data-testid="password"]').type('Senha@123');
    cy.get('[data-testid="submit"]').click();

    cy.get('[data-testid="success-message"]')
      .should('contain', 'Cadastro realizado');
  });

  it('exibe erro para email já cadastrado', () => {
    cy.get('[data-testid="email"]').type('existente@test.com');
    cy.get('[data-testid="password"]').type('Senha@123');
    cy.get('[data-testid="submit"]').click();

    cy.get('[data-testid="error-message"]')
      .should('contain', 'Email já cadastrado');
  });

  it('exibe erro para senha fraca', () => {
    cy.get('[data-testid="email"]').type('novo@test.com');
    cy.get('[data-testid="password"]').type('123');
    cy.get('[data-testid="submit"]').click();

    cy.get('[data-testid="error-message"]')
      .should('contain', 'Senha deve ter ao menos 8 caracteres');
  });
});
```

Roda: `rtk npx cypress run` → ✅

---

#### 2.12 — k6 Load Test

`tests/load/user-registration.js`:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 20 },    // ramp up
    { duration: '2m',  target: 50 },    // steady state
    { duration: '30s', target: 100 },   // peak
    { duration: '30s', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const email = `loadtest+${randomString(8)}@test.com`;

  const res = http.post(
    'http://localhost:3000/api/users/register',
    JSON.stringify({ email, password: 'Senha@123' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    'status 201': r => r.status === 201,
    'tem id': r => JSON.parse(r.body).id !== undefined,
  });

  sleep(1);
}
```

Roda: `rtk k6 run tests/load/user-registration.js`

---

#### 2.13 — Code Review (automático pelo `/feature-dev`)

O Claude lança um agente `code-reviewer` que verifica:

```
REVIEW: PASS
Bloqueadores: Nenhum
Sugestões:
  - Considerar adicionar domain event UserRegistered para notificar outros bounded contexts
  - Password.fromHash() precisa de teste para o caminho de reconstituição do banco
```

Implementa as sugestões → roda testes novamente → PASS.

---

#### 2.14 — Commit e limpeza

```bash
rtk git add src/domain/user/ src/application/user/ src/ports/ \
            src/infrastructure/persistence/ \
            tests/unit/ tests/integration/ tests/bdd/ tests/e2e/ tests/load/

rtk git commit -m "feat(user): implement user registration with email validation"

rtk git checkout main
rtk git merge feature/user-registration
rtk git worktree remove ../myapp-user-registration
```

---

### Resultado: o que foi criado

```
src/
├── domain/user/
│   ├── Email.ts              + Email.test.ts
│   ├── Password.ts           + Password.test.ts
│   └── User.ts               + User.test.ts
├── application/user/
│   └── RegisterUserUseCase.ts + RegisterUserUseCase.test.ts
├── ports/outbound/
│   ├── UserRepository.ts
│   └── EmailService.ts
└── infrastructure/persistence/postgres/
    └── PostgresUserRepository.ts + PostgresUserRepository.integration.test.ts

tests/
├── bdd/features/user-registration.feature
├── bdd/steps/user-registration.steps.ts
├── e2e/user-registration.cy.ts
└── load/user-registration.js
```

**Gates verificados:**
- ✅ 12 testes unitários passando
- ✅ 2 testes de integração passando
- ✅ 3 cenários BDD passando
- ✅ 3 testes Cypress E2E passando
- ✅ k6: p95 = 87ms @ 100 RPS (abaixo do limite de 200ms)
- ✅ Code review aprovado

---

## Quando usar modo simples vs. agente teams

### Modo simples (direto, sem orquestração de agentes)
Para features que você mesmo consegue implementar em < 2 horas:

```
/tdd implement Email value object
```
Você segue o RED → GREEN → REFACTOR manualmente.

### Modo agente teams (via `/feature-dev`)
Para features com múltiplas camadas ou que se beneficiam de paralelismo:

```
/feature-dev user-registration
```
O Claude orquestra automaticamente, lançando até 5 agentes por wave.

**Regra prática:** se a feature toca mais de 2 camadas hexagonais E tem > 5 arquivos para criar, use `/feature-dev`.

---

## Consultando skills durante o trabalho

```
/hexagonal RegisterUserUseCase     → orienta sobre a camada correta
/tdd Password value object         → guia o ciclo RED/GREEN/REFACTOR
/frontend-design registration form → design + implementação do formulário
```

---

## Adaptando para sua stack

O starter kit detecta automaticamente a stack via `session-start.mjs`.
Ajuste os paths em `.claude/architecture.json` se necessário:

```json
{
  "layers": {
    "domain": { "pattern": "src/domain/" },
    "application": { "pattern": "src/application/" }
  }
}
```

Para Python: `"pattern": "app/domain/"` ou `"pattern": "src/domain/"`
Para Go: `"pattern": "internal/domain/"` ou `"pattern": "pkg/domain/"`
Para Java/Spring: `"pattern": "src/main/java/com/company/domain/"`

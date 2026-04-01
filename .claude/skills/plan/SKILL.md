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

### 0. Ler contexto de pesquisa
> **Emit:** `▶ [0/8] Lendo contexto de pesquisa`

Se `RESEARCH.md` existir no projeto, leia-o integralmente antes de qualquer planejamento.
Extraia e registre internamente:

- **APIs descobertas:** endpoints, autenticação, rate limits → cada endpoint vira uma task específica
- **Regras de negócio identificadas:** cada regra vira um BDD scenario concreto
- **Concorrentes analisados:** padrões e decisões de arquitetura informadas pelas referências
- **Padrões de implementação:** abordagens encontradas nos achados de referência
- **Domain terminology:** vocabulário do domínio para nomear entidades e use cases corretamente

Se RESEARCH.md não existir, prossiga com o planejamento baseado na descrição fornecida
e adicione uma nota no plano: "⚠ Sem RESEARCH.md — considere executar /research antes para embasar decisões."

### 1. Understand the Feature
> **Emit:** `▶ [1/8] Understanding Feature`
- Restate the requirement in your own words to confirm understanding
- Identify the user-facing behavior (what the user can do)
- Identify the business rules (invariants, validations, constraints)

### 2. Hexagonal Architecture Mapping
> **Emit:** `▶ [2/8] Architecture Mapping`
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

Se RESEARCH.md tiver APIs identificadas:
  → Cada API externa = um outbound port + infrastructure adapter específico
  → Nomear o adapter com base na API real (ex: StripePaymentAdapter, not GenericHttpAdapter)

Se RESEARCH.md tiver domain rules:
  → Cada regra de negócio = uma entidade de domínio ou domain service específico
  → Usar a terminologia exata do domínio encontrada na pesquisa

### 3. BDD Scenarios (write these FIRST)
> **Emit:** `▶ [3/8] Writing BDD Scenarios`
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

Se RESEARCH.md tiver regras de domínio ou edge cases:
  → Criar um Scenario para cada regra identificada
  → Criar Scenarios para os edge cases encontrados na pesquisa
  → Usar o vocabulário exato do domínio nos Given/When/Then

### 4. Test Plan
> **Emit:** `▶ [4/8] Test Plan`
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
> **Emit:** `▶ [5/8] Implementation Order`
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

### 6. Agent Wave Decomposition
> **Emit:** `▶ [6/8] Agent Wave Decomposition`

Para cada componente independente identificado no planejamento, criar uma task granular seguindo o protocolo de Agents.md:

**Critérios de granularidade (obrigatórios):**
- Cada task deve ser descrita em 1-2 frases. Se precisar de mais → dividir.
- Max 25 arquivos para ler por agente
- Max 15 arquivos para criar/modificar por agente
- Max 300 linhas de código por agente
- Estimativa de tokens: (arquivos × 1.5k) + (linhas × 20) + 25k overhead < 85k

**Formato de cada task:**
```
TASK [N]:
  tipo:     [explorer | test-writer | implementer | reviewer | bdd-writer | e2e-writer]
  tarefa:   [uma frase — exatamente o que fazer]
  lê:       [lista exata de arquivos — max 25]
  cria/modifica: [lista exata — max 15]
  depende de: [TASK X, ou "nenhuma" se pode rodar em wave 1]
  tokens estimados: [Xk]
```

**Organizar em waves:**
- Wave 1: tasks sem dependências (exploration, BDD scenarios)
- Wave 2: tasks que dependem de Wave 1 (domain tests + domain impl)
- Wave 3: tasks que dependem de Wave 2 (application + infrastructure)
- Wave N+1: apenas quando Wave N estiver completa

Máximo 5 tasks por wave.
Se feature precisar de mais de 5 tasks em paralelo → criar sub-waves.

Se RESEARCH.md tiver APIs identificadas:
  → Criar tasks específicas de integração por endpoint (não "implementar integração", mas "implementar POST /payments endpoint no StripeAdapter")

### 7. Git Strategy
> **Emit:** `▶ [7/8] Git Strategy`
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
> **Emit:** `▶ [8/8] Definition of Done`
- [ ] All BDD scenarios pass (Cucumber)
- [ ] All unit tests pass (100% of business logic)
- [ ] All integration tests pass
- [ ] Code review approved (no blockers)
- [ ] Cypress E2E tests pass (if UI)
- [ ] k6 load test within SLA (if endpoint)
- [ ] No linting errors
- [ ] Architecture layers respected (no cross-layer violations)

---

## Protocolo de agentes

Para execução com agentes paralelos, cada task acima segue o protocolo completo de `Agents.md`:
- Cada agente recebe: task (1 frase), contexto da wave anterior, constraints relevantes, lista exata de arquivos
- Cada agente produz: handoff com arquivos criados/modificados, decisões, issues, next_needs
- O orquestrador agrega os handoffs antes de iniciar a wave seguinte

Leia `Agents.md` para o protocolo completo de orchestração, token budget e formato de handoff.

---

After presenting the plan, ask: **"Shall I proceed with `/feature-dev [feature-name]` to implement this?"**

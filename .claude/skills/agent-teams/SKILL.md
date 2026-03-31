---
name: agent-teams
description: Orchestrate multiple parallel agent teams for large-scale work. Token budget estimation, worktree isolation per team, wave decomposition, and handoff aggregation protocol.
disable-model-invocation: true
---

# /agent-teams — Multi-Team Parallel Orchestration

Orquestra múltiplos times de agentes em paralelo para trabalho de grande escala.
Cada time tem 3–5 agentes. Cada agente tem janela de contexto máxima de 100k tokens.
O orquestrador garante granularidade antes de despachar qualquer time.

---

## Quando usar

Use `/agent-teams` quando a tarefa:
- Envolve 3+ features ou componentes independentes simultaneamente
- Teria mais de 500 linhas de código no total
- Pode ser dividida em workstreams que não dependem uns dos outros
- Se beneficia de paralelismo real (diferentes partes do sistema)

Use `/feature-dev` para features únicas.
Use `/agent-teams` para múltiplas features ou features muito grandes em paralelo.

---

## Modelo Mental

```
ORQUESTRADOR (você, Claude principal)
├── Time Alpha  ←── worktree: feature/alpha
│   ├── Agente 1 (explorer)
│   ├── Agente 2 (test-writer)
│   └── Agente 3 (implementer)
│
├── Time Beta   ←── worktree: feature/beta
│   ├── Agente 1 (explorer)
│   ├── Agente 2 (implementer)
│   └── Agente 3 (reviewer)
│
└── Time Gamma  ←── worktree: feature/gamma
    ├── Agente 1 (bdd-writer)
    ├── Agente 2 (implementer)
    └── Agente 3 (e2e-writer)

Os 3 times rodam em PARALELO (Agent tool calls simultâneos).
Cada time gerencia seus próprios waves internos.
Orquestrador agrega resultados ao final.
```

---

## Protocolo do Orquestrador

### Etapa 1 — Decomposição em Workstreams

Antes de criar qualquer time, o orquestrador:

1. Recebe o objetivo geral
2. Identifica workstreams independentes (sem dependência de dados entre si)
3. Para cada workstream, estima o budget de tokens:

```
ESTIMATIVA DE TOKEN BUDGET:
  Arquivos a ler:      N × ~1.500 tokens/arquivo
  Raciocínio interno:  ~20.000 tokens fixos
  Código a gerar:      linhas × ~20 tokens/linha
  Handoff de saída:    ~5.000 tokens fixos
  ─────────────────────────────────────────────
  Total estimado:      deve ficar abaixo de 85.000 tokens

  Se estimativa > 85k → dividir o workstream em 2
  Se estimativa < 20k → considerar fundir com outro workstream pequeno
```

**Regras práticas para granularidade:**
- Max 25 arquivos para ler por time
- Max 15 arquivos para criar/modificar por time
- Max 300 linhas de código por time
- Uma tarefa deve ser descrita em 1–2 frases. Se precisar de mais → muito grande.

### Etapa 2 — Criação dos Times

Para cada workstream aprovado, crie um **Time Brief**:

```
TIME BRIEF — [Nome do Time]
──────────────────────────────────────────────
Workstream:    [o que este time vai construir]
Worktree:      rtk git worktree add ../[proj]-[nome] -b feature/[nome]
Arquivos lidos: [lista exata de arquivos — max 25]
Arquivos criados/modificados: [lista exata — max 15]
Restrições:    [regras relevantes de Rules.md]
Agentes (3–5): [lista com tipo e tarefa de cada um]
Budget estimado: [Xk tokens]
Output esperado: [o que o time deve retornar]
```

### Etapa 3 — Lançamento Paralelo

Lance todos os times **no mesmo turno** (múltiplos Agent tool calls simultâneos):

```
← Turno único do orquestrador →
  Agent(Time Alpha, run_in_background=false)
  Agent(Time Beta,  run_in_background=false)
  Agent(Time Gamma, run_in_background=false)
```

Cada time roda de forma independente em sua worktree.
O orquestrador aguarda todos completarem antes de prosseguir.

### Etapa 4 — Waves Internas por Time

Dentro de cada time, o agente-líder organiza waves internas:

```
Wave Interna 1 (exploração):
  Explorer — entende o contexto específico do workstream

Wave Interna 2 (testes primeiro — TDD):
  Test-writer — escreve testes falhos (RED)

Wave Interna 3 (implementação):
  Implementer — faz os testes passarem (GREEN → REFACTOR)

Wave Interna 4 (qualidade):
  Reviewer — revisa código do próprio time
```

Máximo 5 agentes por wave interna. Se um wave precisar de mais → cria wave adicional.

### Etapa 5 — Handoff e Agregação

Cada time retorna ao orquestrador:

```
RELATÓRIO DO TIME — [Nome]
──────────────────────────────────────────────
Status:          [COMPLETO | PARCIAL | BLOQUEADO]
Arquivos criados: [lista]
Arquivos modificados: [lista]
Testes:          [N unit, N integration, N BDD]
Issues:          [problemas encontrados ou "Nenhum"]
Dependências descobertas: [coisas que outros times precisam saber]
Próximos passos: [o que o orquestrador deve fazer após merge]
```

O orquestrador:
1. Coleta todos os relatórios
2. Verifica conflitos entre workstreams
3. Faz merge das branches na feature branch principal
4. Lança um time final de review global (se necessário)

---

## Exemplo: Feature Grande em Múltiplos Times

### Objetivo: "Sistema completo de pedidos (orders)"

#### Decomposição do orquestrador:

```
Workstream A — Domínio de pedidos
  Estimativa: 15 arquivos lidos × 1.5k + 200 linhas × 20 = ~26k tokens ✅
  Arquivos: Order entity, OrderItem VO, OrderStatus VO, testes unitários

Workstream B — Use cases de pedidos
  Estimativa: 20 arquivos lidos × 1.5k + 250 linhas × 20 = ~35k tokens ✅
  Arquivos: PlaceOrderUseCase, CancelOrderUseCase, testes unitários

Workstream C — Infraestrutura + API
  Estimativa: 18 arquivos lidos × 1.5k + 300 linhas × 20 = ~33k tokens ✅
  Arquivos: PostgresOrderRepository, OrderController, testes integração

Dependência: C depende de A e B → C roda em wave separada
```

#### Lançamento:

```
Wave de Times 1 (paralelo):
  Agent(Time A — domínio)    → worktree: proj-orders-domain
  Agent(Time B — use cases)  → worktree: proj-orders-usecases

Wave de Times 2 (após Wave 1):
  Agent(Time C — infra+api)  → worktree: proj-orders-infra
  Agent(Time D — BDD+E2E)    → worktree: proj-orders-tests
```

#### Cada time internamente:

```
Time A — Domínio (3 agentes):
  Agente 1 (explorer):      explora padrões existentes de entities
  Agente 2 (test-writer):   escreve Order.test.ts, OrderItem.test.ts (RED)
  Agente 3 (implementer):   implementa Order, OrderItem, OrderStatus (GREEN)

Time B — Use Cases (4 agentes):
  Agente 1 (explorer):      explora use cases existentes para padrão
  Agente 2 (test-writer):   escreve PlaceOrderUseCase.test.ts (RED)
  Agente 3 (implementer):   implementa PlaceOrderUseCase (GREEN)
  Agente 4 (reviewer):      revisa SOLID + hexagonal compliance
```

---

## Gerenciamento de Janela de Contexto

### Cada agente monitora seu próprio budget:

```
BUDGET POR AGENTE:
├── Contexto recebido (brief + handoffs anteriores): ≤ 20k tokens
├── Trabalho ativo (leitura, raciocínio, escrita):   ≤ 70k tokens
└── Handoff de saída:                                ≤ 5k tokens
                                              TOTAL: ≤ 95k tokens
```

### Se um agente se aproximar de 80k tokens consumidos:

1. Para o trabalho atual
2. Escreve handoff parcial: `Status: PARCIAL`
3. Descreve exatamente onde parou e o que falta
4. Sinaliza ao time-líder para lançar agente de continuação

### O orquestrador previne overflow com a regra de granularidade:
- Nenhum workstream passa para um time sem estimativa de budget
- Se estimativa > 85k → workstream dividido antes de lançar

---

## Estrutura de Worktrees por Time

```bash
# Orquestrador cria worktrees antes de lançar os times
rtk git worktree add ../[proj]-[workstream-a] -b feature/[workstream-a]
rtk git worktree add ../[proj]-[workstream-b] -b feature/[workstream-b]
rtk git worktree add ../[proj]-[workstream-c] -b feature/[workstream-c]

# Após todos os times completarem:
rtk git checkout feature/[feature-principal]
rtk git merge feature/[workstream-a]
rtk git merge feature/[workstream-b]
rtk git merge feature/[workstream-c]

# Limpeza
rtk git worktree remove ../[proj]-[workstream-a]
rtk git worktree remove ../[proj]-[workstream-b]
rtk git worktree remove ../[proj]-[workstream-c]
```

---

## Checklist do Orquestrador

Antes de lançar qualquer time:
- [ ] Workstreams são independentes (sem race condition de dados)
- [ ] Estimativa de tokens calculada para cada workstream (< 85k)
- [ ] Time Brief escrito para cada time (agentes definidos, arquivos listados)
- [ ] Worktrees criadas
- [ ] Dependências entre workstreams mapeadas (qual wave deve esperar qual)

Após todos os times completarem:
- [ ] Todos os relatórios coletados
- [ ] Nenhum time retornou `Status: BLOQUEADO` sem resolução
- [ ] Merge das branches sem conflitos
- [ ] Suite completa de testes rodando na branch merged
- [ ] Review global (se mudanças cruzam múltiplos workstreams)

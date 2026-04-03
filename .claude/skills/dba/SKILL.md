---
name: dba
description: Database schema design, data modeling, indexing strategy, and migration planning. ORM-aware (Prisma, TypeORM, Drizzle, Django ORM, ActiveRecord). Use before implementing features that introduce new entities or modify the existing schema.
disable-model-invocation: true
argument-hint: [scope: design | index | seed | multi-tenant | review]
---

# /dba — Database Schema Design

> Modelagem de dados, design de schema, estratégia de índices e padrões de multi-tenancy.
> Chamado antes de implementar features que introduzem novas entidades ou modificam o schema existente.
> Output alimenta o `/feature-dev` e o `/data-migration` com o schema aprovado.

---

## Quando invocar

| Situação | Scope recomendado |
|---------|-------------------|
| Feature nova com entidades não mapeadas | `design` |
| Schema existente com suspeita de missing indexes | `index` |
| Adicionar multi-tenancy ao projeto | `multi-tenant` |
| Revisão de schema antes de ir para produção | `review` |
| Dados de desenvolvimento e testes | `seed` |

---

## Scope: design (padrão)

> Design completo de schema para um domínio ou feature.

### Fase 1 — Entidades e relações

> **Emit:** `▶ [1/4] Entidades e relações`

Lê IDEAS.md, PLAN.md ou RESEARCH.md se existirem para extrair entidades identificadas.
Se não existirem, solicita ao usuário uma descrição do domínio antes de continuar.

Apresenta o modelo ER inicial:
- Entidades (substantivos do domínio)
- Atributos de cada entidade com tipos sugeridos
- Relacionamentos (1:1, 1:N, N:M) com cardinalidade e constraints
- Identificação de entidades de auditoria (precisam de `created_at`, `updated_at`)

**Pausa obrigatória:** apresenta modelo → aguarda aprovação antes de continuar.

### Fase 2 — Decisões de modelagem

> **Emit:** `▶ [2/4] Decisões de modelagem`

Para cada entidade com atributos variáveis ou relações N:M, documenta a decisão:

| Padrão | Quando usar | Trade-off |
|--------|------------|-----------|
| **Normalizar (3NF)** | Alta taxa de escrita, integridade crítica (financeiro, usuários) | Mais JOINs em leitura |
| **Desnormalizar** | Leituras frequentes, dashboards, analytics, dados históricos | Duplicação; mais cuidado em escrita |
| **JSON/JSONB column** | Atributos variáveis por registro (ex: metadados, configs por tenant) | Sem FK constraints; índices GIN para buscas |
| **Tabela de lookup** | Enums que mudam raramente ou que precisam de FK | Simples, FK-safe, auditável |
| **Soft delete** | Entidades com histórico, auditoria, possibilidade de restore | Campo `deleted_at`; queries precisam de filtro |

Documenta a decisão de cada entidade com justificativa.

### Fase 3 — Schema no ORM do projeto

> **Emit:** `▶ [3/4] Schema`

Detecta o ORM instalado:
```
Prisma:    prisma/schema.prisma existe OU @prisma/client em package.json
TypeORM:   typeorm em package.json OU DataSource config
Drizzle:   drizzle-orm em package.json
Sequelize: sequelize em package.json
Django:    models.py existe OU django no requirements.txt
Rails:     schema.rb ou Gemfile com activerecord
```

Gera o schema completo no formato do ORM detectado.

**Padrões obrigatórios em toda entidade:**
- Primary key: UUID/CUID (não sequential ID em entidades expostas por API)
- Timestamps: `created_at`, `updated_at` em toda entidade persistida
- Soft delete: `deleted_at` nullable em entidades que precisam de histórico
- Unique constraints explícitos nos campos de negócio (email, slug, código)

### Fase 4 — Estratégia de índices

> **Emit:** `▶ [4/4] Índices`

Regras aplicadas:

```
SEMPRE indexar:
  □ Primary keys (automático)
  □ Foreign keys usadas em JOINs frequentes
  □ Colunas em cláusulas WHERE de queries de leitura frequente
  □ Colunas em ORDER BY de listas paginadas
  □ Campos com unique constraint

NÃO indexar por padrão:
  □ Colunas com baixa cardinalidade (boolean, status com 2-3 valores) — avaliar caso a caso
  □ Colunas raramente usadas em queries de leitura
  □ Tabelas com menos de 10k rows — o overhead supera o benefício

ÍNDICES ESPECIAIS:
  □ Índice composto: quando WHERE usa múltiplas colunas (ordem importa — leftmost prefix)
  □ Partial index: quando a query tem condição fixa (ex: WHERE is_active = true)
  □ GIN index: para colunas JSONB ou full-text search
  □ BRIN index: para colunas de timestamp em tabelas muito grandes e append-only
```

Apresenta lista de índices recomendados com a query que justifica cada um.

---

## Scope: review

> Audita o schema existente e identifica problemas.

Lê o schema atual e verifica:

```
□ FK columns sem índice correspondente
□ Colunas usadas em WHERE frequente (verificar via código) sem índice
□ Relações N:M sem tabela de junção explícita
□ Campos nullable que devem ser NOT NULL
□ Campos que devem ser unique mas não têm constraint
□ Tabelas com mais de 40 colunas (candidato a decomposição)
□ Entidades de auditoria sem created_at / updated_at
□ Mistura de UUID e sequential ID para a mesma entidade
□ Soft delete inconsistente (algumas entidades têm, outras não)
□ Enums inline que deveriam ser tabelas de lookup (se precisam de FK)
```

Output: lista de issues com severidade (BLOCKER | MAJOR | MINOR) e sugestão de fix.

---

## Scope: multi-tenant

> Adiciona suporte a multi-tenancy ao schema existente.

Apresenta as 3 estratégias com recomendação baseada no scale declarado:

| Estratégia | Isolamento | Complexidade | Scale recomendado |
|-----------|-----------|--------------|------------------|
| **Row-level** (tenant_id em cada tabela) | Software | Baixa | MVP, Product |
| **Schema por tenant** (PostgreSQL schemas) | Banco | Média | Product, Scale |
| **Database por tenant** | Infra | Alta | Scale + compliance exigindo isolamento total |

**Para MVP e Product → row-level isolation:**

1. Adiciona coluna `tenant_id` (UUID, NOT NULL, FK para tabela `tenants`) nas tabelas de negócio
2. Adiciona índice composto `[tenant_id, <primary_lookup_column>]` em cada tabela
3. Para PostgreSQL: configura Row Level Security (RLS) como camada de segurança adicional
4. Gera a migration via `/data-migration` com as alterações

---

## Scope: seed

> Gera seed data estruturado para desenvolvimento e testes.

### Quando cada seed é gerado

| Seed | Quando gerar | Automático? |
|------|-------------|-------------|
| **Dev** | Sempre — todo projeto com UI precisa de dados variados para design e teste visual | ✅ Automático ao invocar `/dba seed` |
| **Test** | Sempre — fixtures são necessários para unit e integration tests desde o início | ✅ Automático ao invocar `/dba seed` |
| **Staging** | Sob demanda — apenas quando staging/demo existe ou está sendo configurado | ⚡ Sob demanda: `/dba seed staging` |

### Seed de desenvolvimento (`src/shared/seeds/dev.ts`)

**Gerado automaticamente.** Cobre todos os estados visuais da UI:
- Lista vazia (para testar empty states)
- Lista com 1 item (para testar singular)
- Lista com muitos itens (para testar paginação e scroll)
- Items com campos opcionais preenchidos e outros vazios
- Items em diferentes estados (ativo/inativo, pendente/aprovado, etc.)
- Credenciais de usuário de teste documentadas no README de desenvolvimento

### Seed de testes (`tests/fixtures/`)

**Gerado automaticamente.** Dados mínimos e determinísticos:
- Factories por entidade: funções `create[Entity](overrides?)` com valores padrão sensatos
- Uso: `const user = createUser({ role: 'admin' })` — explícito e legível nos testes

### Seed de staging (`src/shared/seeds/staging.ts`)

**Sob demanda.** Dados realistas para demo e QA manual:
- Suficiente para simular uso real (ex: 5-10 projetos, 20-30 tarefas, 3-5 usuários)
- Sem dados pessoais reais — usar faker.js para gerar nomes, emails, endereços sintéticos
- Script de reset: `rtk npm run seed:staging` deve ser idempotente (pode rodar múltiplas vezes)

---

## Integração com outras skills

| Quando | O que acontece |
|--------|---------------|
| `/build` detecta novas entidades no plano | Chama `/dba design` antes da implementação |
| `/feature-dev` Fase 4 (Architecture Design) | Usa o schema aprovado pelo `/dba` como referência |
| `/data-migration` | Recebe o schema definido aqui e gera as migrations |
| `/perf-audit` | Usa a estratégia de índices definida aqui para diagnosticar N+1 |

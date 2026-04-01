---
name: qa-loop
description: Agentic QA orchestrator. Runs tiered quality gates (research, design, UX, backend, security, E2E) with automatic fix loops. Called from /build and /feature-dev at all quality gates.
disable-model-invocation: true
argument-hint: <scope: o que foi construído>
---

# /qa-loop — QA Agentic Loop

Orquestrador de QA multi-dimensional. Lança agentes QA em waves paralelas, agrega findings em um QA Report estruturado, spawna agentes de fix para issues BLOCKER/MAJOR e itera até PASS ou escala para o usuário.

---

## Quando invocar

| Contexto | Dimensões |
|---------|-----------|
| Foundation [3a] — layout + design system | `qa-design` |
| Foundation [3b] — auth | `qa-backend` `qa-security` `qa-e2e` |
| Após feature com UI + backend | `qa-design` `qa-ux` `qa-backend` `qa-security` `qa-e2e` |
| Após feature backend-only | `qa-backend` `qa-security` `qa-code` |
| Após feature UI-only | `qa-design` `qa-ux` `qa-a11y` |
| Após research/plan | `qa-research` `qa-plan` |
| Final do build | todas as dimensões |
| Manual: `/qa-loop <scope>` | inferir dimensões do escopo |

---

## Fase 0 — Scope Analysis

> **Emitir:** `▶ [QA 0/6] Scope Analysis`

1. Identificar o que foi construído — ler arquivos modificados (git diff ou handoff do agente)
2. Determinar dimensões aplicáveis:
   - Há UI? → `qa-design` + `qa-ux` + `qa-a11y`
   - Há API/backend? → `qa-backend` + `qa-security`
   - Há fluxo de usuário completo? → `qa-e2e`
   - É fase de research? → `qa-research`
   - É fase de plan? → `qa-plan`
   - Há código novo? → `qa-code` (sempre)
3. Definir escopo da `qa-e2e`: quais fluxos específicos testar (ex: auth, criar board, criar card)
4. Emitir: `Escopo: [o que foi construído]. Dimensões: [lista]. Fluxos E2E: [lista].`

---

## Fase 1 — Wave Estática (paralela, sem browser)

> **Emitir:** `▶ [QA 1/6] Static QA Wave`

Lança em paralelo apenas os agentes aplicáveis ao escopo:

### Agente: qa-code

```
Role: Code quality auditor — arquitetura, TDD e clean code.
Ler: todos os arquivos modificados no escopo.
Check:
  □ Arquitetura: layers respeitadas? Imports corretos por camada?
  □ TDD: todo comportamento tem teste escrito antes? RED→GREEN→REFACTOR?
  □ SOLID: SRP (função faz uma coisa), OCP, LSP, ISP, DIP (depende de abstrações)?
  □ Clean code: nomes revelam intenção? Sem magic numbers/strings? Sem dead code?
  □ Cobertura: domain + application têm unit tests correspondentes?
  □ Sem TODO antigo ou código comentado (usar git history)
Output: QA_REPORT com BLOCKER|MAJOR|MINOR|OK por item + arquivo:linha exatos
```

### Agente: qa-security

```
Role: Security auditor — injection, auth e data exposure.
Ler: endpoints, controllers, adapters modificados.
Check:
  □ SQL injection: queries parametrizadas ou ORM? Nunca string concatenation com input
  □ XSS: user input nunca em dangerouslySetInnerHTML sem sanitize
  □ Auth: rotas protegidas verificam autenticação antes de processar?
  □ Auth: rotas protegidas verificam autorização (não só autenticação)?
  □ Secrets: nenhum API key, password ou token hardcoded no código
  □ CORS: policy explícita, sem wildcard em produção
  □ Data exposure: respostas não expõem campos sensíveis (hash de senha, tokens internos, IDs sequenciais)
  □ Input sanitization: user input sanitizado antes de armazenar
  □ Rate limiting: endpoints públicos têm proteção?
Output: QA_REPORT com BLOCKER|MAJOR|MINOR|OK + evidência (arquivo:linha)
```

### Agente: qa-backend

```
Role: API + backend quality auditor.
Ler: route handlers, controllers, use cases modificados.
Check:
  □ Input validation: todos os inputs de API validados antes do processamento
  □ Error handling: todos os erros capturados, resposta estruturada retornada
  □ HTTP semantics: métodos corretos (GET/POST/PUT/PATCH/DELETE), status codes corretos
  □ Response format: formato de sucesso e erro consistente em todos os endpoints
  □ Auth gates: endpoints protegidos rejeitam sem token → 401, token inválido → 401, sem permissão → 403
  □ Idempotência: POSTs que criam recursos tratam duplicatas (unique constraint ou check)
  □ N+1 queries: queries dentro de loops identificadas e resolvidas
  □ Pagination: endpoints de lista têm paginação?
Output: QA_REPORT com BLOCKER|MAJOR|MINOR|OK + arquivo:linha
```

### Agente: qa-research

```
Role: Research quality auditor — rigor e completude da pesquisa.
Ler: RESEARCH.md
Check:
  □ Todas as escolhas de biblioteca referenciadas a achados reais (não "escolhemos por ser popular")
  □ Trade-offs documentados para cada decisão arquitetural major
  □ Seção de pitfalls específica ao domínio (não genérica)
  □ Múltiplas fontes consultadas por tópico (não só uma)
  □ Nenhuma decisão crítica tomada "por padrão" sem justificativa documentada
  □ Referências com URLs reais (não invented links)
Output: QA_REPORT com MAJOR|MINOR|OK
```

### Agente: qa-plan

```
Role: Plan quality auditor — BDD completude e cobertura arquitetural.
Ler: PLAN.md, arquivos .feature em tests/bdd/features/
Check:
  □ Cada user story tem pelo menos 1 Gherkin scenario (happy path)
  □ Edge cases documentados como scenarios separados
  □ Scenarios usam terminologia do domínio (não termos técnicos)
  □ Architecture mapping cobre todos os layers necessários
  □ Definition of Done tem critérios mensuráveis (não vagos)
  □ Test plan cobre unit + integration + E2E + load (se aplicável)
  □ Sem "TBD" ou decisões adiadas em itens críticos
Output: QA_REPORT com BLOCKER|MAJOR|MINOR|OK
```

---

## Fase 2 — Wave Visual (paralela, usa agent-browser)

> **Emitir:** `▶ [QA 2/6] Visual QA Wave`

Usa agent-browser para navegar nas páginas do escopo. Lança em paralelo:

### Agente: qa-design

```
Role: Visual design auditor — alinhamento, espaçamento e consistência.
Actions: agent-browser → abrir cada página/componente do escopo, tirar screenshots.
Check:
  □ Alinhamento: elementos alinhados a grid? Sem posicionamento arbitrário?
  □ Espaçamento: consistente? Usa tokens do design system (não px arbitrários)?
  □ Tipografia: hierarquia clara (h1 > h2 > body > caption)? Max 3 tamanhos por contexto?
  □ Estados: loading / error / empty states existem para todos os componentes data-dependent?
  □ Elementos interativos: todos têm hover + focus + active states visíveis?
  □ Responsividade: sem horizontal scroll no mobile? Sem overflow? Layout adapta?
  □ Overlapping: nenhum elemento sobreposto inesperadamente? (z-index controlado)
  □ Design system: usando primitivos (shadcn/ui)? Não reinventando botões, inputs, cards com divs?
  □ Ícones: biblioteca consistente (Lucide ou similar), não misturada com outras fontes?
  □ Contraste: texto legível? (WCAG AA: 4.5:1 mínimo para texto normal)
  □ Dark/light mode: funciona em ambos se configurado?
Evidence: screenshot de cada issue encontrado
Output: QA_REPORT com BLOCKER|MAJOR|MINOR|OK + screenshot path
```

### Agente: qa-ux

```
Role: UX flow auditor — usabilidade, feedback e recovery.
Actions: agent-browser → simular fluxos de usuário do escopo.
Check:
  □ Fluxo primário: usuário consegue completar a tarefa principal sem instruções?
  □ Feedback imediato: ações têm loading state? Sucesso/erro confirmado visualmente?
  □ Recovery: todo estado de erro tem caminho de recuperação claro (não dead end)?
  □ Navegação: usuário sabe onde está? Breadcrumb ou indicador de posição?
  □ Confirmação: ações destrutivas (delete, logout, cancel) pedem confirmação?
  □ Validação de form: em tempo real + mensagens úteis (o que fazer, não só "campo inválido")
  □ Empty states: explicam o que fazer ("Crie seu primeiro board →"), não só "sem dados"
  □ Consistência: padrões de interação consistentes em todo o app?
  □ Affordance: é óbvio o que é clicável/interativo?
Output: QA_REPORT com BLOCKER|MAJOR|MINOR|OK
```

### Agente: qa-a11y

```
Role: Accessibility auditor — keyboard, ARIA e contraste.
Actions: inspecionar código + agent-browser.
Check:
  □ Keyboard nav: todos os elementos interativos acessíveis por Tab (sem armadilhas)?
  □ Focus visible: outline de focus não removido por CSS (outline: none)?
  □ Images: alt text descritivo? (ou alt="" se decorativa)
  □ Forms: todos os inputs têm <label> associado (não só placeholder)?
  □ ARIA: roles corretos (role="button" em divs clicáveis, aria-label onde necessário)?
  □ Touch targets: elementos clickáveis ≥ 44×44px no mobile?
  □ Color: informação não transmitida apenas por cor (ícone + cor, não só cor)?
  □ Headings: hierarquia correta (h1 → h2 → h3, sem pular níveis)?
Output: QA_REPORT com BLOCKER|MAJOR|MINOR|OK
```

---

## Fase 3 — Wave Funcional (agent-browser sequencial)

> **Emitir:** `▶ [QA 3/6] Functional QA Wave`

### Agente: qa-e2e

```
Role: Functional E2E auditor — fluxos completos no browser.
Actions: agent-browser → executar cada fluxo definido no escopo.

Para apps com auth (sempre verificar):
  □ Register: criar conta nova → sucesso + redirect correto?
  □ Login válido: credenciais corretas → sucesso + redirect correto?
  □ Login inválido: credenciais erradas → mensagem de erro útil (não crash)?
  □ Rota protegida sem auth → redirect para login (não 404 ou erro)?
  □ Logout → sessão limpa + redirect correto?
  □ Login após logout → funciona?

Para cada feature no escopo:
  □ Fluxo primário (happy path): usuário consegue completar?
  □ Fluxo de erro: o que acontece com input inválido?
  □ Links/botões: todos os links da feature levam ao destino correto?
  □ Persistência: dados criados persistem após page reload?
  □ Feedback de loading: operações lentas mostram loading state?

Evidence: screenshot de cada passo crítico, log de console errors
Output: QA_REPORT com BLOCKER|MAJOR|MINOR|OK + evidence obrigatória por BLOCKER
```

---

## Fase 4 — Aggregate QA Report

> **Emitir:** `▶ [QA 4/6] Aggregate Report`

Consolida todos os reports das waves:

```
QA REPORT: [escopo]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status:   PASS | FAIL
Iteração: [N/3]

BLOCKERS — impedem progressão (devem ser corrigidos antes de avançar):
  [qa-dimension] [arquivo:linha ou componente] — [descrição específica e acionável]
  Ex: [qa-e2e]    auth/login — redirect pós-login quebrado: fica em /login após submit
  Ex: [qa-design] BoardCard.tsx — elementos sobrepostos em mobile (falta overflow: hidden)
  Ex: [qa-backend] POST /api/boards — input.title undefined não rejeitado → criação com título nulo

MAJORS — degradam qualidade (corrigir antes de finalizar):
  [qa-dimension] [arquivo:linha ou componente] — [descrição específica e acionável]
  Ex: [qa-security] boards/route.ts:42 — sem verificação de autorização (qualquer user deletar board alheio)
  Ex: [qa-ux] CreateBoard — sem feedback de loading ao salvar (usuário clica múltiplas vezes)

MINORS — melhorias recomendadas (não bloqueiam):
  [qa-dimension] [componente] — [sugestão]

OK — dimensões que passaram:
  [qa-dimension] — PASS ([N] itens verificados)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Decisão automática:**
- `BLOCKERS ou MAJORS existem` → **Fase 5 (Fix Loop)**
- `Apenas MINORS ou nenhum issue` → **Fase 6 (PASS)**

---

## Fase 5 — Fix Loop

> **Emitir:** `▶ [QA 5/6] Fix Loop — Iteração [N/3]`

**Máximo 3 iterações. Se FAIL após iteração 3 → Escalate ao usuário.**

### Por iteração:

**5.1 — Spawn fix agents** (um por BLOCKER/MAJOR, máx 5 paralelos):

```
Fix Agent: [id do issue, ex: "qa-e2e/auth-redirect"]
Task: Corrigir ESPECIFICAMENTE: [descrição exata do BLOCKER/MAJOR do QA Report]
Arquivo alvo: [arquivo:linha]
Fix necessário: [ação específica inferida do report]
Contexto: [handoff com QA Report completo + arquivos relevantes]
Restrição: máx 100k tokens | corrigir APENAS este issue | não refatorar código adjacente
Output obrigatório: lista de arquivos modificados + descrição da correção aplicada
```

**5.2 — Aguardar** completion de todos os fix agents

**5.3 — Re-executar apenas agentes QA afetados** (não a wave toda):
- Issue de `qa-design`? → re-executa apenas `qa-design`
- Issue de `qa-e2e`? → re-executa apenas `qa-e2e` para o fluxo afetado
- Issue de `qa-backend`? → re-executa apenas `qa-backend` para o endpoint afetado

**5.4 — Avaliar resultado:**
- Sem BLOCKERS/MAJORS → **Fase 6 (PASS)**
- BLOCKERS/MAJORS restantes e iteração < 3 → próxima iteração
- Iteração 3 atingida com issues → **Escalate**

### Condição de Escalate:

```
⚠️ QA ESCALATE: [escopo]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Após 3 iterações de fix, os seguintes issues persistem:

[lista de issues não resolvidos com histórico de tentativas]

Possíveis causas:
  - Problema estrutural que requer redesign
  - Dependência externa não disponível no ambiente de dev
  - Requisito ambíguo que precisa de decisão humana

Ação necessária: revisão manual.
Sugestão: [recomendação específica baseada no tipo de issue]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Fase 6 — QA Report Final

> **Emitir:** `▶ [QA 6/6] Final Report`

```
QA COMPLETE: [escopo]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status:     ✅ PASS
Iterações:  [N] (1 = pass de primeira | 2-3 = fixes aplicados)

Dimensões verificadas:
  qa-code      ✅ PASS ([N] itens)          (se aplicável)
  qa-security  ✅ PASS ([N] itens)          (se aplicável)
  qa-backend   ✅ PASS ([N] itens)          (se aplicável)
  qa-research  ✅ PASS ([N] itens)          (se aplicável)
  qa-plan      ✅ PASS ([N] itens)          (se aplicável)
  qa-design    ✅ PASS ([N] itens)          (se aplicável)
  qa-ux        ✅ PASS ([N] itens)          (se aplicável)
  qa-a11y      ✅ PASS ([N] itens)          (se aplicável)
  qa-e2e       ✅ PASS ([N] fluxos)         (se aplicável)

Issues resolvidos: [N] BLOCKERs, [N] MAJORs em [N] iterações
Issues pendentes (MINOR): [lista — registrar como backlog]

Pipeline: ✅ pode prosseguir para próxima fase.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Regras do QA Loop

1. **QA agents são independentes** — não conhecem a intenção do dev, apenas o que está funcionando
2. **Fix agents são cirúrgicos** — corrigem apenas o issue específico, nunca refatoram código adjacente
3. **Evidência obrigatória** — todo BLOCKER/MAJOR deve ter arquivo:linha ou screenshot
4. **MINOR nunca bloqueia** — documentados para backlog, não impedem progressão
5. **Re-executa apenas o afetado** — não roda a wave toda novamente após fix
6. **Máx 3 iterações** — problema persistente após 3 é sistêmico → escala para usuário
7. **Máx 100k tokens por agente** — escopo grande? dividir em sub-escopos sequenciais
8. **Máx 5 fix agents em paralelo** — seguir regra RULE-AGENT-001

---

## Referência rápida — dimensões por fase do /build

| Gate | Dimensões |
|------|-----------|
| Research completo | `qa-research` |
| Plan aprovado | `qa-plan` |
| Foundation [3a] layout | `qa-design` |
| Foundation [3b] auth | `qa-backend` `qa-security` `qa-e2e` |
| Feature UI | `qa-design` `qa-ux` `qa-e2e` |
| Feature backend | `qa-backend` `qa-security` `qa-code` |
| Feature full-stack | todas exceto `qa-research` e `qa-plan` |
| Final do build | todas |

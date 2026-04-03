---
name: redesign
description: Transform an existing application into a modern one. Analyzes the current app (via browser or codebase), detects whether in-place UI replacement or a full rewrite to a new folder is appropriate, proposes UX improvements (navigation reorganization, design system, animations), gets user approval, then implements with full feature parity guarantee.
disable-model-invocation: true
argument-hint: <url or path of existing app>
---

# /redesign — Application Modernization & UI Transformation

> Transforma um app existente em um moderno.
> Analisa o que existe → detecta o modo correto → propõe UX melhorada → implementa com garantia de paridade.
> O app original nunca é tocado até confirmação explícita (ou nunca, no caso de rewrite).

---

## Dois modos — detectados automaticamente

| Modo | Quando | O que acontece |
|------|--------|---------------|
| **rewrite** | Framework legacy (AngularJS, Backbone, jQuery, Ember, CoffeeScript), stack incompatível com migração incremental, ou usuário quer pasta nova | Nova pasta + nova stack + mesmas features + UX melhorada |
| **in-place** | Framework moderno (React, Vue, Next.js, Angular 14+), estrutura preservável, usuário quer substituir só a UI | Mesma pasta + substitui camada de apresentação + backend intacto |

A skill detecta e recomenda — nunca age sem confirmação do usuário.

---

## Fase 1 — Análise do app existente

> **Emitir:** `▶ [1/6] Analisando o app existente`

### 1.1 — Identificar o tipo de entrada

- **URL fornecida** → usar agent-browser para navegar o app em produção/staging
- **Path de codebase** → explorar estrutura de arquivos + ler componentes principais

### 1.2 — Mapear via agent-browser (se URL disponível)

Navegar sistematicamente:

```
Para cada página/tela do app:
  □ URL e título da página
  □ Elementos de navegação (menu principal, sidebar, breadcrumb, tabs)
  □ Componentes principais visíveis (tabelas, formulários, cards, modais, dashboards)
  □ Ações disponíveis (botões, links, formulários, drag-drop)
  □ Estados da UI (loading, empty, error, success)
  □ Fluxos de usuário (sequências de passos para completar uma tarefa)

Registrar também:
  □ Integração com APIs (observar XHR/fetch calls se DevTools acessível)
  □ Auth (login, logout, controle de acesso por rota)
  □ Responsividade (testar em mobile viewport)
  □ Pain points visuais (inconsistências, elementos desalinhados, UI datada)
```

### 1.3 — Mapear via codebase (se path disponível, em paralelo ou alternativo)

```bash
# Detectar framework e stack
rtk cat package.json 2>/dev/null || rtk cat requirements.txt 2>/dev/null

# Mapear rotas/telas
find . -name "*.routes.*" -o -name "router*" -o -name "routes*" | head -20
find . -name "*.component.*" -o -name "*.page.*" -o -name "*.view.*" | grep -v node_modules | head -40
```

Extrair de cada arquivo de rota:
- Path da URL
- Componente/view associado
- Guards de auth (se houver)

### 1.4 — Detectar framework e avaliar modo

**Sinais de REWRITE (nova pasta recomendado):**
- AngularJS (angular.js v1.x), Backbone.js, Ember.js antigo, jQuery como framework principal
- Stack sem TypeScript com > 50 componentes (migração incremental inviável)
- Sem estrutura de componentes (HTML + JS direto)
- Versão de framework com EOL (end-of-life)
- Usuário explicitamente quer nova pasta / novo projeto

**Sinais de IN-PLACE:**
- React (qualquer versão), Vue 3, Angular 14+, Next.js
- Codebase com testes existentes que precisam ser preservados
- Backend + frontend no mesmo repo e backend não muda
- Usuário quer só substituir a camada visual

### 1.5 — Gerar inventário estruturado

```
INVENTÁRIO DO APP ATUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Framework:    [nome + versão]
Telas:        [N] telas mapeadas
Features:     [lista estruturada por módulo]
Navegação:    [estrutura atual de menus/rotas]
Auth:         [sim/não + tipo]
APIs:         [lista de integrações identificadas]
Pain points:  [problemas visuais/UX encontrados]
```

---

## Fase 2 — Detecção de modo + Stack decision

> **Emitir:** `▶ [2/6] Detectando modo + definindo stack`

Apresentar recomendação com justificativa:

```
RECOMENDAÇÃO DE MODO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Framework atual: [nome + versão]
Motivo:          [por que rewrite ou in-place]

Modo recomendado: REWRITE | IN-PLACE

[Se REWRITE:]
Stack sugerida para o novo app:
  Framework:    Next.js 14 (App Router) — [justificativa]
  Styling:      Tailwind CSS + shadcn/ui
  Animações:    Framer Motion (page transitions + micro-interactions)
  Estado:       [Zustand | TanStack Query — baseado no que o app usa]
  Auth:         [manter backend atual | reescrever — baseado na análise]

Nova pasta:     ../[nome-do-projeto]-redesign/

[Se IN-PLACE:]
Substituição:   Componentes de UI trocados, lógica preservada
Design system:  shadcn/ui + Tailwind
Animações:      Framer Motion
```

**⏸ PAUSA:** Confirmar modo + stack antes de qualquer implementação.

Se o usuário quiser ajustar a stack sugerida → incorporar e confirmar novamente.

---

## Fase 3 — Proposta de UX

> **Emitir:** `▶ [3/6] Proposta de UX melhorada`

Esta é a fase de maior valor — não apenas replicar, mas melhorar.

### 3.1 — Análise de padrões modernos equivalentes

Para cada tipo de tela identificada no inventário, pesquisar (agent-browser em sites de referência):
- Dribbble, Mobbin, Awwwards para o tipo de produto (SaaS dashboard, e-commerce, ferramenta de gestão, etc.)
- Apps modernos equivalentes e como resolvem os mesmos problemas

### 3.2 — Proposta de nova arquitetura de informação (IA)

Comparar estrutura atual vs. proposta:

```
NAVEGAÇÃO ATUAL                    NAVEGAÇÃO PROPOSTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Menu principal:                    Menu principal:
  ├─ [item atual 1]           →      ├─ [item proposto 1] [motivo]
  ├─ [item atual 2]           →      ├─ [item proposto 2] [motivo]
  └─ [item atual 3]           →      └─ [item proposto 3] [motivo]
                                     └─ [item novo sugerido] [motivo]

Sidebar/secundário:                Sidebar/secundário:
  └─ [atual]                  →      └─ [proposto]

Fluxos reorganizados:
  "[tarefa X]" era 4 passos → proposta: 2 passos ([justificativa])
  "[recurso Y]" estava oculto → proposta: destaque em dashboard ([justificativa])
```

### 3.3 — Design system e identidade visual

```
DESIGN SYSTEM PROPOSTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Base:        shadcn/ui (componentes acessíveis, customizáveis)
Tema:        [claro | escuro | ambos — baseado no tipo de produto]
Palette:     [sugestão de 3 cores com justificativa]
Tipografia:  [fonte sugerida + escala]
Ícones:      Lucide Icons (consistente com shadcn/ui)
Animações:
  - Page transitions: Framer Motion (fade + slide)
  - Micro-interactions: hover states, loading skeletons, success feedback
  - Data loading: skeleton screens (não spinners)
  - Empty states: ilustrações + call-to-action
```

### 3.4 — Apresentar proposta completa ao usuário

Formato:

```
PROPOSTA DE REDESIGN — [Nome do App]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOVA ARQUITETURA DE INFORMAÇÃO
[diagrama texto comparando atual vs. proposto]

MELHORIAS DE UX PROPOSTAS
  1. [melhoria] — [motivo baseado em análise]
  2. [melhoria] — [motivo]
  ...

DESIGN SYSTEM
  [resumo das escolhas visuais]

FEATURES MANTIDAS (paridade garantida)
  ✓ [feature 1]
  ✓ [feature 2]
  ... todas as [N] features do app atual

FEATURES FORA DO ESCOPO (sugestão)
  ○ [feature antiga que pode ser deprecada — com justificativa]
```

**⏸ PAUSA:** Aguarda aprovação ou ajustes. Só avança quando usuário confirmar.

---

## Fase 4 — Implementação

> **Emitir:** `▶ [4/6] Implementação`

### Se modo REWRITE

```bash
# Criar nova pasta
mkdir ../[projeto]-redesign
cd ../[projeto]-redesign
```

Executar em sequência:

1. **`/scaffold fullstack`** — estrutura, Docker, Git, GitHub (novo repo com sufixo `-redesign`)
2. **Foundation** — `/ui` para design system + layout base aprovado na Fase 3
3. **Auth** — `/auth scaffold` replicando o sistema de auth existente
4. **Features** — implementar feature por feature na ordem do inventário:
   - Começar pelas mais críticas (core do produto)
   - Para cada feature: `/feature-dev` com contexto do inventário + proposta aprovada
   - Gate de paridade após cada feature: confirmar que comportamento original está presente

Contexto passado a cada agente de implementação:
- Inventário da feature correspondente (como funciona no app atual)
- Proposta de UX aprovada (como deve ficar no novo app)
- Design system definido na Fase 3

### Se modo IN-PLACE

Substituição componente por componente:
- Instalar shadcn/ui + Tailwind no projeto existente
- Criar design tokens a partir das escolhas da Fase 3
- Substituir por seção (header → sidebar → páginas principais → páginas secundárias)
- Nunca tocar lógica de negócio — apenas apresentação
- Cypress E2E em cada seção substituída antes de avançar

---

## Fase 5 — Verificação de paridade

> **Emitir:** `▶ [5/6] Verificação de paridade`

Comparar sistematicamente o inventário da Fase 1 com o app novo:

```
PARIDADE CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Para cada feature do inventário:
  □ Feature existe no novo app?
  □ Comportamento é equivalente ao original?
  □ Dados/integrações funcionam?
  □ Fluxo de usuário completo funciona?

Para cada tela do inventário:
  □ Tela existe no novo app?
  □ Todos os elementos visíveis estão presentes?
  □ Responsiva em mobile?
```

Usar agent-browser no novo app para verificar cada item.
Issues encontrados → fix automático antes de avançar para Fase 6.

---

## Fase 6 — QA final + entrega

> **Emitir:** `▶ [6/6] QA final`

```
/qa-loop (escopo: app completo, dimensões: qa-design + qa-ux + qa-a11y + qa-e2e)
/browser-qa <url-do-novo-app>
```

Fix loop automático até PASS.

### Output final

```
REDESIGN COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Modo:           REWRITE | IN-PLACE
App original:   [path/url] — intacto ✅
Novo app:       [path/url do redesign]
Stack:          [tecnologias usadas]

Features implementadas: [N]/[N] (100% de paridade)
Telas:          [N] telas

Melhorias de UX aplicadas:
  ✓ [melhoria 1]
  ✓ [melhoria 2]

QA:
  Design:       ✅ PASS
  UX:           ✅ PASS
  A11y:         ✅ PASS
  E2E:          ✅ PASS
  Browser:      ✅ PASS

[Se REWRITE:]
Repo:           github.com/[user]/[projeto]-redesign
Para rodar:     rtk docker compose up -d (na pasta ../[projeto]-redesign)

App legado permanece em [path original] — nenhuma alteração foi feita.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Regras

1. **Nunca tocar o app original** sem confirmação explícita — no modo rewrite, trabalha exclusivamente na nova pasta
2. **Proposta de UX antes de código** — nenhuma linha de implementação começa sem aprovação da Fase 3
3. **Paridade é obrigatória** — toda feature do app original deve estar no novo, ou ter sido explicitamente removida com aprovação do usuário
4. **Melhorias de UX são sugestões** — o usuário decide quais aceitar; nada é imposto
5. **Design system do kit** — shadcn/ui + Tailwind como base, customizado com as escolhas aprovadas
6. **Rewrite recomendado para legacy** — AngularJS, Backbone, Ember, jQuery-as-framework sempre recomenda rewrite; nunca tenta migração incremental de frameworks sem caminho oficial

---
name: research
description: Parallel research wave before planning. Launches 4 specialized agents (UX/Design, Libraries, YouTube, Implementations) to produce RESEARCH.md before any code is written.
disable-model-invocation: true
argument-hint: <topic or feature to research>
---

# /research — Parallel Research Wave

Deep, multi-source research before any planning or code is written.
Real agents. Real searches. Real output.

> A pesquisa leva tempo mas é o que garante qualidade real no output final.

---

## How it works

```
/research <tópico>
    │
    ├─ Phase 0: Entender o tópico (Claude, sem agentes)
    │
    ├─ Phase 1: Wave de pesquisa paralela (até 4 agentes simultâneos)
    │           ├─ Agente UX/Design        (se tópico tem UI)
    │           ├─ Agente Bibliotecas      (se tópico tem UI ou libs relevantes)
    │           ├─ Agente Implementações   (sempre)
    │           └─ Agente YouTube          (se tópico tem tutoriais disponíveis)
    │
    ├─ Phase 2: Agregação → RESEARCH.md gerado no projeto
    │
    ├─ Resumo de 5–10 linhas dos principais achados
    │
    └─ 3–5 perguntas de clarificação → aguarda resposta antes de indicar pronto para /plan
```

---

## Phase 0 — Entender o tópico

> **Emit:** `▶ [1/3] Entendendo o tópico`

Antes de lançar qualquer agente, analise o tópico recebido e determine:

1. **Categoria:** É um componente de UI? Uma feature de backend? Uma biblioteca ou ferramenta? Uma integração de terceiros? Um conceito arquitetural?
2. **Objetivo principal:** O que o usuário quer construir ou entender? Qual o resultado esperado?
3. **Dimensões de pesquisa relevantes:** Com base na categoria, decida quais dos 4 agentes lançar:
   - Tópico com UI visível (componente, página, animação, layout) → lança UX/Design + Bibliotecas + Implementações + YouTube
   - Tópico de biblioteca/ferramenta específica → lança Bibliotecas + Implementações + YouTube (omite UX se não tem UI)
   - Tópico de backend puro (API, serviço, algoritmo) → lança Implementações + YouTube (omite UX e Bibliotecas se irrelevantes)
   - Em dúvida, prefira lançar mais agentes a menos

Emita uma linha de contexto antes de iniciar a wave:

```
Tópico:    [tópico identificado]
Categoria: [UI Component | Backend Feature | Library | Architecture | Other]
Agentes:   [lista dos agentes que serão lançados e por quê]
```

---

## Phase 1 — Wave de pesquisa paralela

> **Emit:** `▶ [2/3] Pesquisa paralela em andamento`

Lance os agentes selecionados **em paralelo** usando o Agent tool com:
- `subagent_type: "general-purpose"`
- `run_in_background: false`
- Todos os agentes recebem o mesmo contexto de entrada (tópico + categoria)

Aguarde todos completarem antes de prosseguir para Phase 2.

---

### Agente UX/Design

**Lançar quando:** O tópico envolve qualquer elemento visual, componente de interface, layout, animação ou experiência do usuário.

**Prompt para o agente:**

```
Você é um pesquisador especializado em UX e design de interfaces.

Tópico de pesquisa: [TÓPICO]
Categoria: [CATEGORIA]

Sua tarefa é encontrar referências visuais e de design REAIS para este tópico.
Use WebSearch e WebFetch para buscar conteúdo atualizado — não invente resultados.

Fontes para pesquisar (tente pelo menos 3-4 buscas antes de desistir de uma fonte):
- Dribbble: WebSearch "site:dribbble.com [tópico]" → WebFetch nas URLs mais relevantes
- Awwwards: WebSearch "site:awwwards.com [tópico]" → WebFetch nas URLs mais relevantes
- Mobbin: WebSearch "site:mobbin.com [tópico]" → WebFetch nas URLs mais relevantes
- Component Party: WebFetch "https://component-party.pages.dev" para comparar implementações
- Land-book: WebSearch "site:land-book.com [tópico]" → WebFetch nas URLs mais relevantes
- Fallback: WebSearch "[tópico] UI design examples 2024 2025" para capturar outras fontes

Para cada referência encontrada, extraia:
1. URL da referência
2. O que torna este design especial ou notável
3. Padrões visuais identificados (cores, tipografia, layout, animações)
4. Relevância para o tópico pesquisado

Retorne no máximo 2000 tokens com:
- 3 a 5 referências concretas com URLs reais
- Padrões visuais predominantes identificados
- Tendências de design relevantes para o tópico
- Uma recomendação de abordagem visual

Se uma fonte não retornar resultados relevantes após 3 tentativas, passe para a próxima.
```

---

### Agente Bibliotecas

**Lançar quando:** O tópico envolve UI com React/TypeScript, ou menciona explicitamente uma biblioteca, ou requer componentes reutilizáveis.

**Prompt para o agente:**

```
Você é um pesquisador especializado em bibliotecas e ferramentas de frontend.

Tópico de pesquisa: [TÓPICO]
Categoria: [CATEGORIA]

Sua tarefa é encontrar as melhores bibliotecas, componentes e APIs disponíveis para este tópico.
Use WebSearch e WebFetch para buscar conteúdo atualizado — não invente resultados.

Fontes para pesquisar (tente pelo menos 3-4 buscas antes de desistir de uma fonte):
- shadcn/ui: WebFetch "https://ui.shadcn.com/docs" + WebSearch "site:ui.shadcn.com [tópico]"
- Radix UI: WebFetch "https://www.radix-ui.com/primitives/docs/overview/introduction" + WebSearch "site:radix-ui.com [tópico]"
- Framer Motion: WebSearch "site:motion.dev [tópico]" → WebFetch nas páginas relevantes
- Aceternity UI: WebFetch "https://ui.aceternity.com" + WebSearch "site:ui.aceternity.com [tópico]"
- Headless UI: WebSearch "site:headlessui.com [tópico]"
- Tailwind CSS: WebSearch "site:tailwindcss.com/docs [tópico]"
- React Spring: WebSearch "site:react-spring.dev [tópico]"
- Fallback: WebSearch "[tópico] react component library npm 2024 2025"

Para cada biblioteca relevante encontrada, extraia:
1. Nome e link da documentação oficial
2. Componentes ou APIs relevantes para o tópico
3. Trecho de código de exemplo (se disponível na documentação)
4. Vantagens e limitações para este caso de uso
5. Compatibilidade com React/TypeScript/Tailwind

Retorne no máximo 2000 tokens com:
- Bibliotecas recomendadas em ordem de prioridade (mais adequada primeiro)
- Trechos de código relevantes com contexto
- Links diretos para as páginas de documentação mais úteis
- Trade-offs entre as opções encontradas

Se uma fonte não retornar resultados relevantes após 3 tentativas, passe para a próxima.
```

---

### Agente Implementações de Referência

**Lançar quando:** Sempre. Este agente é lançado para todos os tópicos.

**Prompt para o agente:**

```
Você é um pesquisador especializado em implementações de código open source e artigos técnicos.

Tópico de pesquisa: [TÓPICO]
Categoria: [CATEGORIA]

Sua tarefa é encontrar implementações reais e artigos técnicos relevantes para este tópico.
Use WebSearch e WebFetch para buscar conteúdo atualizado — não invente resultados.

Fontes para pesquisar (tente pelo menos 3-4 buscas antes de desistir de uma fonte):
- GitHub: WebSearch "site:github.com [tópico] react component" e "site:github.com [tópico] implementation"
- CodeSandbox: WebSearch "site:codesandbox.io [tópico]" → WebFetch nos exemplos mais relevantes
- Dev.to: WebSearch "site:dev.to [tópico] react" e "site:dev.to [tópico] tutorial" → WebFetch nos artigos mais relevantes
- CSS-Tricks: WebSearch "site:css-tricks.com [tópico]" → WebFetch nos artigos encontrados
- Smashing Magazine: WebSearch "site:smashingmagazine.com [tópico]"
- Medium/Hashnode: WebSearch "[tópico] react implementation medium.com OR hashnode.dev"
- Fallback: WebSearch "[tópico] open source example implementation 2024 2025"

Para cada implementação ou artigo encontrado, extraia:
1. URL da fonte
2. Abordagem técnica utilizada (padrão de design, algoritmos, estrutura de dados)
3. Pontos técnicos notáveis (performance, acessibilidade, reutilização)
4. Trechos de código relevantes (se disponíveis)
5. Relevância e qualidade da implementação

Retorne no máximo 2000 tokens com:
- 3 a 5 implementações ou artigos com URLs reais
- Resumo das abordagens técnicas mais comuns ou mais eficazes
- Padrões de código recorrentes encontrados
- Recomendações técnicas baseadas nas referências encontradas

Se uma fonte não retornar resultados relevantes após 3 tentativas, passe para a próxima.
```

---

### Agente YouTube

**Lançar quando:** O tópico provavelmente tem tutoriais em vídeo disponíveis (componentes de UI, bibliotecas populares, patterns conhecidos). Omitir apenas se o tópico for muito específico/proprietário e improvável de ter cobertura em vídeo.

**Prompt para o agente:**

```
Você é um pesquisador especializado em conteúdo educativo em vídeo.

Tópico de pesquisa: [TÓPICO]
Categoria: [CATEGORIA]

Sua tarefa é encontrar vídeos tutoriais relevantes e extrair os conceitos técnicos apresentados.
Use WebSearch e WebFetch para buscar conteúdo atualizado — não invente resultados.

Processo (execute nesta ordem):

PASSO 1 — Encontrar vídeos relevantes:
  WebSearch: site:youtube.com "[tópico]" tutorial react 2024 OR 2025
  WebSearch: site:youtube.com "[tópico]" implementation walkthrough
  WebSearch: site:youtube.com "[tópico]" from scratch

  Selecione os 2-3 vídeos mais relevantes (mais recentes, mais visualizações, mais técnicos).

PASSO 2 — Para cada vídeo selecionado, tente extrair transcrição:
  Tente via Bash:
    yt-dlp --write-subs --write-auto-subs --sub-lang en --skip-download \
      --output '/tmp/yt_%(id)s' "URL_DO_VIDEO" 2>/dev/null \
      && cat /tmp/yt_*.vtt 2>/dev/null | head -300

  Se yt-dlp não disponível ou falhar: use WebFetch na URL do vídeo para capturar
  título, descrição completa, capítulos (se disponíveis) e comentários fixados.

PASSO 3 — Analise o conteúdo capturado:
  Extraia os conceitos e técnicas mais importantes mencionados.
  Identifique abordagens de implementação específicas apresentadas.
  Note bibliotecas, ferramentas ou padrões citados.

Retorne no máximo 2000 tokens com:
- URLs dos vídeos encontrados + título + canal + data aproximada
- Resumo dos conceitos técnicos principais de cada vídeo
- Bibliotecas, ferramentas e padrões mencionados
- Abordagens de implementação identificadas
- Uma linha indicando qual vídeo tem a melhor explicação técnica e por quê

Se não encontrar vídeos relevantes após 3 tentativas de busca, retorne o que foi encontrado
com uma nota indicando a limitação dos resultados.
```

---

## Phase 2 — Agregação e clarificação

> **Emit:** `▶ [3/3] Agregando resultados e preparando clarificações`

### 2.1 — Gerar RESEARCH.md

Agregue os resultados de todos os agentes em `RESEARCH.md` na raiz do projeto.
Se já existir um `RESEARCH.md`, sobrescreva-o — este é sempre o resultado da pesquisa mais recente.

Formato do arquivo:

```markdown
# RESEARCH.md — [Tópico]
_Gerado em: [data e hora atual]_

## Design & UX References
[resultados do Agente UX/Design, ou "— N/A para este tópico —" se não foi lançado]

## Libraries & Tools
[resultados do Agente Bibliotecas, ou "— N/A para este tópico —" se não foi lançado]

## Implementation References
[resultados do Agente Implementações]

## Video Insights
[resultados do Agente YouTube, ou "— N/A para este tópico —" se não foi lançado]

## Key Insights
[3 a 5 bullet points com os achados mais importantes cruzando todas as fontes]
[Priorize: padrões recorrentes, consenso entre fontes, escolhas técnicas que se destacaram]
```

### 2.2 — Apresentar resumo

Apresente ao usuário um resumo direto de **5 a 10 linhas** cobrindo:
- O que foi encontrado de mais relevante
- Bibliotecas ou abordagens que se destacaram
- Padrões visuais ou técnicos predominantes
- Qualquer achado surpreendente ou contra-intuitivo

Formato:

```
RESEARCH COMPLETO: [Tópico]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[resumo em 5–10 linhas]

Arquivo gerado: RESEARCH.md
```

### 2.3 — Perguntas de clarificação

Com base no que foi pesquisado, faça **3 a 5 perguntas de clarificação** que:
- Endereçam gaps identificados na pesquisa (algo que as fontes não cobriram com clareza)
- Forçam decisões de design que o usuário precisa tomar (ex: animação sim ou não? acessível para todos os browsers?)
- Expõem trade-offs encontrados que dependem das prioridades do usuário (ex: performance vs. riqueza visual)
- Ajudam a refinar o escopo antes do `/plan` (ex: é um componente isolado ou integrado a um sistema de design?)

Apresente as perguntas numeradas e aguarde a resposta do usuário.

**Após receber as respostas**, emita:

```
Pronto para /plan [tópico].
Use os achados do RESEARCH.md como contexto para o planejamento.
```

---

## Notas de comportamento

- **Agentes lançam buscas reais.** Cada agente usa WebSearch e WebFetch para encontrar conteúdo atualizado. Não substitua com conhecimento interno do modelo — o objetivo é trazer informação externa e recente.
- **Cada agente tenta 3-4 buscas por fonte** antes de desistir e passar para a próxima. Persistência é parte do processo.
- **Resultados não encontrados são reportados honestamente.** Se uma fonte não retornou nada útil, o agente registra isso em vez de inventar conteúdo.
- **O RESEARCH.md é o artefato principal.** Ele deve ser útil como referência durante o `/plan` e o `/feature-dev` — não um dump bruto, mas um documento editado e sintetizado.
- **As perguntas de clarificação encerram o fluxo.** Não prossiga para `/plan` automaticamente — aguarde o usuário responder antes de indicar que está pronto.

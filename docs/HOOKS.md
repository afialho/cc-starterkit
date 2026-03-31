# Hooks — O que é Determinístico e o que Não é

## Resposta direta

**Dos 5 hooks criados, apenas 2 regras são verdadeiramente determinísticas (bloqueiam).**
Os demais são *advisory* — influenciam o Claude, mas não forçam a ação.

---

## Como funcionam os hooks do Claude Code

Hooks recebem um JSON via stdin com os dados do tool call e podem:

| Saída | Efeito | Determinístico? |
|-------|--------|----------------|
| `process.exit(2)` + mensagem no stderr | Bloqueia o tool call — a ação NÃO acontece | ✅ Sim |
| JSON com `additionalContext` | Adiciona texto ao contexto do Claude | ⚠️ Não — LLM pode ignorar |
| Nada (pass-through) | Deixa a ação acontecer normalmente | — |

**O problema do `additionalContext`:** ele injeta texto na conversa, o que *influencia* o Claude, mas não *impede* nada. O Claude é um LLM — pode decidir ignorar o contexto injetado, especialmente sob pressão de completar uma tarefa rapidamente.

**O único mecanismo verdadeiramente determinístico em hooks** é o `process.exit` com código não-zero, que faz o Claude Code cancelar o tool call antes de executar.

---

## Auditoria dos hooks criados

### ✅ Determinístico — `rules-engine.mjs`

Estas regras **bloqueiam de verdade** (exit 2):

| Regra | Trigger | O que bloqueia |
|-------|---------|---------------|
| RULE-GIT-003 | Bash: `git commit --no-verify` | Impede bypass do hook de pre-commit |
| RULE-ARCH-FILES | Write/Edit | Impede arquivos `.test.*` dentro de `src/` |

### ⚠️ Advisory — `rtk-rewrite.mjs`
- Detecta comandos que deveriam usar RTK
- Adiciona `additionalContext` pedindo para reescrever com `rtk`
- **Não força nada** — o Claude precisa cooperar

*Por quê não bloquear?* Bloquear todo `git status` sem RTK instalado quebraria o fluxo de novos membros do time. A abordagem correta é a global hook do próprio RTK (já configurada no seu ambiente).

### ⚠️ Advisory — `architecture-guard.mjs`
- Injeta as regras da camada no contexto quando um arquivo da camada é escrito
- **Não verifica imports** — apenas lembra as regras
- **Não bloqueia nada**

### ⚠️ Advisory — `tdd-guard.mjs`
- Verifica se existe arquivo de teste correspondente **após** a escrita do arquivo de implementação
- Adiciona contexto de aviso se não existe
- **Não bloqueia a escrita**

### ℹ️ Informacional — `session-start.mjs`
- Injeta contexto de boas-vindas no início da sessão
- Puramente informacional

---

## Por que não tudo foi feito determinístico?

### 1. Verificação de imports requer parsing do conteúdo
Para bloquear um arquivo de domínio que importa infraestrutura, o hook precisa:
1. Receber o `content` do tool call Write
2. Parsear os imports
3. Verificar contra as regras
4. Bloquear se violar

Isso é possível em `PreToolUse/Write` — o `tool_input.content` está disponível. **O hook atualizado abaixo implementa isso.**

### 2. TDD guard com hard block tem edge cases
Se bloquear `Write` de implementação quando não há teste, quebraria o caso onde:
- O agente cria teste e implementação na mesma sessão (o teste ainda não foi escrito quando o hook dispara na implementação)
- Arquivos de configuração, DTOs, tipos que não precisam de teste

Solução: bloquear apenas arquivos de domínio/application (negócio puro), não toda a `src/`.

### 3. O LLM coopera quando o contexto é claro
Na prática, `additionalContext` bem escrito + regras claras no `CLAUDE.md` + prompts de skills funcionam muito bem. O Claude Code segue o contexto injetado na maioria dos casos.

---

## Hooks verdadeiramente determinísticos: como implementar mais

### Padrão para hard block

```javascript
// Em qualquer hook .mjs
const violation = checkSomething(input);

if (violation) {
  process.stderr.write(`🚫 RULE-XXX: ${violation.message}\n`);
  process.exit(2); // Bloqueia o tool call — exit code != 0
}

// Se chegou aqui, passou — output o input de volta
process.stdout.write(JSON.stringify(input));
```

### Verificação de imports (PreToolUse/Write)

```javascript
// Extrai imports de TypeScript/JavaScript
function extractImports(content) {
  const importRegex = /^import\s+.*?from\s+['"](.+?)['"]/gm;
  const requireRegex = /require\(['"](.+?)['"]\)/g;
  const matches = [];
  let m;
  while ((m = importRegex.exec(content)) !== null) matches.push(m[1]);
  while ((m = requireRegex.exec(content)) !== null) matches.push(m[1]);
  return matches;
}

// Verifica se os imports violam as regras da camada
function findViolations(filePath, content, config) {
  const layer = detectLayer(filePath, config);
  if (!layer || !layer.allowedImportPrefixes.length) return [];
  
  const imports = extractImports(content);
  return imports.filter(imp => {
    if (imp.startsWith('.')) {
      // Relative import — check resolved path
      return false; // Complex to resolve statically, skip for now
    }
    // Absolute import — check if it's a known forbidden package
    const forbidden = ['prisma', 'mongoose', 'sequelize', 'typeorm', 'knex',
                       'axios', 'node-fetch', 'express', 'fastify', 'koa',
                       'pg', 'mysql', 'redis', 'mongodb'];
    return forbidden.some(pkg => imp.includes(pkg)) && layer.name === 'domain';
  });
}
```

### Verificação TDD em PreToolUse

```javascript
// Bloqueia implementação de domínio/application se teste não existe
if (isBusinessLogicFile(filePath) && !testExists(filePath, config)) {
  const testPath = getExpectedTestPath(filePath, config);
  process.stderr.write([
    `🚫 TDD GUARD (RULE-TEST-001): Escreva o teste primeiro.`,
    `Arquivo de implementação: ${filePath}`,
    `Crie o teste primeiro em: ${testPath}`,
    `Depois escreva a implementação.`,
  ].join('\n'));
  process.exit(2);
}
```

---

## O que é verdadeiramente garantido hoje

| Garantia | Mecanismo | Confiança |
|---------|-----------|-----------|
| Não usar `--no-verify` | Hook bloqueia (exit 2) | ✅ 100% |
| Não criar testes em `src/` | Hook bloqueia (exit 2) | ✅ 100% |
| Usar RTK no CLI | Context + RTK global hook | ⚠️ ~90% |
| Respeitar camadas hexagonais | Context reminder | ⚠️ ~85% |
| TDD (teste antes da impl) | Context + advisory | ⚠️ ~80% |
| Seguir CLAUDE.md/Rules.md | Context + skills | ⚠️ ~85% |

## O que fornece garantia complementar

Os hooks do Claude Code são uma linha de defesa. As demais:

1. **Pre-commit git hooks** (Husky, Lefthook): verificam imports, linting, testes antes do commit — 100% determinístico
2. **CI pipeline**: roda toda a test suite — 100% determinístico
3. **Code review obrigatório**: no pull request — humano ou agent reviewer

Para **garantia total**, configure também:
```bash
# Lefthook (recomendado — mais leve que Husky)
npm install --save-dev lefthook

# lefthook.yml
pre-commit:
  commands:
    lint:
      run: npm run lint
    test:
      run: npm test
    arch-check:
      run: node scripts/check-architecture.js
```

---

## Resumo

> Os hooks do Claude Code são excelentes para **orientar e influenciar** o comportamento do LLM.
> Para **enforcement garantido**, combine com: pre-commit hooks (git) + CI pipeline.
> As duas camadas juntas dão cobertura completa.

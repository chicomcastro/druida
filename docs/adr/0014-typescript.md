# ADR 0014 — Migração para TypeScript

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
O scaffold começou em JavaScript (ADR 0001) para acelerar o protótipo. Com o
código crescendo (~40 módulos, muitos sistemas e dados estruturados), o custo
de refactors e a falta de checagem aumentaram. O backlog (M0) previa avaliar a
migração para TypeScript antes do código crescer demais.

## Decisão
Migrar todo o `src/` e `tests/` para **TypeScript**, com configuração
**pragmática (lenient)** para tornar a migração viável sem reescrever tudo:

- `tsconfig.json` com `strict: false`, `noImplicitAny: false`,
  `strictNullChecks: false`, `skipLibCheck: true`, `moduleResolution: Bundler`.
- Specifiers de import mantidos com extensão `.js` (o TS resolve para o `.ts`
  irmão), evitando reescrever centenas de imports.
- **Tipos reais** no núcleo de valor (ECS `World`, módulos de combate/loot/
  progressão/save mantêm checagem útil); classes de view/manager (Game, Hud,
  Menus, render, áudio, mundo) recebem um índice `[key: string]: any` para
  destravar a migração sem anotar cada campo agora.
- Scripts: `npm run typecheck` (`tsc --noEmit`); ESLint passa a usar o parser
  `typescript-eslint`. CI roda typecheck + lint + test + build.

## Consequências
- Type-check verde (0 erros) e tooling de TS em todo o projeto.
- Cobertura de tipos ainda parcial (lenient) — endurecer gradualmente
  (remover os `any` de índice, ligar `strictNullChecks`) é trabalho futuro
  rastreado no backlog.
- Base mais segura para evoluir os sistemas sem regressões silenciosas.

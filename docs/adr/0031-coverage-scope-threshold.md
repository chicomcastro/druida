# ADR 0031 — Escopo e threshold de cobertura (>80%)

**Status:** Aceito · **Data:** 2026-06-16

## Contexto
Meta de **>80% de cobertura** escrevendo testes para os sistemas. A base de
código tem duas camadas: (1) simulação/lógica (ECS, sistemas, gameplay, mundo,
dados) — testável em Node; (2) view/WebGL/DOM/loop (Three.js, overlays DOM,
`requestAnimationFrame`, Web Audio, bootstrap) — **não** executável em Node sem
um navegador, e já coberta pelo **e2e (Cypress)**.

## Decisão
- **Harness headless** (`tests/helpers.ts`): monta um `game` com a superfície de
  helpers do `Game` real (reaproveitando métodos do prototype) e renderer/câmera
  stub, permitindo exercitar os sistemas sem WebGL/DOM.
- **Escopo da métrica** = camada de lógica. A camada de view/WebGL/DOM/loop e o
  bootstrap ficam **fora do `include`** da cobertura (`vitest.config.ts`):
  `main.ts`, `Game.ts`, `GameLoop.ts`, `core/render/**`, `core/audio/**`,
  `core/input/**`, `ui/**`, `systems/render.ts`, `systems/vfx.ts`,
  `gameplay/storage.ts` (branches de IndexedDB só no browser).
- **Thresholds** (falham o CI): linhas/statements/funcs **80%**, branches 60%.
- Cobertura da camada escopada atinge **~94% de linhas**.

## Achado importante
Os testes revelaram um **bug latente**: `createProjectile(world, …)` era chamado
com `game` em `ai.ts` e `abilities/index.ts`, então **disparar qualquer projétil**
quebraria (`game.createEntity is not a function`). O e2e nunca dispara projétil,
por isso passou despercebido. Corrigido (passa `game.world`).

## Consequências
- Métrica reflete a lógica de fato testável; o e2e cobre a view em runtime.
- Regressão abaixo de 80% (linhas) barra o PR.
- Endurecer branches ou trazer parte da view para jsdom é evolução futura.

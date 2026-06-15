# ADR 0021 — Endurecimento dos tipos

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
A migração para TypeScript (ADR 0014) foi pragmática: classes de view/manager
receberam `[key: string]: any` para destravar a conversão. Isso desligava a
checagem de tipos dentro dessas classes (typos em `this.x` passavam).

## Decisão
Remover o índice `any` de **todas as classes**, declarando campos reais. Feito
em etapas: primeiro o núcleo de engine (`GameLoop`, `IsoCamera`, `Renderer`,
`StoryManager`), depois `VfxManager`, `Minimap`, `AudioManager`,
`InputManager`, `WorldMap` e por fim as maiores (`Game`, `Hud`, `Menus`,
`WorldManager`).

Pragmatismo mantido onde tipar a fundo traria pouco retorno: subsistemas/man
agers e elementos DOM são declarados como `any` (campos existem, mas sem tipo
detalhado), enquanto primitivos e estruturas de estado são tipados. O ganho
principal — pegar typos em `this.campoInexistente` — é obtido em todas as
classes. Nenhum `[key: string]: any` permanece em `src/`.

## Consequências
- Type-check agora valida o acesso a campos em todas as classes.
- Endurecimento futuro (tipar managers/DOM a fundo, ligar `strictNullChecks`)
  permanece possível e incremental.


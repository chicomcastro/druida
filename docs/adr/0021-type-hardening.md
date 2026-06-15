# ADR 0021 — Endurecimento gradual dos tipos

**Status:** Aceito (em andamento) · **Data:** 2026-06-15

## Contexto
A migração para TypeScript (ADR 0014) foi pragmática: classes de view/manager
receberam `[key: string]: any` para destravar a conversão. Isso desliga a
checagem de tipos dentro dessas classes. A dívida deve ser paga aos poucos.

## Decisão
Remover o índice `any` declarando **campos reais** nas classes, começando pelas
**mais estáveis e reutilizadas do núcleo de engine**: `GameLoop`, `IsoCamera`,
`Renderer`, `StoryManager`. As classes maiores e mais voláteis de UI/mundo
(`Game`, `Hud`, `Menus`, `WorldManager`, `Minimap`, `WorldMap`, `InputManager`,
`AudioManager`, `VfxManager`) seguem com índice `any` por ora e serão
endurecidas incrementalmente.

## Consequências
- Type-check passa a pegar erros reais dentro das classes já tipadas.
- Abordagem incremental evita um PR gigante e arriscado.
- Próximos passos: tipar as demais classes e, eventualmente, ligar
  `strictNullChecks`.

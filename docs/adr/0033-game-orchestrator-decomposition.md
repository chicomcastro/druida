# ADR 0033 — Decomposição do orquestrador `Game`

**Status:** Aceito · **Data:** 2026-06-18

## Contexto
`core/Game.ts` cresceu como um *god-object*: além de compor mundo, render,
input e a lista de sistemas, concentra helpers de gameplay (combate, spawn,
economia, agenda) e todo o cabeamento de eventos. Isso dificulta leitura e
testes isolados.

## Decisão
Decompor de forma **incremental**, extraindo grupos coesos para módulos que
operam sobre `game`, sem alterar a API pública usada por sistemas/UI.

Primeiro passo: o cabeamento do event bus (`Game._bindEvents`) vira
**`core/gameEvents.ts` → `bindGameEvents(game)`** — reúne as reações a eventos
(XP/drops em `kill`, screen shake, hit-stop, auto-equip em `itemPickup`,
encantamento Metamorfo em `formSwap`) num único lugar. O construtor de `Game`
passa a chamar `bindGameEvents(this)`.

## Consequências
- `Game.ts` enxuga ~50 linhas e perde 3 imports (`grantXp`, `rollDrops`,
  `createLootOrb`) — agora locais ao módulo de eventos.
- Comportamento idêntico (suíte segue verde); base para os próximos passos
  (extrair spawn/scaling e economia para serviços dedicados).

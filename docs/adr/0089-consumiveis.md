# ADR 0089 — Consumíveis: poções de efeito instantâneo (E1)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O roadmap (E1) pede consumíveis (poções e comidas) como pilar de RPG e base
da hotbar 1–9 (E2) e da taverna (E5).

## Decisão
- **`consumables.ts`**: `ItemType` ganha `'consumable'`; `ConsumableItem`
  com `effect`/`magnitude`. Bases iniciais: Seiva Vital (cura), Seiva Vital
  Densa (cura maior), Orvalho Concentrado (restaura Seiva).
- **`useConsumable(game, id, item)`**: aplica o efeito (cura via
  `healEntity`, seiva via `gainSap`); não desperdiça em recurso cheio.
  Emite `consumableUsed`.
- **Fontes**: mercador sempre estoca 1 poção de cura (3 equipamentos + 1
  poção); inimigos têm chance (`potionChance` ~10%) de dropar poção.
- **Uso**: clicar num consumível na mochila usa em vez de equipar. A
  hotbar 1–9 (E2) dará uso rápido em combate.
- **Comida com buff temporário** fica para a taverna (E5), que traz o
  sistema de buffs com duração.

## Consequências
- Ciclo de sobrevivência (comprar/dropar/usar cura) fecha já no E1.
- Import lazy quebra o ciclo loot↔consumables↔combat em runtime (usos só
  dentro de funções).

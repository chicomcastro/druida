# ADR 0135 — Culinária: ingredientes, receitas e fundação do Craft (E19.1)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
O jogador pediu um **sistema de cozinha/craft**: monstros devem soltar
**ingredientes** (não comida pronta), que se juntam a itens coletados e comprados
para **cozinhar** comida numa bancada, evoluindo um **nível de Craft**. Esta
fatia entrega a fundação de dados + persistência + a troca dos drops + os ícones
certos; a bancada (E19.2), o forrageamento (E19.3) e o mercador (E19.4) vêm a
seguir.

## Decisão
- **Despensa de ingredientes** (`gameplay/ingredients.ts`): ingredientes são
  recursos **empilháveis** em `game.progress.ingredients` (contagem por id) — não
  entopem a grade 5×10. `INGREDIENTS` define id/nome/ícone/biomas/fonte
  ('drop'|'forage'). Helpers: `addIngredient`, `ingredientCount`,
  `hasIngredients`, `consumeIngredients`, `pouchList`, `forageOf(biome)`.
- **Receitas + nível de Craft** (`gameplay/recipes.ts`): `RECIPES` transforma
  ingredientes em uma **comida** (ADR 0134). `cook()` consome, dá XP e devolve a
  comida; `craftLevel`/`gainCraftXp`/`craftXpForLevel` (curva 0,40,120,…) sobem o
  nível, que destrava receitas. (A UI/bancada que chama `cook()` é a E19.2.)
- **Drops viram ingredientes** (`loot.ts` + `gameEvents.ts`): comida pronta
  **não cai mais** de inimigos; em vez disso, ~35% de chance de soltar um
  ingrediente de origem animal (carne/couro/pena) como orbe. `pickups.ts` roteia
  orbes de ingrediente para a despensa (não para a mochila).
- **Buffs salvos** (`save.ts` + `types.ts`): os buffs ativos passam a ser
  serializados/restaurados. Despensa e nível de Craft persistem sozinhos (vivem
  em `game.progress`).
- **Ícones certos na hotbar** (`Hud.ts`): a célula de poção mostra o emoji do
  item — comida exibe 🍖/🍵/🍲, poção segue 🧪 — resolvido pelo item na mochila.

## Consequências
- Base pronta para a cozinha: ingredientes entram, receitas existem, Craft sobe.
- Janela intencional: entre E19.1 e E19.2, comida só vem da taverna (`rest`) até
  a bancada existir — as fatias seguem em sequência.
- Verificado por print (ícones de comida na hotbar) e testes de despensa,
  receitas, curva de XP e `cook`.

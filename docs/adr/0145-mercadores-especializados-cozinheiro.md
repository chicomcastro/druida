# ADR 0145 — Mercadores especializados + cozinheiro na taverna (E21.2)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Todo mercador vendia de tudo — o armeiro também oferecia ingredientes, comida e
sementes. O Chico pediu **profundidade de vila**: cada mercador com seu escopo e
seu lugar, para valer a pena explorar (armeiro na forja, cozinheiro na taverna,
jardineiro numa casa própria).

## Decisão
- **Categorias de loja** (`economy.shopCategory` + `rerollShop`): o estoque passa
  a depender da categoria da loja ativa:
  - `weapon` (armeiro) → 5 armas + 2 poções.
  - `armor` (armadureiro) → 5 armaduras + 2 poções.
  - `food` (cozinheiro) → 2 comidas prontas + 4 ingredientes + 2 poções.
  - `garden` (jardineiro) → 3 sementes + 2 ingredientes.
  - `general` (mercado geral / mercador ambulante) → variado como antes
    (5 equip + 2 poções + 3 ingredientes + 1 comida + 2 sementes).
  A categoria vem de `game._interiorKind[shopId]` (food/garden) ou do viés de
  equipamento (`_interiorBias` weapon/armor); sem nada, é `general`. Assim o
  armeiro **não vende mais** plantas/sementes/comida.
- **Cozinheiro na taverna** (`InteriorManager._spawnCook`): ao entrar na taverna
  (service `rest`), além da taverneira nasce um **2º NPC** — o cozinheiro — com
  loja `interior:cook` categoria `food` (vende comida pronta e ingredientes).
  Destruído ao sair, como os demais NPCs.
- **`interiors.ts`**: novo campo `shopKind?: 'food' | 'garden'` para temas de
  interior especializados (usado pelo jardineiro no E21.3).

## Consequências
- Explorar a vila passa a ter propósito: cada bem tem seu dono e seu prédio.
- `general` preserva o comportamento antigo (mercador ambulante do hub segue
  variado), então nenhum teste de sortimento variado regride.
- Verificado por teste (categorias vendem só o que devem; cozinheiro nasce na
  taverna com loja food e some ao sair), typecheck e build.
- Próximo (E21.3): o **jardineiro** numa casa nova (`garden`) que vende sementes,
  replicado nas 4 vilas.

# ADR 0094 — Interiores acessíveis das casas (E5.1)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O roadmap (E5, "Vila 1 viva") pede que as casas deixem de ser cenário: portas
entráveis levando a interiores com **propósito** — lojas especializadas
(armeiro, armaduraria), **taverna** (comida = buff, descanso = cura + passar a
noite + salvar), casa da liderança e salão comunal, cada um com um NPC
responsável. A vila deve ser gameplay explorável por si só (Gate D). As casas
até aqui eram apenas malhas decorativas; nenhuma porta era interativa.

## Decisão
- **Pipeline reaproveitado da masmorra**: um `InteriorManager` espelha o
  `DungeonManager` — sala isolada fora do mundo (`ROOM = {-1000, 1000}`),
  `game.inDungeon = true` suspende overworld/spawns/clima (guardas já
  existentes), snapshot de `returnPos` e teleporte de volta na saída. A sala é
  construída uma vez e **recolorida por tema** a cada entrada; o NPC é
  criado/destruído por visita. Materiais de cor plana (sem textura) — leitura
  indoor limpa e seguro headless.
- **Data-driven** (`data/interiors.ts`): `INTERIOR_THEMES` define, por tema,
  nome/NPC/papel, `service` (`shop`|`talk`|`rest`), viés de estoque das lojas,
  cores e falas. Replica trivialmente nas outras vilas (E7).
- **Portas** (`SettlementManager._houseDoor`): cada casa da Clareira ganha uma
  placa suspensa na cor do tema + entidade `Interactable {kind:'house',
  interiorTheme}` na posição da porta (que já dá numa rua — ADR 0083). O
  mercado geral segue na banca externa; as casas hospedam as lojas
  especializadas, a taverna, a liderança e o salão.
- **Despacho** (`interaction.ts`): `kind:'house'` → `interiors.enter`,
  `'house_exit'` → `interiors.exit`, `'tavern'` → diálogo + `interiors.rest`.
  Lojas de interior reusam `kind:'merchant'` com `shopId:'interior:<tema>'`;
  `rerollShop` lê `game._interiorBias[shopKey]` e força o tipo (armeiro só
  armas, armaduraria só peças).
- **Taverna**: `rest()` cura o grupo ao máximo, tira do estado "caído", passa
  para o amanhecer (`dayNight.time`), limpa o clima e dispara **autosave**
  (evento `rested`). A refeição concede `game.meal` (**+12% de dano por 120s**,
  em data), lido no `dmgMul` e expirado no `interiors.update`.

## Consequências
- As casas viram destinos: comprar, equipar, descansar e conversar acontecem
  dentro delas — a vila passa a ser exploração com propósito.
- O `InteriorManager` é a base para o resto do E5 (camada social/rixa entre as
  duas famílias, já semeada nas falas da liderança/salão) e para replicar
  interiores nas vilas 2–4 (E7).
- **Decisão autônoma**: manter o mercador geral na banca externa (em vez de
  movê-lo para dentro agora) evita regressão visual; relocá-lo fica para o
  tuning de economia (E9). O balance da refeição/descanso e o preço do viés
  das lojas serão calibrados no Gate D/E9.

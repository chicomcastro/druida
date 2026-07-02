# ADR 0047 — Missões locais por vila + mercador regional

**Status:** Aceito · **Data:** 2026-07-02

## Contexto
As vilas (ADR 0041) eram cenário e diálogo: nada para *fazer* nelas, nenhum
motivo para voltar. A campanha principal (ADR 0010) segue linear; faltava
conteúdo lateral que usasse o worldbuilding já construído.

## Decisão
- **Uma missão por vila, dada pelo ancião** (`data/settlements.ts: quest` +
  `gameplay/quests.ts: QuestManager`). Três arquétipos data-driven que casam
  com o tema de cada povo:
  - **Vau das Palafitas** — *coleta*: 3 flores-de-lodo (orbes `questItem`)
    espalhadas no brejo ao redor.
  - **Cinzafolha** — *caça*: 6 criaturas de um foco de corrupção spawnadas
    fora da paliçada (alvos marcados; só eles contam).
  - **Abrigo do Degelo** — *elite*: o "Gelo-Antigo", uma Casca Oca promovida
    a elite Pétreo (reusa o ADR 0045).
- **Fluxo pelo ancião** (kind `quest_giver`, roteado pelo `interactionSystem`):
  1ª conversa aceita e spawna os objetivos; conversas seguintes lembram o
  restante (`remind` com `{n}`); com o objetivo cumprido, a entrega paga
  **essência + um artefato Único temático** (Lanterna de Musgo/healing_totem,
  Brasa de Cinzafolha/wildfire, Lasca do Degelo/ice_lance) — recompensas que
  mudam o build, não só números. Depois de concluída, o ancião volta às falas
  de worldbuilding.
- **Persistência**: `SaveV1.quests` (opcional — saves antigos seguem
  válidos) com status+progresso; missões ativas **respawnam os objetivos
  restantes** ao restaurar. `questCompleted` entrou nos gatilhos de autosave.
- **Mercador regional**: cada vila ganha um mercador (voxel do ADR 0043) com
  **estoque próprio** — `setActiveShop(key)` troca o `shopStock` por um mapa
  `_shopStocks`; o estoque nasce no nível da região ao abrir a loja lá
  (`regionLevel()` já é por bioma). O mercador do hub continua nos landmarks
  (key `hub`).

## Consequências
- As vilas viram destinos com loop próprio: chegar → conversar → sair para o
  objetivo temático → voltar para a recompensa; e o mercador regional dá
  motivo econômico para revisitar.
- Progresso lateral opcional: nenhum gate novo na campanha.
- Um arquétipo novo de missão é uma entrada de dados + (no máximo) um braço
  no `_spawnObjectives`. Estoques regionais não são persistidos (paridade com
  o comportamento anterior do estoque único).

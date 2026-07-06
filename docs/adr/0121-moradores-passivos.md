# ADR 0121 — Moradores passivos (vida própria nas vilas)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
As vilas tinham 5–6 moradores nomeados cada (com falas/quests). O pedido do
playtest: as vilas precisam de **mais vida própria** — mais moradores, mesmo que
**passivos** (sem papel na história), circulando pela vila.

## Decisão
- **Moradores passivos** (`SettlementManager._ambientVillagers`): além dos
  nomeados, cada vila ganha até **4 moradores extras** que passeiam como os
  demais (motor de `_wander`, ADR 0055) e têm **falas de ambiente** por tema
  (`AMBIENT_NAMES` / `AMBIENT_LINES`), sem quest nem participação na trama.
- **Posições seguras, sem geometria nova**: cada morador extra nasce no **ponto
  médio entre dois moradores nomeados** (ordenados por ângulo ao redor do centro
  da vila) — pontos na faixa de circulação onde os nomeados já andam. Pontos a
  menos de 4.5u do centro são descartados (evita o landmark central: árvore,
  chama, água). Reaproveita o pipeline `_buildVillager`, então cada um tem
  aparência variada (ADR 0081) e colisor.

## Consequências
- As 4 vilas ficam visivelmente mais habitadas e vivas, sem tocar no layout
  (nenhuma pegada nova; validador ADR 0085 intacto).
- Verificado nas 4 vilas (Clareira, Vau, Cinzafolha, Degelo): moradores extras
  circulam nas ruas/decks, nenhum presos em casa/água.
- Próximos passos do E15.2 (follow-ups): **objetos de cenário interativos**
  (postos de trabalho onde moradores se reúnem) e a polia de postes/lanternas
  (ADR 0120) aplicada às vilas 2–4.

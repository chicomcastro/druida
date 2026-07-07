# ADR 0149 — Casas de família na Clareira (E22.3)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
Com as famílias (E22.2), cada lar era só uma **âncora de moradia** (ponto pra
onde a família volta), não um prédio. O Chico quer que **todo mundo tenha uma
casa** de verdade. Começamos pela Clareira (template — princípio "Vila 1 como
template"; as demais vilas são apertadas e replicam depois).

## Decisão
- **Mais moradias no anel externo da Clareira** (`_buildDruida`): além das 3
  casas `home` originais, +3 casas de família nos vãos SE/SO/L do anel externo
  (`[19,-11]`, `[-19,-11]`, `[22,0]`) — 6 lares dedicados, validados pelo teste de
  sobreposição de pegadas (sem colisão com casas/ruas/props/landmarks).
- **Famílias ancoradas a casas reais** (`RESIDENCES` + `assignHouseholds(members,
  homes?)`): quando a vila tem lista de residências, cada família recebe uma
  **casa dedicada** como lar (em vez do spawn do 1º membro). No `_populate`, a
  Clareira passa suas 6 residências; as demais vilas seguem com âncora de
  moradia até a réplica.

## Consequências
- Toda família da Clareira mora numa casa de verdade: a rotina do dia (E22.1)
  agora sai e volta a um prédio, não a um ponto no chão.
- Verificado por teste (footprints sem sobreposição; households) e em runtime num
  Game real: **10/10 moradores da Clareira ancorados a casas** (5 famílias em 5
  casas — 4 casais, 1 com filho, 1 solteiro).
- Próximo: **E22.4** replicar casas de família nas vilas 2–4 (Vau/Cinzafolha/
  Degelo); **E22.5** aldeões conversando entre si.

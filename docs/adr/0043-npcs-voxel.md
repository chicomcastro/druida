# ADR 0043 — NPCs em modelos voxel (aldeões, anciãos, Guardiã e mercador)

**Status:** Aceito · **Data:** 2026-07-02

## Contexto
Personagens e inimigos usam os modelos voxel data-driven com animação
procedural por partes (ADRs 0038/0039), mas os NPCs — Guardiã, mercador e os
moradores das vilas (ADR 0041) — eram cones+cubos ad-hoc, estáticos e fora do
sistema. A inconsistência de estilo ficava evidente com os NPCs lado a lado
dos jogadores nas vilas.

## Decisão
- **Fábrica paramétrica `makeVillagerSpec(look)`** em `voxelModels.ts`: gera a
  spec de um aldeão bípede (túnica, capuz, cabeça grande, braços/pernas) a
  partir de cores de túnica/cinto. Anciãos ganham capa, cajado com cristal na
  cor do tema e escala maior (1.05 vs 0.95).
- **Assentamentos** (`SettlementManager`) constroem os moradores com a paleta
  do tema (`VILLAGER_PALETTES` ganhou `trim`); o morador agora **olha para o
  centro da vila** (Transform.rot) e, por ter `userData.parts`, recebe a
  **animação procedural de idle** do renderSync sem código novo.
- **Guardiã e mercador** (`landmarks.ts`) viram specs fixas `guardian` e
  `merchant` (mochila de mascate nas costas; banca como mesh separado para não
  balançar com a respiração do idle).
- **Vitrine** ganha o grupo "NPCs" (`guardian`, `merchant`, `villager`,
  `elder`) para inspecionar os modelos como qualquer outro.
- O cristal do cajado deixou de ter material emissivo pulsante próprio: os
  materiais voxel são **compartilhados por cor** (cache), então efeitos
  por-instância mutariam todos os clones. O pulso de luz das vilas segue nas
  lanternas/chamas (ADR 0042).

## Consequências
- Um único estilo visual (e um único sistema) para tudo que é "gente" no
  jogo; NPCs respiram no idle, o que deixa as vilas menos estáticas.
- Menos código ad-hoc de mesh nos managers; novas vilas/temas só definem
  paleta.
- Como os NPCs entram no fluxo `Renderable` + `animateBody`, qualquer melhoria
  futura de animação (gestos, olhar para o jogador) beneficia todos.

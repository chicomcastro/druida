# ADR 0161 — Hazards ilustrados: wiki 100% por entidade (E28)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
Após os lotes 1 e 2 (ADR 0159/0160), faltava só ilustrar os **hazards
ambientais** — as zonas de perigo telegrafadas. Elas são um VFX efêmero (anel em
shockwave, ~0.4s), então não dava para pegar por spawn natural.

## Decisão
- **Captura do telegrafo** (`docs/wiki.md §13`): teleportando a câmera para cada
  bioma perigoso e emitindo `vfx.ring` de vida longa em anéis concêntricos (o
  mesmo visual do aviso), fotografei o perigo de cada bioma: Pântano (lodo/root),
  Bosque Cinza (cinza/atordoa), Picos (gelo/congela) e Coração (carne/queima).
  A Clareira é segura (sem hazard). 4 imagens novas.

## Consequências
- **A wiki agora ilustra toda entidade citada**: mundo/biomas, vilas, interiores,
  formas, armas, skills, itens, inimigos, chefes, fauna, NPCs, mapa e hazards.
- Sem mudança de código (só captura + wiki).

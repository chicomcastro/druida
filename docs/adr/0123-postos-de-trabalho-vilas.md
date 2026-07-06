# ADR 0123 — Postos de trabalho com trabalhador nas vilas 2–4

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Além de mais moradores (ADR 0121), o playtest pediu **objetos de cenário com que
os moradores interajam** — postos de trabalho que dêem a leitura de "vida
própria": alguém usando o objeto, não só andando.

## Decisão
- **Objetos de trabalho** (`SettlementManager`), um por vila 2–4, tema a tema:
  - Vau: **mesa de limpar peixe** (`_fishTable`) em `(4,-3)`.
  - Cinzafolha: **toco de rachar lenha** com machado e achas (`_choppingBlock`)
    em `(8,1)`.
  - Degelo: **bastidor de curtir peles** (`_furRack`) em `(6,2)`.
  Cada objeto tem colisor e **pegada registrada** (validador ADR 0085), então o
  `footprints.test` garante que não invade casas/ruas.
- **Trabalhador fixo** (`_worker` + `_workers`): um morador nasce junto ao posto
  com **raio de passeio curto** (2.2u, novo campo `radius` no `_wander`), então
  ele fica ali "trabalhando" em vez de circular pela vila toda. Tem nome e falas
  de ofício próprias.

## Consequências
- As vilas 2–4 ganham foco de atividade: peixe sendo limpo no Vau, lenha rachada
  em Cinzafolha, peles curtidas no Degelo — conteúdo que conta a rotina da vila.
- Padrão reutilizável (`_worker(radius)` + objeto com pegada) para novos postos.
- Verificado nas 3 vilas: objeto + trabalhador no lugar, sem sobreposição
  (footprints.test verde) e sem bloquear caminho.

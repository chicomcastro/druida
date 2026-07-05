# ADR 0085 — Validador de sobreposição de pegadas (M20.1)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
Playtest 7: "a torre de vigia está colidindo com a tenda do mercador…
essas colisões estão acontecendo de forma generalizada, não parece ter
check de colisão" + "a porta da tenda ficou mais alta que a base da
pirâmide". O layout das vilas era posicionado no olho, sem verificação.

## Decisão
- **Registro de pegadas**: toda estrutura registra sua AABB local ao ser
  construída (`w.fp(cx, cz, w, d, label)`) — casas, anexos (só a parte
  externa), cabanas, tendas, palafitas, bancas, torre, serraria, muros de
  gelo, cairns, barcos, fogueiras, jardins, props.
- **`overlaps()`** devolve os pares que se intersectam; o construtor avisa
  no console em dev e o novo **teste de layout** (`footprints.test.ts`)
  falha o CI se houver QUALQUER sobreposição em qualquer vila.
- **Colisões que o validador pegou (e foram corrigidas)**: torre de vigia ×
  banca do mercador (torre movida para (-6,-12), espigão junto), lenha ×
  cabanas em Cinzafolha (2), cairn dentro do muro de gelo, 5ª tenda × banca
  do Degelo (movida para (-9,-12) com trilha nova).
- **Tenda com parede-base de 2.2u**: a camada de baixo da pirâmide agora é
  mais alta que a porta (2.05u) — nada flutua acima da base; pirâmide
  termina a ~4.5u com o capuz de neve.

## Consequências
- Layout "no olho" deixa de compilar: colisão de estrutura vira teste
  vermelho no CI, não feedback de playtest.

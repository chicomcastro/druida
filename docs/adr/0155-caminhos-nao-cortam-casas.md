# ADR 0155 — Caminhos não cortam casas: roteador + validador (E24.1)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
No playtest o jogador reparou que o **caminho de saída de duas ou três casas
passava por dentro de outra casa**. A causa: cada porta gera um espigão em "L"
(horizontal, depois vertical) até a via em anel; uma casa do anel **externo**
mandava esse espigão reto pela fileira, cruzando a casa do anel **interno** na
mesma linha (ex.: casa 11→casa 1, casa 9→casa 2 na Clareira; e uma rua
hard-coded do Degelo entrava na tenda -3,-8 pelas costas).

## Decisão
- **Roteador que evita casas** (`SettlementManager._spurSegs`): para cada porta,
  testa alvos no anel (ponto radial + cantos + meios de aresta) nas duas ordens
  de "L" e escolhe o traçado com **zero travessias** de casa (desempate por
  comprimento). As pegadas das casas já estão registradas quando o espigão é
  roteado. A Clareira passou a usar o roteador; a rua do Degelo foi reencaminhada
  para entrar pela **frente** da tenda.
- **Validador** (`pathsThroughHouses`): registra as células de rua por vila em
  coord local (`pathCells`) e acusa qualquer laje cujo centro caia dentro da
  pegada de uma construção habitável (casa/cabana/palafita/tenda/anexo/serraria/
  torre), com margem para a soleira da porta ficar na borda.
- **Teste** (`streetsClear.test.ts`): falha se **qualquer** caminho atravessar uma
  casa em **qualquer** vila — o furo não volta a passar despercebido, como já era
  com o validador de sobreposição de pegadas (ADR 0085).

## Consequências
- Zero caminhos atravessando casas nas 4 vilas (verificado); layout continua sem
  sobreposição de pegadas (ADR 0085) e sem postes no meio da rua (ADR 0128).
- O roteador é genérico: novas casas herdam o desvio automaticamente.
- Follow-up (ADR 0154): fazer os aldeões **seguirem** as células de rua, não só
  desviarem de obstáculos.

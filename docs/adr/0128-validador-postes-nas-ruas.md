# ADR 0128 — Validador: poste não pode ficar sobre a laje da rua

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Mesmo depois de ajustar os postes à mão, um deles voltou a cair "no meio do
caminho". Corrigir por print é frágil — o pedido do playtest foi um **teste que
acuse** postes sobre a rua, como o validador de pegadas (ADR 0085) faz para
sobreposição de estruturas.

## Decisão
- **Registro de dados**: `_streets` passa a gravar cada célula de rua em
  coordenadas de mundo (`streetCells`), e `_lantern` grava a posição de cada
  poste (`lanternPts`). Ambos já rodam ao construir as vilas.
- **Detector**: `SettlementManager.lanternsOnStreets()` devolve os postes cujo
  centro cai **dentro de uma célula de rua** (a laje é 0.96 × 0.96 no grid).
  Postes ao LADO da rua passam; só falha quem está sobre a laje.
- **Teste** (`tests/lanterns.test.ts`): falha se qualquer poste estiver sobre uma
  rua, imprimindo as coordenadas do infrator — igual ao `footprints.test`.
- **Fix acusado pelo teste**: o poste do mercado da Clareira (`13.7,11`) estava
  sobre o espigão da casa 7 → movido para `14.5,13`; a lanterna nova do Degelo
  (`-2.5,3`) estava sobre a trilha da chama azul → movida para `-5,3`.

## Consequências
- Regressão de "poste no caminho" agora quebra o CI, não o playtest.
- Padrão reaproveitável: qualquer prop com colisor que deva ladear (não bloquear)
  ruas pode entrar no mesmo validador.

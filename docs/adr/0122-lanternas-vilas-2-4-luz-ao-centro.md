# ADR 0122 — Lanternas das vilas 2–4 com luz voltada ao centro

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
A Clareira já teve suas lanternas voltadas para os caminhos (ADR 0116/0120), mas
as **vilas 2–4** (Vau, Cinzafolha, Degelo) ainda usavam a lanterna no padrão
antigo — o braço/luz apontando sempre para **+x** (direção fixa, "aleatória" na
prática). Faltava a mesma polia.

## Decisão
- **Luz ao centro/caminho** (`SettlementManager`): as lanternas de Vau e
  Cinzafolha passam `faceX/faceZ` = **centro da vila (0,0 local)** — como as
  ruas dessas vilas irradiam do centro, apontar a luz para o miolo ilumina as
  passarelas/praça em vez do mato. A lanterna da ponta do píer do Vau aponta
  **para a base do píer** (desce o caminho).
- Degelo não usa postes de lanterna (a luz vem dos cristais de gelo e da chama
  azul), então não precisou de ajuste.

## Consequências
- Coerência visual entre as 4 vilas: em toda vila a luz "abre" para onde se
  anda, não para fora.
- Mudança mínima e sem risco: só o parâmetro de direção das lanternas já
  existentes; nenhuma posição/pegada nova.
- Próximos passos do E15.2 seguem: objetos de cenário interativos e postos de
  convívio nas vilas 2–4.

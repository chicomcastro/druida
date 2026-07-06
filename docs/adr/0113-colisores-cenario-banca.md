# ADR 0113 — Objetos de cenário sólidos + banca fora das ruas

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Feedback do playtest: (1) dava para **atravessar** lanternas, barris, lenha e a
banca do mercador — pareciam fantasmas; (2) a **laje da banca** do Círculo do
Carvalho ainda ficava **em cima de uma rua** (o espigão da casa externa do norte
passava por baixo dela).

## Decisão
- **Colisores nos adereços** (`SettlementManager`): `_barrel` (r 0.45),
  `_woodpile` (r 0.8), `_lantern` (r 0.25) e os postes do `_clothesline` (r 0.2)
  passam a registrar colisor. A **banca do mercador** (estrutura) ganha colisor
  r 1.6 tanto no hub (`landmarks._buildMerchant`) quanto nas vilas regionais
  (`SettlementManager._buildMerchant`) — o NPC continua com o seu colisor e a
  interação (alcance 3.5) segue funcionando de fora.
- **Banca fora das ruas** (Clareira): a banca saiu de `(0,15)` — sob o espigão da
  casa externa do norte — para o **vão nordeste `(12,17)`**, sem rua por baixo.
  Um **caminho curto** leva até a **frente** da banca (para na frente, não passa
  por baixo). Baú movido para `(8,17)`, junto.
- `w2` do mercador regional passou a expor `collider` (antes só `add`/`world`),
  senão os postes de lanterna quebrariam ao registrar colisor.

## Consequências
- Cenário passa a ter presença física: o jogador esbarra nos objetos em vez de
  atravessá-los, e a banca é sólida.
- Nenhuma laje de rua fica mais sob a banca; o validador de pegadas (ADR 0085)
  segue sem sobreposições.
- Colisores são pequenos: props ao lado das ruas apenas encostam, sem fechar
  passagem. Se algum prop de vila 2–4 ficar num corredor estreito, reposicionar.

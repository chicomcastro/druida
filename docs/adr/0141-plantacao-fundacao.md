# ADR 0141 — Plantação: fundação (E20.1)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
A vila tem uma plantaçãozinha (canteiros decorativos na praça). O Chico topou
transformar isso num **sistema de plantação funcional** — depois dos ajustes da
culinária (E19). Farming fecha o ciclo dos ingredientes: além de forragear
(achar no mundo — E19.3) e comprar (E19.4), o jogador passa a **semear → esperar
crescer → colher** uma fonte renovável e planejável de vegetais.

## Decisão
Fundação em `src/gameplay/farming.ts` — só dados e funções puras (testável),
sem view ainda:
- **Culturas** (`CROPS`): erva 🌿, cenoura 🥕 e cogumelo 🍄 (as hortaliças de
  quintal; as demais seguem só forrageáveis). Cada uma tem semente, ícone,
  ingrediente rendido (o homônimo da despensa — E19.1), rendimento, `growTime`
  (60–120 s; ~7 min = 1 dia) e preço da semente (para E20.3).
- **Sementes** na despensa (`game.progress.seeds`): `addSeed`/`consumeSeed`/
  `seedList` + `grantStarterSeeds` (dá 3 erva + 2 cenoura uma vez).
- **Canteiros** (`game.progress.plots`, por id estável): `plantPlot` (consome 1
  semente num canteiro vazio), `tickFarming(dt)` acumula crescimento por
  canteiro, `plotProgress`/`plotStage` (0–3) para a view, `harvestPlot` credita o
  ingrediente e esvazia o canteiro. O relógio é **acumulado por canteiro**, não
  a hora do mundo (que reinicia por sessão).
- Persistência de graça: `save.ts` serializa `game.progress` inteiro.

## Consequências
- Base pronta para as fatias visuais (E20.2 canteiros interativos + UI de plantio;
  E20.3 sementes no mercador + estágios/dia).
- Verificado por teste (dados válidos; semear/crescer/colher; sem semente/ocupado;
  starter idempotente), typecheck e build.

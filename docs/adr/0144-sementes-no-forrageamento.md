# ADR 0144 — Sementes no forrageamento (E21.1)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Sementes só vinham do mercador (E20.3) ou das sementes iniciais. O Chico pediu
para também **conseguir sementes no campo**: ao colher algo no mundo, ter uma
chance de vir a semente junto — não só o ingrediente — para plantar depois.

## Decisão
- **`farming.cropForIngredient(id)`**: mapeia um ingrediente para a cultura cujo
  produto é aquele ingrediente (erva/cenoura/cogumelo).
- **`farming.rollForageSeed(id, roll)`**: função pura — se o ingrediente colhido
  corresponde a uma cultura plantável e `roll < SEED_FORAGE_CHANCE` (0.35), devolve
  o id da cultura; senão `null`. Ingredientes sem cultura (carne, couro…) nunca
  dropam semente.
- **`ForageManager.collect`**: após creditar o ingrediente, sorteia
  `rollForageSeed(id, Math.random())` e, no sucesso, credita 1 semente
  (`addSeed`) com uma mensagem própria ("🥕 +1 Cenoura · 🌱 +1 Semente de Cenoura!").

## Consequências
- Colher no mundo agora alimenta a plantação: o jogador junta sementes explorando,
  além de comprar. Fecha o ciclo forragear → semear.
- Verificado por teste (mapa ingrediente→cultura; drop só abaixo da chance;
  ingrediente não-plantável nunca dropa), typecheck e build.
- Próximo (E21.2/E21.3): mercadores especializados por casa — armeiro/armadureiro
  só equipamento, cozinheiro na taverna vende comida, jardineiro vende sementes.

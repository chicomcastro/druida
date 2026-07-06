# ADR 0146 — Jardineiro: casa que vende sementes em cada vila (E21.3)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Faltava o vendedor de sementes dedicado. O Chico pediu que, além do armeiro
(forja), do armadureiro e do cozinheiro (taverna), houvesse um **jardineiro**
numa casa própria vendendo as sementes — e que **cada vila** tivesse todas essas
entidades, para dar riqueza à exploração.

## Decisão
- **Tema de interior `garden`** (`interiors.ts`): a Casa do Jardineiro (Fiora),
  loja de `service: 'shop'` com `shopKind: 'garden'` — pela categorização do
  E21.2, vende **só sementes + ingredientes forrageáveis** (nada de equipamento
  ou comida pronta).
- **Uma casa do jardineiro por vila** (`SettlementManager`): converti uma
  moradia genérica em `garden` na Clareira, no Vau das Palafitas e no Abrigo do
  Degelo; em Cinzafolha (que só tinha 3 cabanas temáticas) **adicionei uma 4ª
  cabana** a oeste, num vão livre entre a serraria e a cabana sudoeste (validado
  pelo teste de sobreposição de pegadas).

## Consequências
- Fecha o épico E21: cada vila tem armeiro (forja), armadureiro, cozinheiro
  (taverna) e jardineiro (casa própria) — explorar a vila tem propósito, e cada
  bem tem seu dono e seu prédio.
- Verificado por teste (as 4 vilas têm porta `garden`; tema é loja de categoria
  `garden`; nenhuma pegada se sobrepõe), typecheck, build e checagem em runtime
  (loja do jardineiro vende `seed,seed,seed,ing,ing`).

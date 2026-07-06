# ADR 0140 — Salão Comunal: cozinha nos interiores (E19.6)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
O caldeirão de cozinha (E19.2) ficava **exposto na praça** de cada vila, ao
lado do mercador. O Chico pediu para tirar a cozinha da praça e colocá-la
**dentro do salão comunal** — e, na dúvida sobre onde cozinhar, confirmou:
"O caldeirão deve existir na taverna e na nova construção que é o salão comunal".

## Decisão
- **Caldeirão dentro dos interiores** (`InteriorManager._buildKitchen`): quando o
  tema do interior tem `kitchen: true`, a sala ganha um caldeirão fumegante num
  canto (com luz quente) e o interativo `kind:'kitchen'` (🍲 E — Cozinhar). A
  entidade e a malha são destruídas ao sair, como o NPC e os móveis.
- **Temas com cozinha** (`interiors.ts`): `tavern` (taverna) e `hall` (salão
  comunal) recebem `kitchen: true`. A taverna existe nas 4 vilas, então cozinhar
  fica disponível em todas; o salão comunal (Clareira) reforça o ponto social.
- **Praça limpa** (`SettlementManager`): removidos `_buildKitchen`/`_cauldronMesh`
  e a chamada no laço de construção — nada de caldeirão a céu aberto.

## Consequências
- Cozinhar virou uma atividade de **interior** (entra na porta → caldeirão),
  coerente com "as coisas dentro do salão comunal, não na praça, exposto".
- Sem regressão de save/estado — só muda onde o interativo `kitchen` nasce.
- Verificado por teste (taverna e salão têm `kitchen`; loja não; some ao sair),
  typecheck, build e checagem em runtime (entidade `kitchen` viva na taverna).
- Próximo: plantação (E20) — transformar os canteiros decorativos em plantio
  funcional (semear → crescer → colher ingredientes).

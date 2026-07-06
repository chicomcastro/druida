# ADR 0111 — Clareira em torno da Carvalho-Mãe

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Feedback do playtest: a Clareira (vila-hub) estava **aglomerada**, com poucas
casas e — apesar do lore dizer que "a vila cresceu em anel ao redor da
Carvalho-Mãe" — a árvore ficava **deslocada** (em `(0,−10)`) enquanto as casas se
apinhavam ao redor da fogueira. O usuário pediu a vila **em torno da árvore
principal**, com mais casas e **caminhos bem estruturados** ao redor dela.

## Decisão
Recentrar o Círculo do Carvalho na Carvalho-Mãe (`SettlementManager._buildDruida`
+ `WorldManager._buildHub`):

- **Carvalho-Mãe no centro** `(0,0)` (antes `(0,−10)`), colisor 2,2.
- **Dois anéis de casas** ao redor da árvore: anel interno (r≈13) com as 6 casas
  de serviço (armeiro/armaduraria/taverna/liderança/salão + 1 moradia) viradas
  para a árvore; anel externo (r≈22) com 3 moradias, nos vãos do interno.
- **Via em anel** (quadrada, ±7) encerrando a praça da árvore + **espigões
  radiais** de cada porta até o anel — "caminhos bem estruturados ao redor dela".
  O **sul fica aberto** (corredor até o portão/menires) — o limiar da campanha.
- Praça da árvore: fogueira, jardins de ervas e props redistribuídos; a **banca
  do mercador e o baú** foram para o vão norte da praça (`landmarks.ts`), livres
  das casas.
- Mais espaçamento: a vila ocupa a Clareira ampliada (ADR 0110), sem
  aglomeração; o validador de pegadas (ADR 0085) segue sem sobreposições.

## Consequências
- A Clareira lê como um povoado que abraça a árvore-mãe, coerente com o lore
  (l9), e com espaço/rotas legíveis.
- O jogador nasce na praça, ao pé da Carvalho-Mãe, com a Guardiã logo ao sul.
- As vilas 2–4 já foram **afastadas no mundo** (ADR 0110); dar a elas o mesmo
  tratamento de layout interno (mais ruas/casas) fica como próximo passo do E15.

# ADR 0119 — Biomas maiores, cidades mais ao centro

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Playtest do mapa-mundi: as cidades pareciam **perto das fronteiras** entre
biomas. Pedido: ampliar cada bioma e deixar a cidade **mais ao centro**, mesmo
que isso aumente as distâncias de viagem (mundo aberto, level-scaling).

## Decisão
- **Âncoras afastadas** (`data/settlements.ts`), mantendo o hub na origem:
  - Vau `(90,-72)` → `(140,-95)`
  - Cinzafolha `(-160,38)` → `(-200,48)`
  - Abrigo do Degelo `(140,165)` → `(175,206)`
  Afastar as âncoras aumenta a distância ao vizinho no Voronoi ponderado, então
  cada região cresce e a cidade (âncora) fica mais funda. **Margem de interior**
  (distância da cidade à fronteira mais próxima) subiu de 52–100 u para
  **76–120 u**; a Clareira (peso 1.3, era 1.25) passou de 52 → 92 u.
- **Coração ampliado** (`WorldManager.CORACAO_BLOB`): `(0,-225,r90)` →
  `(0,-285,r110)`, empurrado ao sul junto com o resto.
- **Santuários re-posicionados** (`story.ts`) relativos às novas cidades,
  mantendo o critério do ADR 0118 (longe da vila, mesmo bioma, fork):
  Lobo `(-45,-78)`, Urso `(213,-42)`, Corvo `(-250,-39)`, Sapo `(90,268)`;
  miniboss e boss reposicionados no Pântano/Coração novos.
- **Mapa maior** (`WorldMap.MAP_RADIUS`): `290` → `330` para o disco caber os
  marcos mais externos (rim máx. ~283 u).
- **Validação por script**: réplica de `biomeAt` confirmou cada cidade/santuário
  no bioma certo, margens alvo e tudo dentro do disco; testes de coordenada de
  bioma (world-gameplay, hazards, purity) atualizados para os novos pontos.

## Consequências
- Cada vila fica no coração do seu bioma; a viagem entre regiões é mais longa e
  o mundo, mais amplo — coerente com a progressão aberta (ADR 0110).
- Números de layout centralizados em `settlements.ts` + `WorldManager`: os
  santuários e o mapa derivam desses pontos.
- Trade-off aceito: primeira hora com mais deslocamento; se pesar no Gate F,
  dá pra reintroduzir mais atalhos de fast-travel.

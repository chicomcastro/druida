# ADR 0119 — Biomas maiores, cidades mais ao centro

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Playtest do mapa-mundi: as cidades pareciam **perto das fronteiras** entre
biomas. Pedido: ampliar cada bioma e deixar a cidade **mais ao centro**, mesmo
que isso aumente as distâncias de viagem (mundo aberto, level-scaling).

## Decisão
- **Âncoras afastadas** (`data/settlements.ts`), mantendo o hub na origem:
  - Vau `(90,-72)` → `(180,-120)`
  - Cinzafolha `(-160,38)` → `(-235,58)`
  - Abrigo do Degelo `(140,165)` → `(175,206)`
  Afastar as âncoras aumenta a distância ao vizinho no Voronoi ponderado, então
  cada região cresce e a cidade (âncora) fica mais funda. **Margem de interior**
  (distância da cidade à fronteira mais próxima) subiu de 52–100 u para
  **108–128 u** — Vau `76→108`, Cinzafolha `92→116`, Degelo `120→128`, Clareira
  `52→112`. O peso da Clareira **baixou** 1.25 → **1.15**: estava comprimindo o
  lado interno de Vau/Cinzafolha (a queixa do playtest), então foi reduzido para
  equilibrar as regiões.
- **Coração ampliado** (`WorldManager.CORACAO_BLOB`): `(0,-225,r90)` →
  `(0,-320,r120)`, empurrado ao sul junto com o resto.
- **Santuários re-posicionados** (`story.ts`), agora **mais longe da vila
  (~130 u) e no fundo do bioma selvagem** (margem 88–208), mantendo o mesmo
  bioma da cidade (ADR 0118): Lobo `(-65,-113)`, Urso `(302,-164)`,
  Corvo `(-348,-7)`, Sapo `(110,319)`; miniboss e boss no Pântano/Coração novos.
- **Mapa maior** (`WorldMap.MAP_RADIUS`): `290` → `380` para o disco caber os
  santuários mais externos (rim máx. ~348 u).
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

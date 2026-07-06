# ADR 0109 — Mundo orgânico (biomas não-circulares)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
O mundo era um conjunto de **anéis concêntricos** (`RING_RADII`): quanto mais
longe do hub, mais avançado o bioma — o que impunha uma ordem radial de
progressão. A visão do usuário é um **mundo aberto sem ordem clara**, com
espaço para várias campanhas/gameplays independentes. O formato circular
contradizia isso.

## Decisão
Substituir os anéis por **regiões orgânicas de Voronoi** (`WorldManager`):

- **Âncoras data-driven**: cada bioma tem uma âncora = o centro da sua vila
  (`BIOME_ANCHORS`, derivado de `SETTLEMENTS`). `biomeAt(x,z)` devolve o bioma da
  âncora mais próxima.
- **Fronteiras deformadas** (domain warp): antes de medir distância, a posição é
  perturbada por `valueNoise2` (novo em `utils/math`), dando bordas irregulares e
  naturais em vez de linhas retas de Voronoi. Determinístico e puro (sem
  `Math.random`), então `biomeAt` continua seguro em qualquer contexto.
- **Coração Corrompido** vira uma **mancha própria** (`CORACAO_BLOB`) ao sul,
  fora do alcance das vilas — a zona final deixa de ser "tudo além do raio X".
- Consumidores seguem de graça: spawns, props, fauna, hazards, POIs, masmorras,
  chão de blocos e clima já roteavam por `biomeAt`.
- **Falésias** (`TerrainFeatures`) agora nascem nas fronteiras orgânicas
  (detectadas amostrando `biomeAt` numa grade), não em círculos.
- **Mapa-mundi** pinta as regiões amostrando `biomeAt` por célula (cores por
  bioma), no lugar dos anéis concêntricos.

## Consequências
- O mundo perde a leitura "mais longe = mais difícil por raio"; a base para a
  **progressão aberta com level-scaling** (ADR 0110) e para campanhas paralelas.
- `RING_RADII` foi removido; quem usava (`TerrainFeatures`, `WorldMap`) passou a
  usar `biomeAt`/âncoras. `biomeAt` continua a única fonte de verdade de bioma.
- Os marcos da campanha ainda estão nas posições antigas (coluna no eixo -Z);
  serão **reposicionados dentro das suas regiões** no ADR 0110, junto do
  level-scaling.
- Reprodutível por seed; os centros de vila caem sempre no próprio bioma
  (garantido por teste).

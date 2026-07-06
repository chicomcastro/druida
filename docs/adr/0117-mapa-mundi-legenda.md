# ADR 0117 — Mapa-mundi legível: legenda de biomas + marcadores distintos

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
O mapa-mundi (tecla M) já pintava as **regiões orgânicas de bioma** (ADR 0109),
o fog of war e os marcos. Mas faltava **legibilidade** (E14): as cores das
regiões não tinham chave — o jogador não sabia qual mancha era qual bioma nem o
nível sugerido — e vilas e santuários eram desenhados iguais (mesmo círculo),
dificultando "ver onde fica cada vila".

## Decisão
- **Legenda de biomas** (`WorldMap`): abaixo do disco, um painel lista cada
  bioma na ordem da campanha (`BIOME_ORDER`) com swatch da mesma cor do mapa
  (`BIOME_MAP_COLOR`), nome (`BIOMES[b].name`) e **nível sugerido**
  (`BIOMES[b].level`). Uma única fonte de verdade — os nomes/níveis vêm de
  `data/biomes.ts`.
- **Marcadores distintos**: **vilas** (assentamentos) viram **losango** com
  contorno claro; **santuários/chefe** seguem **círculo**. A legenda documenta a
  convenção. Assim a localização das vilas salta aos olhos no meio das regiões.
- Reputação (estrelas, ADR 0108), fog of war e fast-travel seguem iguais.

## Consequências
- O mapa passa a se explicar sozinho: cor → bioma → nível, e forma → tipo de
  marco. Casa com o pilar de "progressão aberta com level-scaling" (ADR 0110):
  o jogador lê o nível de cada região antes de viajar.
- Sem novos dados: a legenda deriva de `BIOMES`, então novos biomas aparecem
  automaticamente. Nenhuma mudança em fast-travel ou fog.

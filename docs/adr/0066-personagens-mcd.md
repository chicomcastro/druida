# ADR 0066 — Personagens MCD: proporção, trama de tecido e losango (M14.5)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Fase 5 do estilo MCD ([plano](../art-direction-mcd.md)): os personagens do
Minecraft Dungeons são cabeçudos, com textura pixel na pele/roupa e um
losango de seleção sob os pés.

## Decisão
- **Proporção cabeçuda**: `buildVoxelGroup` escala a parte `head` em 1.14×
  em todos os modelos (heróis, formas, inimigos, NPCs) — um ponto único, sem
  reescrever as specs; o animador não muda (as juntas são as mesmas).
- **Trama de tecido**: novo tipo `cloth` no atlas pixel-art (ADR 0062) —
  trama sutil de baixo contraste, tintada pela cor de cada parte via o cache
  de materiais dos voxels. Pele/roupa ganham textura sem virar ruído.
- **Losango de identidade**: o anel do jogador virou um losango
  (`RingGeometry` de 4 lados) — a marca de seleção do MCD.
- **Atenuador diurno no LightPool** (refinamento do ADR 0065): de dia o sol
  lava as luzes pontuais (`0.35 + 0.65·night`); em masmorra não há dia —
  sem atenuação. As poças de luz protagonizam à noite, como no MCD.

## Consequências
- Personagens leem "MCD" à distância isométrica; custo zero (mesmos
  materiais compartilhados, uma textura 16×16 a mais na GPU).
- Cabeças 14% maiores mudam levemente a silhueta de TODOS os modelos —
  verificado na vitrine (druida, wolf) e in-game.

# ADR 0063 — Chão de blocos: grade instanciada que segue o grupo (M14.2)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Fase 2 do estilo MCD ([plano](../art-direction-mcd.md)): o chão do Minecraft
Dungeons é uma grade de blocos com variação por bloco — o plano único
texturizado do M14.1 dá o grão, mas não o *patchwork* (cada bloco com seu
tom, buracos, rotação de textura).

## Decisão
- **`world/BlockGround.ts`**: grade 69×69 de topos de bloco (BoxGeometry
  1×0.3×1) centrada no grupo, reconstruída quando o centro anda 2+ células
  (pseudo-streaming, como os props). **Um InstancedMesh por tipo de textura**
  (grama/terra/neve/pedra) = 4 draw calls para o chão inteiro.
- **Variação por bloco**: RNG determinístico por célula (hash de gx/gz —
  o mundo não "ferve" ao recompor): jitter de valor ±7% sobre a cor do bioma,
  rotação da textura em passos de 90°, e ~6% de blocos **afundados** (-0.1,
  mais escuros) — relevo de leitura sem enterrar os pés (topo dos blocos fica
  em y≈-0.01; o plano de gameplay segue y=0).
- **Transições de bioma na grade**: cada bloco consulta `biomeAt` +
  `_effectiveDef` (pureza) — a fronteira entre biomas vira uma linha de
  blocos trocando de textura/cor, como no MCD.
- **Masmorras**: a grade se esconde (count=0) — a arena em (0,1000) tem chão
  próprio.
- O plano 600×600 do M14.1 fica por baixo como **horizonte** (mesma textura;
  coberto pela névoa) — remoção avaliada na fase de elevação (M14.3).

## Consequências
- ~4.7k blocos visíveis por 4 draw calls; recomposição só ao cruzar células
  (~4.7k iterações esporádicas, sem custo por frame).
- Memória: 4 pools × 4.7k matrizes ≈ 1.2 MB — ok até para tablet.
- `receiveShadow` na grade: sombras de árvores/casas caem nos blocos.

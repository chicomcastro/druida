# ADR 0067 — Polish final do estilo MCD: ruínas de POI e grade recalibrado (M14.6)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Fecho do M14 ([plano](../art-direction-mcd.md)): os itens de acabamento que
ficaram das fases anteriores.

## Decisão
- **Ruínas nos acampamentos** (`PoiManager._buildRuins`): círculo quebrado de
  blocos de pedra pixel-art ao redor de cada acampamento corrompido —
  o POI lê à distância como "lugar antigo" (vocabulário MCD). Permanecem
  após purificar (a história aconteceu ali). 1 InstancedMesh para todas.
- **Grade recalibrado**: saturação 1.12 → 1.16 e contraste 1.05 → 1.07 —
  os biomas mais escuros do M14 pedem um pouco mais de punch na imagem final.
- **Itens avaliados e dispensados**: rim light nos heróis (exigiria patch de
  shader nos materiais compartilhados dos voxels — custo/risco alto para um
  efeito que a proporção nova + losango já entregam) e brasas com
  profundidade (as partículas ambientais já usam `sizeAttenuation`).

## Consequências
- M14 completo: as 7 assinaturas visuais do MCD mapeadas na análise estão
  cobertas (blocos, pixel-art, luz dramática, emissivos, personagens,
  rastros, losango).
- ~35 blocos de ruína no mundo, +1 draw call.

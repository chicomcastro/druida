# ADR 0064 — Elevação decorativa: falésias nas bordas e lava no Coração (M14.3)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Fase 3 do estilo MCD ([plano](../art-direction-mcd.md)): o drama vertical —
falésias, desníveis e desfiladeiros de lava — sem tocar em navegação/IA
(o gameplay continua plano, como no próprio MCD).

## Decisão
- **`world/TerrainFeatures.ts`**: afloramentos de falésia ao longo das
  fronteiras de bioma (anéis r=55/110/165) — aglomerados de 2–5 blocos de
  pedra (1–2 de altura) a cada ~16u com ~35% de vagas vazias (vãos largos de
  passagem), nunca perto de vilas (`isSafe` +10) nem do hub. Estático e
  determinístico pela seed; **1 InstancedMesh** para todas as falésias.
  Um collider por aglomerado.
- **Veios de lava no Coração** (`BlockGround`): ~5% das células de pedra do
  bioma corrompido viram blocos de **lava emissiva** afundados (pool próprio,
  5º InstancedMesh) — o bloom (ADR 0054) faz o brilho. A versão purificada
  usa grama, então a cura da campanha apaga a lava de graça.
- **Fix descoberto na verificação visual**: a grade de blocos (ADR 0063)
  estava com o topo 1cm ABAIXO do plano-horizonte — o patchwork visível era
  só a textura do plano, e a lava ficava invisível. O plano desceu para
  y=-0.35 (horizonte sob a névoa); os blocos são a superfície real.

## Consequências
- Fronteiras de bioma ganham marcação física (leitura de "região nova") e o
  Coração ganha a assinatura de fornalha do MCD.
- +1 draw call (falésias) e +1 (pool de lava); ~230 colliders estáticos.
- Plataformas/ruínas nos POIs ficaram para o polish (M14.6).

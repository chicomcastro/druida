# ADR 0025 — Object pooling de partículas

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
As partículas de VFX (jatos em dano/morte) eram criadas e **descartadas**
(`geometry.dispose`/`material.dispose`) a cada frame de explosão, gerando
alocação e pressão de GC em combates intensos.

## Decisão
`VfxManager` passa a usar um **pool**: geometria compartilhada e meshes
reciclados. Ao explodir, adquire meshes do pool (ou cria sob demanda); ao
expirar, devolve ao pool (apenas `visible = false`), sem descartar. A cor é
ajustada por reuso.

## Consequências
- Menos alocação/GC nas explosões; comportamento visual idêntico.
- Object pooling de **projéteis/inimigos** (que são entidades ECS destruídas)
  continua no backlog — exigiria reciclar entidades, mais invasivo; a correção
  de vazamento (ADR 0015/cleanup) já removeu o problema principal de memória.

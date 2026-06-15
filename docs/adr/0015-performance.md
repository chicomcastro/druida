# ADR 0015 — Performance: spatial hash + InstancedMesh

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
Dois gargalos cresciam com o mundo aberto e as hordas:
1. Colisão e checagem de projéteis eram **O(n²)** (todos contra todos).
2. Cada prop (árvore/rocha) era um `Group` próprio → muitos **draw calls**.

## Decisão
- **Spatial hash** (`src/utils/SpatialHash.ts`): grade uniforme no plano XZ. A
  resolução de colisão (`movementSystem`) e a checagem de projéteis
  (`projectileSystem`) passam a consultar apenas vizinhos da célula, caindo para
  ~O(n) com distribuição esparsa. Cada par de colisão é resolvido uma vez
  (`id < otherId`). A célula é dimensionada por `2× o maior raio`.
- **InstancedMesh** para props (`WorldManager`): três pools (tronco, folhas,
  rocha) com um draw call cada; cor por bioma via `instanceColor`. Slots livres
  são reciclados ao gerar/descartar props (pseudo-streaming). Props deixam de
  ter `Renderable` (visual é instanciado; só mantêm `Transform`+`Collider`).

## Consequências
- Escala melhor para hordas grandes e mais props sem explodir draw calls/CPU.
- Spatial hash é coberto por teste unitário; a colisão mantém o mesmo
  comportamento (push-out), só mais rápida.
- Inimigos/projéteis ainda podem ganhar pooling de objetos (backlog) para
  reduzir alocação/GC — próximo passo de performance.

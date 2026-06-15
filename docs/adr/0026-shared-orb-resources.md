# ADR 0026 — Geometria/material compartilhados em orbes (projéteis/loot)

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
O profiling (`docs/profiling-projectiles.md`) mostrou que pooling de entidades
não é necessário (~0,1 MB/s no pior caso), mas apontou uma otimização **barata e
de baixo risco**: cada projétil/orbe criava sua própria geometria e material,
desperdiçando alocação e CPU (construção de geometria) e gerando churn de buffer
na GPU a cada tiro.

## Decisão
`buildOrb` passa a **reusar** geometria (cache por raio) e material (cache por
cor) compartilhados. O mesh recebe `userData.shared = true` e o
`Game._cleanupDestroyed` **pula o dispose** desses recursos (descartá-los
quebraria os demais orbes vivos). Medido no benchmark: **−52% de alocação** e
**−83% de CPU** por projétil; bônus de evitar criar/destruir o buffer na GPU.

Seguro porque orbes não sofrem mutação de material por instância (não têm
`Tint`/flash de dano; só animam posição). Cores/raios são um conjunto pequeno e
fixo, então os caches não crescem de forma relevante.

## Consequências
- Menos alocação/CPU/GPU no caminho mais frequente, sem mexer no ECS.
- Pooling de entidades fica adiado até que o profiling real justifique (gatilhos
  em `docs/profiling-projectiles.md`).
- Invariante a manter: meshes com `userData.shared` nunca devem ter o material
  mutado por instância.

# ADR 0039 — Animação procedural por partes

**Status:** Aceito · **Data:** 2026-06-19 · **Depende de:** ADR 0038

## Contexto
Os modelos voxel (ADR 0038) já vêm com PARTES nomeadas por junta. Queremos
movimento (idle/andar/atacar) sem clips de animação nem assets — coerente com a
abordagem procedural do projeto.

## Decisão
- **`src/systems/animation.ts` → `animateBody(body, dt, state)`**: anima as
  partes por seno/fase, conforme `gait`:
  - **biped**: pernas e braços defasados ao andar + bob; idle = respiração.
  - **quadruped**: 4 patas em fase cruzada + cauda.
  - **bird**: bater de asas (mais forte ao voar/mover).
  - Sobreposição de **ataque** ([0..1]): braço direito (e arma) lançam à frente
    e voltam.
  - Só escreve em `.rotation`/`.position` das partes → **lógica pura, testável**
    sem WebGL.
- **`render.ts`** chama `animateBody` por frame: `moving`/`speed` vêm da
  `Velocity`; o `attack` do jogador deriva de `attackTimer / attackCooldown`.
  Entes caídos não animam.
- **Vitrine**: botões Idle/Andar/Atacar acionam a mesma função no modelo
  exibido — inspeção fiel ao jogo.

## Consequências
- Personagens e inimigos ganham vida sem custo de asset; reutilizado por jogo e
  vitrine (mesma função).
- `animation.ts` é medido na cobertura (teste valida defasagem das pernas e o
  lance do braço no ataque).
- Próximos passos possíveis: reações de hit/morte, animação de ataque para
  inimigos (via timer da IA), easing do retorno do golpe.

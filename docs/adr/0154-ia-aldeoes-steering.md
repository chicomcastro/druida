# ADR 0154 — IA dos aldeões: steering (desvio + separação) (E23.5)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
No playtest os aldeões pareciam "burros": andavam em linha reta a alvos
aleatórios, se batiam entre si o tempo todo e trombavam nas casas e na
Carvalho-Mãe do centro. Faltava qualquer noção de desvio.

## Decisão
- **Módulo de steering** (`src/gameplay/steering.ts`, puro/testável):
  - `separationForce` — afasta de vizinhos dentro do raio (não se amontoam);
  - `avoidForce` — empurra para longe dos retângulos de estrutura (footprints da
    vila) próximos, inclusive saindo se já estiver dentro;
  - `pointInRects` — testa se um ponto cai numa estrutura;
  - `steer` — combina rumo + separação + desvio num vetor unitário (peso: desvio
    > separação > rumo).
- **`SettlementManager._wander`**: cada aldeão carrega os footprints da sua vila
  (`v.fps`, coord local). Ao escolher um alvo, **rejeita** pontos dentro de
  estruturas (6 tentativas). Ao andar, soma **separação** (vizinhos próximos) e
  **desvio** (estruturas) ao rumo — deixa de atravessar casas/árvore e de
  empurrar os outros.

## Consequências
- Os moradores circulam com naturalidade: contornam a árvore-mãe e as casas e
  mantêm distância entre si, em vez de trombar.
- Verificado por teste (`steering.test.ts`: separação, desvio dentro/fora,
  rejeição de alvo, combinação) e em runtime num Game real: após ~6s, **0 aldeões
  dentro da Carvalho-Mãe e 0 pares sobrepostos** na Clareira. 336 testes verdes.
- Follow-up possível: seguir explicitamente as células de rua (`streetCells`) para
  priorizar caminhar nos caminhos, além de só desviar de obstáculos.

## Adendo (E67) — colisão parou de brigar com o steering + herói imóvel
Playtest (mobile): "npcs mais bugados do que nunca" — empurra-empurra na saída
das casas e nos pontos de reunião, e o herói era **arrastado** ao ser esbarrado.
Duas causas e correções:
- **Raio de colisão × raio de separação (empurra-empurra):** o E66 subiu o
  colisor do aldeão para 0.85 (distância mínima 1.7u entre centros), MAIOR que o
  raio de separação do steering (1.5u). Havia uma faixa (1.5–1.7u) onde a
  **colisão empurrava forte** mas o steering nem tentava afastar → oscilação. Fix:
  colisor 0.85 → **0.7** (min 1.4u) e raio de separação 1.5 → **2.0u** (busca de
  vizinhos ±2.6u). Agora o steering mantém o espaçamento SUAVE bem antes do push
  rígido — a colisão vira só uma rede de segurança rara.
- **Herói imóvel para NPCs/inimigos dinâmicos:** em `resolveCollisions`, um
  dinâmico esbarrando no jogador agora empurra **só a si mesmo** (o herói é uma
  "parede" para eles). Herói↔estático (parede/casa/árvore) e herói↔herói seguem
  como antes — o herói não atravessa estruturas e ainda separa de outro P2.
- Travado por testes (`villagerOverlap.test.ts`): NPC esbarrando não move o herói;
  o herói ainda é bloqueado por estático.

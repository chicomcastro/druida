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

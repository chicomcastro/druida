# ADR 0013 — Mapa-mundi com fog of war e fast-travel

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
O mundo aberto radial ficava difícil de navegar: sem visão geral nem viagem
rápida, atravessar regiões a pé era tedioso (especialmente no backtracking e no
coop).

## Decisão
- **Fog of war** rastreado no `WorldManager` como conjunto de células de grade
  (`fogCell = 14`) reveladas em volta do centróide do grupo a cada frame. É
  persistido no save.
- **Mapa-mundi** (`WorldMap`, tecla **M**) em tela cheia: desenha anéis de
  bioma, células exploradas, marcos (hub, santuários, Coração) e jogadores num
  canvas 2D. Pausa o jogo enquanto aberto.
- **Fast-travel** clicando num marco **descoberto** (explorado ou cujo santuário
  já foi ativado). `game.fastTravelTo` bloqueia a viagem se há inimigos perto do
  grupo — coerente com o recall ao hub (tecla T).

## Consequências
- Navegação e backtracking ficam práticos; recompensa explorar (revela o mapa).
- Marcos não descobertos aparecem como "???" — incentivo à exploração.
- Pontos de viagem são fixos (marcos da campanha); fast-travel arbitrário não é
  permitido, preservando a exploração a pé das áreas intermediárias.

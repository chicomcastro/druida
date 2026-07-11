# ADR 0173 — Simulador sintético: jogador-robô + métricas de balanceamento (E40)

**Status:** Aceito · **Data:** 2026-07-11

## Contexto
Balancear o jogo (dano, vida dos inimigos, ritmo, drops) exige **dados de jogo
real**, não só intuição. Havia telemetria passiva (ADR 0051), mas ninguém para
*gerar* o jogo repetível: um agente que joga sozinho, de forma determinística,
para medir. O pedido do E40: um simulador que joga de verdade — dá inputs,
explora, combate — e coleta métricas para tunar.

## Decisão
`src/gameplay/simulator.ts` — tudo puro/determinístico (RNG semeado, sem
`Math.random`) e headless (sem WebGL/DOM), então roda nos testes e no jogo real:

1. **`SimPlayer`** (cérebro do robô) — a cada tick lê o mundo (ECS) e decide um
   input com a **mesma forma** do `input.getPlayerInput` (o contrato de
   `gatherInput`): caça o inimigo vivo mais próximo (aproxima → golpeia no
   alcance), **esquiva** ocasional quando colado, e sem inimigos **explora** em
   linha reta trocando de rumo a cada ~1 s. O golpe respeita o **combo por
   timing** (ADR 0092): o robô toca o botão no ponto-doce (~75% do cooldown),
   como um jogador hábil lendo a barra — não spama.
2. **`SimMetrics`** (coletor) — escuta os eventos do jogo (`damage`, `kill`,
   `playerDowned`, `essence`, `itemPickup`) e deriva um relatório de
   balanceamento: DPS causado/sofrido, abates/min, mortes, sobrevivência,
   essência, drops por raridade e deslocamento líquido.
3. **`runSimulation(game, opts)`** — o loop headless: a cada tick o robô decide,
   o input é escrito no `Intent` e a lista de sistemas roda (como o loop do jogo,
   mas dirigido pelo bot). Encerra cedo se o jogador morre. `DEFAULT_SIM_SYSTEMS`
   é o subconjunto que resolve exploração + combate sem managers pesados.
4. **`installSyntheticInput(game, playerId)`** — acopla o robô ao **jogo real**:
   troca o provedor de input do P1 pelo cérebro do bot, e o loop normal passa a
   ser dirigido por ele. No console, `DRUIDA.sim.drive()` liga o modo "o jogo se
   joga sozinho" e `DRUIDA.sim.metrics.report()` mostra o balanceamento.

## Consequências
- Dá para **gerar sessões repetíveis** e medir: rodar N ticks com uma semente e
  ler o relatório; comparar tunings (mudar HP de um inimigo e ver o DPS/abates).
  A mesma peça serve de **smoke test** de que o combate/exploração fecham o ciclo.
- Travado por testes (`simulator.test`: RNG determinístico; o robô aproxima e
  golpeia no alcance / aproxima de longe; explora sem inimigos (desloca-se);
  **abate um inimigo rodando o jogo de verdade** e as métricas registram;
  relatório deriva as métricas dos eventos; mesma semente → mesmo relatório).
  386 testes verdes, `tsc` limpo, `vite build` ok.

## Futuro
Robô que também cumpre **missões** (falar com anciãos, entrar em masmorras,
usar santuários) e navega o mapa por waypoints; varredura de balanceamento
(matriz de tunings → CSV de métricas); perfis de robô (agressivo/cauteloso) para
medir dificuldade; rodar a simulação no CI como *canary* de regressão de ritmo.

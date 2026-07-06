# ADR 0110 — Progressão aberta: level-scaling + marcos nas regiões

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Com o mundo orgânico (ADR 0109), faltava tornar a **progressão independente do
mapa**: o usuário escolheu **"totalmente aberto (level-scaling)"** — dá para ir a
qualquer região em qualquer ordem. Além disso, no primeiro corte a **Clareira
ficou pequena** e as vilas nasceram **coladas nas fronteiras**.

## Decisão
- **Level-scaling global** (`Game.regionLevel`): o nível de conteúdo (inimigos,
  loot, preços) acompanha o **nível do jogador**, não a região. Um acento por
  bioma de 0–2 mantém a textura temática (o Coração pesa um pouco mais) sem
  travar acesso. Fim do gate "mais longe = mais forte".
- **Marcos da campanha nas regiões** (`story.ts LANDMARKS`): os santuários
  (Urso/Corvo/Sapo) e o mini-chefe saíram da coluna −Z e foram para **dentro das
  regiões** das suas vilas; a campanha vira uma trilha opcional espalhada pelo
  mundo aberto.
- **Clareira maior + vilas mais ao interior** (feedback do playtest):
  - **Voronoi ponderado** (`BIOME_WEIGHT`): a Clareira tem peso 1,25, virando uma
    zona inicial ampla de exploração/combate antes de avançar.
  - As vilas 2–4 foram **afastadas do hub** (Vau 78→115u, Cinzafolha 131→164u,
    Degelo 184→216u), de modo a ficarem **bem no interior** dos seus biomas, com
    boa margem até a fronteira.
  - `WARP_AMP` reduzido (24→18) para os centros de vila permanecerem estáveis sob
    o Voronoi ponderado.

## Consequências
- Mundo aberto de verdade: qualquer região é jogável em qualquer ordem, com o
  desafio acompanhando o jogador — base para campanhas secundárias independentes.
- A Clareira agora comporta exploração antes de sair; as vilas parecem parte do
  seu bioma, não postos de fronteira.
- Balance numérico do scaling (acento por bioma, curva) fica para o Gate F.
- A ordem dos passos da campanha (desbloqueio de formas) ainda existe como fio
  condutor; abrir múltiplas campanhas paralelas é trabalho futuro.

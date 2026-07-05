# ADR 0098 — Mundo vivo: fauna ambiente por bioma (E8.1)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O E8 ("mundo vivo") pede, entre outros, **animais interagindo com os biomas**:
bichos que vagueiam, fogem e reagem ao jogador (cervos/lebres na Clareira,
sapos/libélulas no Pântano, corvos no Bosque, cabras/corujas nos Picos). Até
aqui o mundo aberto só tinha inimigos e props estáticos — faltava vida neutra.

## Decisão
- **`FaunaManager`** (novo, testável): mantém um pool com teto (`MAX=9`) de
  bichos vagueando numa banda ao redor do grupo (16–32u), reciclados além de
  46u ou quando o bioma muda. Suspenso em masmorra/interior (`game.inDungeon`).
- **Data-driven** (`data/fauna.ts`): `FAUNA_BY_BIOME` define, por bioma,
  espécies com cor, tamanho, velocidade, **raio de fuga** e `hop` (pulo de
  sapo/lebre). O **Coração Corrompido não tem fauna** — nada sobrevive lá.
- **Comportamento**: passeio por alvos aleatórios; **fuga** direta para longe
  quando um jogador entra no raio da espécie (velocidade ×1.8). Sem colisor e
  sem combate — puramente ambiente; movem o próprio `Transform` (não passam
  pelo movementSystem) e recebem um bob/pulo leve na animação.
- **Modelo**: blocos simples (corpo + cabeça + patas) tingidos por espécie —
  barato e no vocabulário MC, sem depender do rig voxel dos personagens.

## Consequências
- O mundo aberto ganha vida legível e específica de cada bioma, reagindo à
  presença do jogador — o pedido central de "animais interagindo com biomas".
- Motor genérico: novas espécies são só dados; hazards jogáveis e novos
  inimigos/bosses (o resto do E8) entram em seguida (E8.2) sem tocar a fauna.
- Custo controlado: teto de 9 entidades sem colisor, recicladas por distância;
  densidade/raios ficam para o tuning do Gate E.

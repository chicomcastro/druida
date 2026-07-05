# ADR 0083 — Toda porta liga numa rua (M19.2)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
Playtest 6: "tem casa com portas que não dão em nenhum caminho na vila;
seria interessante todas serem projetadas para estarem interligadas". As
ruas do ADR 0080 eram artérias genéricas — as portas nem sempre davam
nelas (e em Vau/Cinzafolha algumas portas ficavam de COSTAS para o centro).

## Decisão
- **Espigões de porta no hub**: a posição da porta de cada casa é calculada
  (`_spun` do offset da porta pela rotação) e um espigão em L liga a porta
  à artéria mais próxima (x=0, z=4, rua z=14 para as casas do norte) —
  automático: casas novas ganham caminho de graça.
- **Rotações corrigidas** onde a porta ficava de costas: palafitas
  (escada/porta ao centro) e cabanas dos lenhadores.
- **Vau**: passarelas re-projetadas — cada casa tem tábuas em L da base da
  escada até o centro; a rede de píer fica toda interligada.
- **Cinzafolha**: ruas ligam as três portas ao eixo do portão sul.
- **Degelo**: trilhas já batiam nas entradas (conferido).

## Consequências
- Nenhuma porta dá no nada; a circulação da vila conta uma história.
- O espigão automático torna o layout do hub extensível sem retrabalho.

# ADR 0075 — Escala MCD do cenário: postes jumbo e banca-estrutura (M16.2)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Descoberta do playtest 4: a sensação de "câmera longe demais" não era zoom
— era **cenário pequeno**. Na referência do MCD, o poste de luz tem ~2.5× a
altura do herói e a banca do mercador é uma estrutura inteira com toldo.
Nossos postes tinham 1.9u e a "banca" era uma mesinha de 1.6×1.0.

## Decisão
- **`buildMerchantStall()`** (landmarks, reutilizada pelas vilas): 4 postes
  de 3u, toldo-laje com listra clara (tecido pixel), balcão com mercadorias
  em cubos e caixotes empilhados — a silhueta "Luxury Merchant" da
  referência. Toldo na cor do tema (gelo = azul).
- **Postes de lanterna** (`_lantern`): mastro quadrado de 3.1u + braço +
  caixa de lanterna pendurada (pulso e LightPool preservados, luz a 2.6u).
- **Estandartes**: mastro quadrado de 3.3u, pano maior com trama.
- **Cercas**: postes quadrados + travessa contínua (leitura de cerca MC).
- **Árvores/pinheiros** um degrau maiores (s 1.0–1.6/1.0–1.7, era 0.8–1.3)
  — o mundo fica "grande" sem mexer na câmera (ADR 0069 fica como está).

## Consequências
- A proporção herói/cenário casa com a referência; a câmera de 11 de
  frustum passa a parecer "MCD" de fato.
- Cilindros/cones restantes (fonte, moinho, barcos, sprouts) ficam para o
  M16.4; alinhamento de rotações no M16.3.

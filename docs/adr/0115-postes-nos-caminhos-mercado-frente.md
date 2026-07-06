# ADR 0115 — Postes atrelados aos caminhos + mercado como casa

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Feedback do playtest: (1) os **postes de luz** estavam em posições meio
aleatórias — fariam mais sentido **ladeando os caminhos**; (2) o **caminho até o
mercado chegava por trás** dele. Insight do usuário: o mercado é, no fundo, uma
**casa** — deveria ter frente, um espigão até essa frente e um poste no fim do
espigão, como qualquer casa.

## Decisão
- **Postes seguem os caminhos** (`SettlementManager._buildDruida`): em vez de uma
  lista fixa de posições, cada casa ganha **um poste ao lado da sua porta** (no
  fim do espigão), com offset lateral para não cair sobre a laje. A iluminação
  passa a desenhar o traçado das ruas. Acentos extras: um poste no fim do
  espigão do mercado e um ao lado do portão sul.
- **Mercado como casa** (`landmarks._buildMerchant` + espigão em `_buildDruida`):
  a banca foi **girada 180°** para o balcão encarar a vila (−Z, lado do
  espigão), e o caminho chega pela **frente** da banca (antes chegava por trás).
  Um poste marca o fim desse espigão.

## Consequências
- A vila fica mais orgânica e legível: luz e caminhos contam a mesma história, e
  o mercado se aproxima como as casas (frente → caminho → poste).
- Padrão reaproveitável: "frente + espigão + poste" pode guiar o layout das
  vilas 2–4 no próximo passo do E15.
- Postes têm colisor (ADR 0113); ficam ao lado das lajes, sem bloquear.

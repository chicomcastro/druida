# ADR 0120 — Postes ladeando os caminhos (Clareira)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Os postes da Clareira ficavam **ao lado de cada porta** (ADR 0116) — muito
**próximos das casas** e **uns dos outros**. Uma primeira tentativa de movê-los
para o fim do espigão os deixou **em cima dos caminhos** e **apontando para
lugar nenhum**. O certo, pelo playtest: cada poste **no tile ao lado da rua**
(nunca sobre ela), **espaçado**, com a **luz voltada para a rua**.

## Decisão
- **Poste ladeia o caminho** (`SettlementManager._buildDruida`): posições
  curadas ~1.3u **para fora da via em anel** (no tile de grama ao lado da rua,
  nunca sobre a laje) e a **luz aponta para a rua mais próxima** — não para a
  casa. Validado por script (distância à rua 0.9–2.4u; fora das pegadas).
- **Espaçados**: 2 postes por lado do anel (`±8.3` nos eixos, alvo no ponto do
  anel), longe das casas (anel r7 × casas r13+). Acentos ladeando as demais
  artérias: 2 no corredor sul e 1 no espigão do mercado.

## Consequências
- A luz desenha as ruas (anel, corredor, mercado) sem nenhum poste sobre a via
  nem junto das moradias; leitura limpa e arejada.
- Padrão "poste no tile ao lado da rua, luz para a rua" fica pronto para as
  vilas 2–4 (próximo passo do E15).
- Postes seguem sólidos (ADR 0113) mas fora da laje, sem obstruir a passagem.

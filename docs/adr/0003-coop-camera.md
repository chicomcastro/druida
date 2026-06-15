# ADR 0003 — Câmera de grupo same-screen

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
Coop same-screen num mundo aberto cria tensão: tela única × jogadores que se
espalham. Precisávamos de uma regra de câmera que mantenha todos visíveis sem
enjoar.

## Decisão
- A câmera segue o **centróide** dos jogadores vivos (`coopSystem` calcula
  `groupCenter` e `groupSpread`).
- **Zoom dinâmico**: o frustum ortográfico cresce com a dispersão do grupo,
  com `min/maxFrustum` (clamp) para não afastar demais.
- Suavização exponencial independente de framerate.
- Jogadores muito distantes são naturalmente puxados pela borda; o wipe e o
  revive evitam que um jogador isolado quebre a sessão.

## Consequências
- Funciona bem para grupos coesos; grupos muito espalhados perdem detalhe.
- Se isso incomodar em playtest, avaliar **split-screen** (já previsto como
  alternativa no GDD) — não implementado agora para manter simplicidade.

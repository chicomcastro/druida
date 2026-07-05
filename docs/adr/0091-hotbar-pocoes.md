# ADR 0091 — Cinto de poções + cooldown visual (E2)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O roadmap (E2) pede hotbar 1–9 para uso rápido e cooldown visual. Duas
descobertas ao integrar: (1) o cooldown radial de habilidade **já existe**
nos slots de artefato do painel do jogador (`.art .cd`); (2) a fileira
numérica **já está ocupada** — 1–3 = dons (artefatos) e 5–9 = formas.

## Decisão
- **Cinto de poções** no HUD (`#hud-hotbar`, base central): mostra as
  poções da mochila do P1 agrupadas por tipo, com ícone ilustrado,
  contagem e tecla. Reconstruído só quando a assinatura muda (barato no
  loop).
- **Teclas livres**: `Q` usa a 1ª poção, `Digit4` a 2ª (respeitando
  1–3 dons / 5–9 formas). `bagConsumables(inv)` agrupa; `useHotbarSlot`
  usa e remove 1 da mochila.
- **Cooldown visual**: mantém-se o existente nos dons; documentado aqui
  como parte do pilar da UI MCD.
- Hint do HUD passa a citar "Q poção".

## Consequências
- Sobrevivência em combate sem abrir a mochila (a dor real do playtest).
- A fileira 1–9 totalmente remapeável (dons/formas/poções num só cinto
  configurável) fica como evolução futura — exige repensar os controles
  centrais, não cabe nesta fatia.

# ADR 0019 — Onboarding por dicas contextuais

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
Novos jogadores não tinham orientação sobre controles e sistemas (formas,
encantamentos, esquiva, mapa). Um tutorial dedicado seria custoso e enfadonho.

## Decisão
`Tutorial` mostra **dicas contextuais**, cada uma **uma única vez** (estado
"visto" persistido em localStorage), em um banner discreto que some sozinho:
- Sequência introdutória no início (movimento, ataque, artefatos/esquiva, falar
  com a Guardiã).
- Dicas disparadas por eventos: primeiro item (inventário), primeiro nível
  (encantar), primeira forma (trocar com 5–9), primeira queda (revive/esquiva),
  primeiro bioma novo (perigo/loot/mapa).

Fila simples evita sobreposição. Não bloqueia o jogo.

## Consequências
- Ensina na hora certa, sem interromper; não repete entre sessões.
- Adicionar/ajustar dicas é trivial (um `hint(id, texto)`).

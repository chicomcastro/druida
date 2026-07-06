# ADR 0126 — Hotbar 1–9: modelo de dados (E17.3a)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Com as skills ativas liberáveis (E17.1/0124) e visíveis na UI (E17.2/0125),
falta o jogador **atribuí-las a uma hotbar 1–9** e conjurar por tecla — o pedido
estilo Minecraft. A fiação de input (Digit1–9) e o desenho na HUD são a parte
arriscada/difícil de testar; então esta fatia entrega só o **modelo + regras**,
isolado e testado.

## Decisão
- **`gameplay/hotbar.ts`**: 9 slots persistidos em `game.progress.hotbar`
  (compat. com save antigo via `ensureHotbar`). Cada slot guarda o id de uma
  habilidade (ou `null`).
- **Regras de atribuição**: `assignSkill` só aceita habilidade **existente** em
  `ABILITIES` e **liberada** (`unlockedAbilities`); mover a mesma skill limpa o
  slot antigo (sem duplicar). `clearSlot`, `hotbarAbility`, `autoFillHotbar`
  (auto-equipa liberadas nos vazios) e `pruneHotbar` (tira o que saiu no respec).
- **Isolado e testável**: 7 testes cobrindo faixa, validação, no-dup, autofill e
  prune. Não toca em input/HUD/combate ainda.

## Consequências
- Fundação pronta para a **E17.3b**: ligar Digit1–9 a `hotbarAbility` +
  `castAbility` e desenhar os slots na HUD (com cooldown/Seiva).
- `autoFill`/`prune` mantêm a hotbar coerente com a árvore ao liberar/respec.
- Persistência natural (fica em `progress`, salvo com o resto).

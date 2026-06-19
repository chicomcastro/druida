# ADR 0035 — Foco em combate corpo-a-corpo; ranged como exceção

**Status:** Aceito · **Data:** 2026-06-18

## Contexto
O ataque-base do Druida humanóide conjurava a magia da arma como **projétil**, e
todas as armas eram cajados de conjuração (ranged). O loop de combate, portanto,
era predominantemente à distância. O design passou a priorizar **corpo-a-corpo**,
com ranged aparecendo eventualmente e em situações mais específicas.

## Decisão
- **Armas ganham estilo** (`style: 'melee' | 'ranged'`):
  - Melee são a maioria do loot (com `range`/`arc` próprios) — `MELEE_WEAPON_BASES`.
  - Ranged (cajados de conjuração) são mais raras: ~20% das armas sorteadas
    (`RANGED_WEAPON_CHANCE`). Sem trava de progressão — apenas mais raras.
- **Ataque-base adaptativo** (`staff_strike`): melee por padrão (golpe em arco
  com o elemento da arma no acerto); só dispara projétil se a arma equipada for
  `ranged`. Sem arma, é melee.
- **Arma inicial** do jogador é melee (determinística).
- **Inimigos**: a Clareira inicial não tem inimigos ranged (só melee/exploder);
  o corvo-sombra é introduzido a partir do Pântano, reforçando "ranged mais à
  frente".
- Formas seguem como estão: Lobo/Urso/Sapo melee, **Corvo** ranged (opção
  específica), e artefatos de conjuração (cooldown) continuam sendo o ranged
  "eventual".

## Consequências
- Loop padrão é corpo-a-corpo; ranged é uma escolha (arma rara, forma Corvo,
  artefatos) e não mais o default spammável.
- Mudança data-driven e localizada (loot + ataque-base + tabelas de bioma);
  API de habilidades inalterada.
- Abre espaço para futuro gating de ranged por progressão, se desejado (hoje
  deliberadamente sem gating).

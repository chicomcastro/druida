# ADR 0129 — Hotbar 1–9: input + HUD + atribuição (E17.3b)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
O modelo da hotbar (E17.3a, ADR 0126) guarda até 9 habilidades em
`game.progress.hotbar`, mas nada conjurava por tecla nem desenhava os slots. Esta
fatia liga a entrada, desenha a barra estilo Minecraft e deixa o jogador
**atribuir** uma skill liberada a uma tecla — fechando o loop liberar → equipar →
conjurar.

## Decisão
- **Fileira numérica dividida** (não-quebra): as teclas **1–4** viram a hotbar de
  habilidades; **5–9** seguem como troca de forma (como já eram). Os dons saem do
  número e ficam só em **U/I/O**. As poções rápidas trocam de `4` para **Q/R**.
- **Input**: `bindings.ts` ganha `hotbar0–3` (Digit1–4) e some com Digit1–3 dos
  artefatos. `InputManager` expõe `intent.hotbar[0..3]` (só teclado nesta fatia;
  gamepad fica para depois) em `_keyboardInput`, `_empty`, `_padInput` e `_merge`.
- **Conjuração**: `playerControl` percorre `intent.hotbar` e chama
  `castAbility(game, id, hotbarAbility(game, slot), aimAngle, {slot, hotbar})` —
  respeitando cooldown/Seiva como qualquer habilidade. Só o P1 por ora (a hotbar
  mora em `progress`, que é do grupo).
- **HUD**: `#hud-hotbar` deixa de mostrar poções e vira 9 células — 1–4 com o
  ícone do ramo da skill + overlay de cooldown; 5–9 com o ícone da forma, a atual
  destacada. Reconstrói o DOM só quando a atribuição/lista de formas muda; o
  cooldown e o destaque atualizam por frame.
- **Atribuição na UI**: no painel de Talentos, cada skill **liberada** ganha 4
  botões (1–4) destacando o slot atual; clicar de novo no mesmo slot desatribui.
  Liberar uma skill agora auto-equipa no 1º slot livre (`autoFillHotbar`).
- **Suporte**: `skillTree.ts` expõe `abilityBranch`/`abilityNode` para a HUD
  iconizar por ramo.

## Consequências
- O jogador finalmente conjura magias por 1–4 e vê a barra completa (skills +
  formas) na base da tela — o pedido "hotbar 1–9 estilo Minecraft".
- Slots 5–9 do **modelo** (índices 4–8) ficam reservados: a HUD os usa para
  formas, mas a atribuição só mira 0–3. A unificação total (formas dentro do
  modelo, remapeamento livre de 1–9) fica para a **E17.5**.
- Rebind: `hotbar0–3` entram na tela de teclas; poções migram para Q/R.
- Próximo: **E17.4** — VFX/animação por ramo ao conjurar.

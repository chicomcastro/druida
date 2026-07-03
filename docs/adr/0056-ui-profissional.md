# ADR 0056 — UI profissional: identidade tipográfica, HUD refinado e números de dano

**Status:** Aceito · **Data:** 2026-07-03

## Contexto
A UI era funcional mas modesta (feedback de playtest): painéis chapados,
tipografia de sistema em tudo, toasts sem animação e zero feedback numérico
de dano — o "juice" de ARPG que o combate já merecia.

## Decisão
- **Identidade tipográfica**: fonte de exibição **Cinzel** (OFL, via
  `@fontsource/cinzel` — woff2 empacotado pelo Vite como asset, sem CDN e sem
  custo no bundle JS) para título, nome do bioma, chefes, toasts e vitória;
  corpo continua system-ui (legibilidade).
- **HUD refinado** (`Hud.ts`): painéis com gradiente + borda com glow +
  blur + sombra; barras de vida/Seiva com brilho interno e transição com
  easing; barra de XP animada; painel de objetivo com selo dourado e slide-in;
  **toast com animação de pop** (keyframes, reinício por reflow); diálogo e
  prompt com o mesmo acabamento.
- **Menus** (`Menus.ts`): fundo radial com blur, painéis com entrada animada,
  botões com hover (elevação + glow) e título Cinzel — o menu principal
  parece uma tela de título, não um formulário.
- **Números de dano flutuantes** (`ui/DamageNumbers.ts`): pool de 28 divs
  projetados do mundo para a tela (sobem e somem em ~0.75s) — âmbar para dano
  causado, vermelho para dano sofrido, verde para cura; ticks minúsculos de
  DoT são filtrados para não poluir.

## Consequências
- O jogo comunica "acabado": tipografia própria, movimento em toda a UI e
  feedback numérico no combate. Tudo DOM (ADR 0009) — zero custo no render 3D.
- Fonte adiciona ~30 kB de woff2 como asset estático (fora do orçamento de JS).
- O pool de números é bounded (28) — hordas reutilizam o slot mais antigo.

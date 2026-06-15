# ADR 0009 — HUD como overlay DOM

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
HUD coop (1 painel por jogador), barra de chefe, banners e avisos. Desenhar no
canvas WebGL exigiria um sistema de UI próprio.

## Decisão
HUD em **DOM/CSS sobreposto** ao canvas (`src/ui/Hud.js`), com
`pointer-events:none` para não bloquear o jogo. Painel por jogador com cor de
identidade, barras de vida/Seiva, artefatos com cooldown e estado de queda;
banner de bioma/nível e barra de chefe.

DOM é mais simples, acessível e rápido de iterar que UI in-canvas.

## Consequências
- Menus (pausa, inventário, mapa) seguem o mesmo padrão (backlog M8).
- Eventual custo de performance com muitos nós atualizando; mitigável com
  atualização throttled se necessário.

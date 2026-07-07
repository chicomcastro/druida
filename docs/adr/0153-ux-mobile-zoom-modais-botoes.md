# ADR 0153 — UX mobile: anti-zoom, modais e botões de toque (E23.2–E23.4)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
No teste em iPad o Chico achou três problemas de UX no touch: (1) tocar 2× no
botão de ataque dava **zoom do navegador** e não desfazia; (2) vários **modais
apareciam maiores que a tela** e prendiam o jogador (sem como sair); (3) as ações
eram só por **tecla** (E/U/I/B…), que não existem no tablet.

## Decisão
- **Anti-zoom (E23.2)** — `index.html`: viewport com `maximum-scale=1,
  user-scalable=no`; `touch-action: manipulation` no body; e guardas de gesto
  (`gesturestart/change/end`, double-tap rápido <320ms e pinça de 2 dedos) com
  `preventDefault`. iOS ignora o viewport, daí as guardas de gesto.
- **Modais responsivos + fechar fora (E23.3)** — `Menus` CSS: `.panel` ganha
  `max-height:88vh; overflow-y:auto` e `max-width:min(92vw,720px)` (nunca maior
  que a tela — antes travava); `.inv` com `min-width` responsivo. Tocar/clicar no
  **fundo escurecido fecha** o modal (`_closeOverlay`) — no touch sem teclado,
  nunca ficar preso.
- **Botões de toque (E23.4)** — `TouchControls`: além de pausa/mapa, agora há
  **🎒 mochila** e **🌿 talentos** (não há B/T no tablet).

## Consequências
- No tablet dá pra jogar sem teclado e sem travar: sem zoom acidental, modais que
  cabem e fecham no toque de fora, e botões para as telas principais.
- Verificado por build (index/CSS) e em runtime; `tsc` limpo, 336 testes verdes.

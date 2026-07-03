# ADR 0052 — Nitidez: dimensionamento correto do canvas (fix do blur)

**Status:** Aceito · **Data:** 2026-07-03

## Contexto
O jogo iniciava borrado (pior em tablet): o `Renderer` só chamava
`setSize` no evento `resize` da janela — nunca na criação. O canvas ficava no
buffer default (300×150) esticado por CSS. No desktop, dar zoom disparava o
resize e "consertava"; no tablet o evento nunca vinha. A projeção da câmera
tinha o mesmo problema: só atualizava quando o zoom do coop mudava o frustum.

## Decisão
- `Renderer.resize()` é chamado **na construção** e reaplica o
  `setPixelRatio` (que muda ao arrastar a janela entre telas/zoom).
- `IsoCamera` atualiza a projeção em `resize` (aspect correto ao girar o
  tablet/redimensionar).
- Ambos também escutam `visualViewport.resize` (rotação e zoom em mobile
  disparam por aí, não pelo `resize` clássico).

## Consequências
- Primeiro frame já nasce nítido em qualquer dispositivo; rotação de tablet e
  mudanças de DPI acompanham. Sem custo de runtime (handlers de evento).

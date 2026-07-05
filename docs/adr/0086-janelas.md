# ADR 0086 — Janelas com moldura à altura do olho (M20.2)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
Playtest 7: "as janelas parecem pequenas e mal posicionadas". Eram vidros
de 0.55–0.6u sem moldura, posicionados por fração do pé-direito — com o
pé-direito de 3u (ADR 0082) foram parar acima da linha do olhar.

## Decisão
- Helper **`_window()`**: moldura + vidro aceso + **cruzeta** (a leitura
  clássica de janela 2×2), peitoril a ~1.5u — altura de olho do avatar.
- **Casas**: janela frontal grande (0.95) ao lado da porta + **janela
  lateral na empena** quando não há anexo ocupando a parede; sobrado com
  segunda fileira (0.75) no andar de cima; anexo com janela própria.
- **Cabanas**: 2 janelas de 0.85 com moldura escura, brilho de lareira.
- **Palafitas**: janela de 0.8 com brilho verde-água da vila.
- Todos os vidros continuam pulsando no boost noturno (ADR 0049).

## Consequências
- As fachadas leem como casas habitadas de vila MC — janela é feature, não
  ruído. Fecha o M20 (2/2).

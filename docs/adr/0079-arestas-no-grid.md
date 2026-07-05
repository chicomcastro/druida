# ADR 0079 — Arestas das construções nas linhas do grid do chão (M18.1)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
Playtest 5: "as casas e alguns outros modelos não estão alinhados com as
arestas do chão". O chão de blocos (ADR 0063) tem células centradas em
inteiros ⇒ as linhas do grid ficam nos meios-inteiros. Construções com
dimensões quebradas (4.4×3.6, 4.2, 1.05…) nunca fecham nessas linhas.

## Decisão
- **Regra de paridade** (`alignAxis(v, size)`): dimensão ímpar ⇒ centro em
  inteiro; par ⇒ centro em meio-inteiro. A rotação de 90° troca os eixos
  antes do snap.
- **Pegadas inteiras**: casas **5×4** (fundação idêntica às paredes, sem
  beiral no chão), cabanas de tora **4×3**, tendas com blocos de **1.0**
  exato (base 3×3), decks das palafitas **4×4**, banca do mercador com
  postes fechando pegada **4×3** (face externa na linha), menires 1×1,
  base dos santuários 3×3.
- Telhados e beirais continuam livres (estão no ar; o alinhamento que o
  olho cobra é onde o modelo encontra o chão).

## Consequências
- Toda construção "assenta" no tabuleiro como peça de Minecraft.
- Colliders e fumaça de chaminé seguem o centro alinhado (não o autoral).

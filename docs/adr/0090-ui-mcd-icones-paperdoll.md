# ADR 0090 — UI MCD 2.0: ícones ilustrados, paperdoll anatômico e grade 5×10 (E2)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O roadmap (E2) pede a UI de verdade do MCD: ícones ilustrados (não emoji),
inventário em grade grande, e equipamento seguindo a anatomia do avatar.

## Decisão
- **Ícones pixel-art procedurais** (`itemIcons.ts`): desenha um glifo por
  tipo/família/peça num canvas 12×12 escalado ×4 e devolve um data URL
  cacheado. Máquina/gelo/foice/garras/cajado, elmo/peito/calças/botas,
  artefato (runa) e frasco (poção). Moldura de raridade + sombra 1px para
  volume. Headless-safe: sem `document`, devolve '' (o slot cai no emoji).
- **Paperdoll anatômico** (`.paperdoll`, CSS grid): silhueta central com
  elmo/peito/calças/botas empilhados, arma à esquerda e 3 dons à direita —
  cada peça no seu lugar, não uma fileira genérica.
- **Grade 5×10**: a mochila vira 50 slots fixos (preenche e completa com
  vazios), com scroll além disso; responsivo em telas estreitas.

## Consequências
- Leitura instantânea de item por silhueta/cor, como no MCD, sem assets.
- Cooldown visual nos slots e hotbar 1–9 ficam na fatia E2.3.

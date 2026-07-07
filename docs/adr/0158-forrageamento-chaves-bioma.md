# ADR 0158 — Forrageamento: chaves de bioma corretas + variedade (E25.2)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
A pergunta do jogador ("cada bioma tem os seus ingredientes?") revelou um bug: os
ingredientes forrageáveis usavam chaves de bioma **antigas** que não batiam com
as de `biomeAt`/`BIOMES` — pimenta marcada como `cinza` (o jogo usa
`bosque_cinza`) e baga gelada como `degelo` (o jogo usa `picos`). Como o
`ForageManager` escolhe o ingrediente por `forageOf(biomeAt(x,z))`, **Bosque
Cinza e Picos não geravam nenhum nó de forrageamento** — pimenta e baga só
davam pra comprar, nunca colher no mundo.

## Decisão
- **Alinhar as chaves** (`gameplay/ingredients.ts`): pimenta → `bosque_cinza`,
  baga_gelada → `picos`.
- **Garantir variedade**: todo bioma jogável passa a ter **≥2 forrageáveis**
  (antes Bosque Cinza/Picos teriam 1). Estendi biomas de ingredientes existentes
  (sem criar órfãos): cogumelo também no Bosque Cinza; erva também nos Picos.
  - Clareira: erva, cenoura, cogumelo, mel · Pântano: cogumelo, peixe, junco, mel
  - Bosque Cinza: cogumelo, pimenta · Picos: baga_gelada, erva.
- **Teste** (`forageBiomes.test`): falha se alguma chave de bioma de ingrediente
  não existir em `BIOMES`, ou se algum bioma jogável tiver <2 forrageáveis — a
  deriva de chave não volta a passar despercebida.

## Consequências
- Bosque Cinza e Picos voltam a ter forrageamento; combinado com a caça de fauna
  (ADR 0157), cada bioma tem fontes de comida próprias (flora + animais).
- Nada de novo ingrediente ⇒ nenhuma receita órfã (mantém ADR 0156). 347 verdes.

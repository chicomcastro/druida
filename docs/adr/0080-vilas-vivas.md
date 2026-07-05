# ADR 0080 — Vilas vivas: casas maiores com anexos, ruas e praças (M18.2)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
Playtest 5: "vilas muito pequenas… mais NPCs, mais casas, casas diferentes,
caminhos entre as casas e passagens pela vila (como ruas); a praça onde tem
o mercador, mais postes; estruturas maiores, com variações de cômodos e
anexos" (as tendas em especial pareciam pequenas).

## Decisão
- **Casas maiores e variadas** (`_house`): padrão **6×4** (pé-direito 2.2),
  casinha 4×4, **sobrado** (`tall`: faixa de viga + segunda fileira de
  janelas acesas) e **ala anexa** (`annex`: 4×3 com telhado próprio em
  degraus, aresta ainda no grid). Hub passa de 5 para **9 casas**, com
  telhados em 3 tons.
- **Ruas de laje** (`_streets`): segmentos em L viram lajes de pedra, uma
  por célula do grid, num **único InstancedMesh por vila** com variação de
  tom — praça do mercador (16×5), anel em volta da fogueira, vias para as
  casas e caminho ao portão sul. Lenhadores e Degelo ganham trilhas.
- **Praça com postes**: 4 lanternas nos cantos da praça do hub; nas vilas,
  o mercador ganha 2 lanternas flanqueando a banca.
- **Tendas do Degelo 5-3-1**: pirâmide de 3 camadas (base 5×5) — a tenda
  vira estrutura do porte das casas.
- **Cabanas 6×4** com 5 fiadas de tora, 2 janelas e porta alta.
- **+9 moradores** com falas autorais (3 no hub, 2 por vila) que se
  referenciam entre vilas (a tecelã compra fibra do Vau etc.).
- **Fix**: toldo do Degelo nunca ficava azul (`theme === 'gelo'` vs
  `degelo`); agora cada vila tem cor de toldo própria.

## Consequências
- Vilas leem como povoados com circulação; custo de render controlado
  (ruas = 1 draw call/vila).
- Moradores novos entram no passeio (ADR 0055) automaticamente.

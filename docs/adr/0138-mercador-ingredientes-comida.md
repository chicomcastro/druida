# ADR 0138 — Mercador: ingredientes & comida (E19.4)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Última fatia do E19: o jogador pediu **comprar ingredientes para cozinhar** e ter
**comida à venda** no mercador — além de caçar e forragear.

## Decisão
- **Estoque ampliado** (`economy.rerollShop`): além dos 5 equipamentos + 2 poções,
  o mercador passa a oferecer **3 ingredientes** (ofertas
  `{ ingredient, name, icon, price }`, ~3 ✦, com desconto de reputação) e **1
  comida pronta** (`generateFood`, consumível de buff). O estoque vai de 7 → 11.
- **Compra** (`Menus.refreshShop`/`_buy`): ofertas de ingrediente são desenhadas
  com o emoji do ingrediente + preço; comprar **reabastece a despensa**
  (`addIngredient`) e a oferta **permanece** na loja (recurso renovável). Comida
  e equipamentos seguem indo para a mochila e somem da loja ao comprar.
- **Testes**: os que fixavam o estoque em 7 passam a esperar 11 e a checar que há
  ofertas de ingrediente; o teste de desconto de poção passa a ler os índices
  fixos 5–6 (poções) em vez das duas últimas entradas.

## Consequências
- Fecha o épico **E19 — Culinária & Craft**: obter ingredientes (caçar/forragear/
  **comprar**) → cozinhar na bancada (nível de Craft) → comer o buff; comida
  também pode ser comprada pronta.
- Ingredientes na loja são renováveis (não somem ao comprar), coerente com serem
  contáveis na despensa.
- Verificado por print (mercador com 🪶/🟫 ingredientes + comida) e testes.
- Nicety futura: ícone dedicado da comida na grade da loja (hoje usa o frasco
  genérico do consumível) e venda de ingredientes da despensa pelo jogador.

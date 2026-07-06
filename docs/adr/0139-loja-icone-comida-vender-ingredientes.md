# ADR 0139 — Loja: ícone de comida + venda de ingredientes (E19.5)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Dois ajustes pedidos após o E19: a **comida** aparecia com o frasco genérico de
poção na grade (loja/mochila), e o jogador não conseguia **vender ingredientes**
da despensa.

## Decisão
- **Ícone dedicado de comida** (`Menus._gslot`): se o consumível tem `buff.icon`
  (comida), o slot mostra o emoji da receita (🍖/🍵/🍲…) em vez do frasco. Vale
  para a grade da loja **e** da mochila.
- **Venda de ingredientes** (`economy.sellIngredient` + seção "Vender
  ingredientes" na loja): cada ingrediente da despensa vira um chip clicável que
  vende 1 por `INGREDIENT_SELL` (2 ✦), creditando a essência ao P1 via
  `consumeIngredients`.

## Consequências
- Comida legível em toda grade; despensa vira fonte de renda também.
- Verificado por print (comida com ícone próprio na loja + seção de venda) e
  teste de `sellIngredient` (consome 1, credita 2 ✦, falha sem estoque).
- Próximo: Salão Comunal (cozinha na taverna + prédio novo) e depois a plantação
  (E20).

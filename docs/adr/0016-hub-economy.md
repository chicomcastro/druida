# ADR 0016 — Economia do hub: mercador e baú compartilhado

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
A essência só servia para encantamentos (salvage). Faltava um destino para o
loot excedente e uma forma de gastar essência por poder, além de
armazenamento entre sessões/jogadores no coop.

## Decisão
Dois interativos no hub (`landmarks`):
- **Mercador**: vende um estoque rotativo de 4 itens no nível da região, com
  preço por raridade, pago em **essência do grupo** (`game.spendEssence`).
  Renovar o estoque custa 5 ✦. Itens comprados vão para a mochila do P1.
- **Baú compartilhado** (`game.sharedChest`): depositar/retirar itens entre a
  mochila do P1 e um armazém comum. **Persistido no save.**

UI segue o padrão de overlay DOM dos demais menus (`Menus.openShop/openStash`),
fechável com E/F/Esc. O `interactionSystem` roteia `kind: 'merchant'|'chest'`
para os menus; demais kinds seguem para a história.

Correção relacionada: o auto-equip ao pegar item passou a **remover o item da
mochila** quando equipa, evitando duplicação (equipado + na bolsa).

## Consequências
- Loop econômico fecha: farmar essência → comprar/encantar; baú dá logística
  de loot no coop.
- Preços e estoque são tunáveis; balanceamento via playtest fica no backlog.

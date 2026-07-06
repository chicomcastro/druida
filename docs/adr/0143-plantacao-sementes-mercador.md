# ADR 0143 — Plantação: sementes no mercador (E20.3)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Com os canteiros interativos (E20.2), o jogador só tinha as sementes iniciais e
o que colhia. Faltava uma fonte contínua de sementes para manter a horta girando
— fechando o épico da plantação (E20).

## Decisão
- **Sementes à venda** (`economy.rerollShop`): o mercador passa a ofertar **2
  sementes** por estoque, usando `CROPS[].price/seedName/seedIcon`. A oferta é
  `{ seed, name, icon, price }` (mesmo formato leve das ofertas de ingrediente).
  Estoque do mercador vai de 11 para 13 entradas.
- **Compra** (`Menus.refreshShop`/`_buy`): a semente aparece como slot com emoji
  + preço (como os ingredientes) e, ao comprar, vai para as sementes da despensa
  (`addSeed`) e **reabastece** (não some da loja), permitindo comprar várias.
- **Crescimento em tempo real**: mantido o relógio acumulado por canteiro (E20.1)
  em vez de amarrar à hora do mundo — o `game.dayNight` reinicia por sessão e não
  persiste, então segundos acumulados são a escolha robusta e testável (as
  culturas levam ~1–2 min, contra ~7 min de um dia inteiro).

## Consequências
- O ciclo da plantação fica completo: comprar semente → semear → crescer →
  colher → cozinhar/vender. O épico E20 (plantação) está entregue.
- Verificado por teste (estoque com semente + tamanho 13; `addSeed`), typecheck e
  build. Testes de tamanho de estoque atualizados (11 → 13) em core/interiors/
  quests; preços de poção seguem nos índices 5–6 (reputation).

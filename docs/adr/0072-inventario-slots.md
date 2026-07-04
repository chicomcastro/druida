# ADR 0072 — Inventário e mercador em grade de slots RPG (M15.6)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Playtest 3: "o sistema de inventário e mercadores está difícil de entender
e visualizar". As telas eram listas de texto — sem a leitura instantânea de
slots/ícones/raridade que todo RPG treina no jogador.

## Decisão
Vocabulário clássico de slots (`Menus.ts`):
- **Slot quadrado** (54px) com ícone por tipo (⚔️ arma, 🛡️ armadura,
  🌿 dom/artefato) e **raridade na borda** (cinza/azul/dourado).
- **Equipado como paperdoll**: fila de 5 slots (arma, armadura, 3 dons);
  clicar seleciona e abre o painel de detalhes com os encantos (+1 nos
  pontos de encanto, fluxo preservado).
- **Mochila como grade** 6 colunas: clique equipa, botão direito desmonta
  em essência.
- **Tooltip de comparação**: hover mostra nome/estatísticas/encantos e a
  diferença contra o equipado ("▲ 3 dano vs equipada" em verde / ▼ em
  vermelho) — a decisão de troca vira um relance.
- **Mercador na mesma grade**: slots com etiqueta de preço (✦), tooltip com
  comparação, sem essência = slot apagado; copy com voz.

## Consequências
- As três superfícies de itens (equipado/mochila/loja) falam a mesma língua
  visual; o custo foi ~zero (DOM/CSS, sem assets).
- Baú compartilhado (stash) segue em lista — candidato a herdar a grade
  numa iteração futura.

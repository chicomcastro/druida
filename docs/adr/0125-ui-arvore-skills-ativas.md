# ADR 0125 — UI da árvore de skills ativas (E17.2)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
O E17.1 (ADR 0124) criou o data model das **skills ativas** (`skillTree.ts`),
mas sem interface: não dava para ver nem liberar habilidades. Esta fatia expõe
a árvore ao jogador.

## Decisão
- **Seção "Habilidades ativas"** no painel de Talentos (`ui/Menus.ts`,
  tecla **K**), acima das passivas: cada **ramo** (Natureza, Chama, Gelo,
  Tempestade, Feras, Vida) lista seus nós com **nome, descrição e custo (★)** e
  um botão **+** que chama `unlock()`. Nós já liberados mostram "✓ liberada";
  nós com pré-requisito pendente ficam travados com a dica do que falta.
- **Respec separado** ("Redistribuir habilidades") via `respecActive()`, ao lado
  do respec das passivas.
- Reaproveita as classes de estilo já existentes (`sk-track`/`sk-node`), então
  não há CSS novo; o painel passou a ter duas seções (ativas + passivas).

## Consequências
- O jogador já consegue **ver e liberar** as skills ativas com os pontos de
  skill — fecha o loop com o data model do E17.1.
- Próximas fatias: **hotbar 1–9** (E17.3) para atribuir as habilidades
  liberadas por `unlockedAbilities()`, e **VFX por ramo** (E17.4).
- A UI é puramente aditiva; a árvore passiva segue intacta até a migração
  (E17.5).

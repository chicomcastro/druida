# ADR 0136 — Cozinha: bancada, painel de craft e nível (E19.2)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
A E19.1 trouxe ingredientes, receitas e o nível de Craft como dados. Faltava o
**lugar e a interface** para cozinhar: uma estação no mundo onde o jogador
transforma ingredientes em comida, ganhando XP de Craft.

## Decisão
- **Estação (caldeirão)** (`SettlementManager._buildKitchen`): cada vila ganha um
  **caldeirão fumegante** na praça (ao lado do mercador), com colisor sólido e
  **sem footprint** (prop pequeno, como as lanternas — não entra no validador de
  sobreposição). Malha voxel simples (`_cauldronMesh`): base de pedra, panela de
  ferro, sopa emissiva e vapor. É um `Interactable { kind: 'kitchen' }`.
- **Dispatch** (`interaction.ts`): `kind === 'kitchen'` → `menus.openKitchen()`.
- **Painel de cozinha** (`Menus`): pausa o jogo e lista as receitas com
  ingredientes **have/need** (verde/vermelho), receitas travadas por nível
  (🔒 Craft N), a **despensa** atual e a barra de XP/nível de Craft. Botão 🍳 por
  receita, habilitado só quando `canCook`. Cozinhar chama `cook()`: consome
  ingredientes, dá XP (subindo o nível), gera a comida e a coloca na **mochila**
  (de onde vai para a hotbar). E/Esc fecha.

## Consequências
- O loop de culinária fica jogável: cace/colha ingredientes → cozinhe na bancada
  → coma o buff. Receitas melhores exigem subir o Craft cozinhando.
- Verificado por print (painel com have/need, lock por nível, despensa) e por
  checagem em runtime (cook consome, XP=10, comida na mochila; caldeirão visível
  na Clareira).
- Próximo: **E19.3** forrageamento no mundo (nós de coleta por bioma) e **E19.4**
  mercador compra/vende ingredientes e comida. A taverna (`rest`) segue dando o
  buff de refeição em paralelo (ADR 0094).

# ADR 0124 — Árvore de skills ativas (fundação do E17)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
A skill tree atual (ADR 0093) é só **passiva**: nós dão bônus de % (dano,
velocidade, combo…) por família de arma e por forma. O pedido do E17 é que a
árvore passe a **liberar habilidades ativas** — magias/golpes que o jogador
conjura — com **animação/VFX próprios por ramo**, e uma **hotbar 1–9** estilo
Minecraft para atribuí-las.

Já existe a base para isso: `ABILITIES` (registro data-driven de habilidades
ativas com custo de Seiva, cooldown e `execute`) e `castAbility` (ADR 0005). Os
"dons" em U/I/O hoje vêm de **artefatos** equipados. Falta a **árvore que
libera** essas habilidades e o vínculo com uma hotbar.

## Decisão (E17.1 — fundação, não-quebra-nada)
- **Nova árvore de skills ativas** (`gameplay/skillTree.ts`): ramos temáticos
  (`natureza`, `chama`, `gelo`, `tempestade`, `feras`, `vida`); cada **nó libera
  uma habilidade** de `ABILITIES` (`ability`), com **custo** em pontos e
  **pré-requisito** (`req`) dentro do ramo. Ramo temático = base para "VFX por
  ramo".
- **Lógica de desbloqueio** testável: `canUnlock`/`unlock`/`isUnlocked`,
  `unlockedAbilities` (o que a hotbar poderá atribuir), `respecActive` e
  `ensureActiveSkills` (compat. com save antigo). Usa o mesmo pool
  `progress.skillPoints`.
- **Aditivo**: não remove a árvore passiva nem toca no combate/entrada ainda —
  para não quebrar o jogo atual. `skillTreeIsValid()` garante em teste que todo
  nó aponta para uma habilidade existente.

## Plano do E17 (próximas fatias)
1. **E17.1 (esta)** — data model + desbloqueio + testes. ✅
2. **E17.2** — UI da árvore de skills ativas (aprender/respec na Guardiã),
   consumindo `ACTIVE_SKILL_TREE`.
3. **E17.3** — **hotbar 1–9** persistente: atribuir habilidades desbloqueadas
   (e itens/consumíveis) aos slots; input 1–9 conjura o slot.
4. **E17.4** — **VFX/animação por ramo** (cada elemento com sua assinatura
   visual) ao conjurar.
5. **E17.5** — migração: aposentar/mesclar a árvore passiva na ativa e ligar a
   proficiência ao desbloqueio.

## Consequências
- A progressão ganha um eixo claro de "novas habilidades" (não só números).
- Fundação isolada e testada; cada fatia seguinte é incremental e revisável.
- Pool de pontos compartilhado evita duplicar a economia de progressão.

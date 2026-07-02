# ADR 0045 — Encontros: packs compostos + elites com afixo

**Status:** Aceito · **Data:** 2026-07-02

## Contexto
O spawner mantinha a população pingando inimigos avulsos sorteados da tabela
do bioma. O combate minuto-a-minuto ficava homogêneo: sem composições que
pedem tática (quem focar primeiro?) e sem picos de tensão/recompensa.

## Decisão
Duas camadas data-driven sobre o spawner (números em `BALANCE.encounters`):

- **Packs compostos por bioma** (`biomes.ts: packs`): composições autorais
  com papel tático — "xamã escoltado por Cascas Ocas" (matar o invocador
  primeiro), "ninho de fungos explosivos" (não agrupar), "revoada com âncora".
  O spawner rola `packChance` (22%) e spawna a composição em círculo, com
  folga de +2 sobre o cap de população.
- **Elites com afixo** (`enemies.ts: ELITE_AFFIXES` + `spawn.promoteToElite`):
  inimigo comum promovido com UM afixo que muda o combate, não só números —
  **Veloz** (1.5× velocidade), **Pétreo** (2.2× HP, mais lento), **Volátil**
  (explode ao morrer: dano+knockback em jogadores no raio) e **Sanguessuga**
  (cura-se por 50% do dano que causa). Corpo 1.25× + gema flutuante na cor do
  afixo (material próprio — os materiais voxel são compartilhados, ADR 0043).
  Recompensa maior: 2.5× XP, drop ≥80% e +8 de essência (`essenceBonus`
  consumido no handler de kill). A chance cresce por anel de bioma (quase nula
  na Clareira; o líder de um pack tem chance dobrada).
- Efeitos dependentes de evento (explosão/leech) registrados uma vez em
  `registerEliteEffects(game)` — mesmo padrão do `bindGameEvents` (ADR 0033).

## Consequências
- Encontros pedem leitura e priorização; elites criam picos de risco/recompensa
  que quebram a monotonia do farm.
- Tudo tunável por dados: composições novas por bioma e afixos novos são
  entradas de tabela (afixos de stat puro nem precisam de código).
- O afixo fica em `AI.elite` (não persiste no save — inimigos vivos nunca
  foram persistidos; consistente com o comportamento atual).

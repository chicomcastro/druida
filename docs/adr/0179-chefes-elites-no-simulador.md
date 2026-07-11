# ADR 0179 — Chefes e elites no simulador + fix de alcance (E53)

**Status:** Aceito · **Data:** 2026-07-11

## Contexto
O E52 mostrou que, no endgame, comuns viram triviais (3 comuns → 93% de vida com
gear+dom) — como manda o design MCD (poder vem do gear). Faltava medir **onde
mora o desafio do topo**: **chefes** e **elites**. O simulador só media packs de
comuns, e `bossSystem` (fases/slam/invocação) nem rodava na sim.

## Decisão
1. **Chefes/elites no `simMatrix`:**
   - `boss: true` → `enemy` é uma chave de `BOSSES`; sobe 1 chefe via
     `spawnBossByKey` e roda o `bossSystem` junto dos sistemas da sim (teto de
     ticks maior, 200 s).
   - `eliteAffix` → promove cada inimigo do pack a elite (`promoteToElite`:
     Pétreo/Volátil/Sanguessuga).
2. **Fix de alcance do bot melee** (`SimPlayer`): golpeia dentro de
   `strike + max(0, raioDoAlvo − 0.5)`. Contra um chefe grande (raio 1.6) a
   colisão travava o bot a ~2.1u enquanto o arco alcança 2.0u → ele "aproximava"
   pra sempre sem nunca bater (DPS 0). O `meleeArc` já credita o raio do alvo
   (alcance = range + raio), então bastava o bot **decidir atacar**. Zero efeito
   contra comuns (raio 0.5).

## Consequências
- Medido (endgame unique+Casca, `melee_dodge`, reação 0.6): **rotlord** ~33 s e
  28% de vida; **frostreaver** ~26 s e 43%; **mirelord** vira **stalemate** para
  melee puro (invocador — teste de build, pede AoE/ranged). Elites L10: 78–86%.
  Ou seja, contra chefes o kitado gasta **57–72%** da vida (ou empaca no
  invocador) — o desafio do topo está nos chefes/elites, não nos comuns.
- Travado por `simBalance.test`: o bot causa dano ao chefe grande (fix de
  alcance) e o chefe cobra caro (vida < 70%); elite é um degrau acima do comum e
  o kitado sobrevive.
- 410 testes verdes, `tsc` limpo, `vite build` ok. Só medição + o fix de alcance
  do bot — nenhuma mudança de balance de produção.

## Futuro
Medir chefes por estilo (ranged/caster limpam invocações?); afinar o `mirelord`
se o stalemate for forte demais para melee no jogo real; afixos comportamentais
no bot (E54).

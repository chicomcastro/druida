# ADR 0134 — Comida & buffs temporários (E18.3)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Com a hotbar livre (E18.1/0132, E18.2/0133) faltava um tipo de item acionável que
o jogador citou: **comida**. Até aqui só existiam poções de efeito instantâneo
(cura/Seiva). Comida pede um **sistema de buff temporário** — algo que dure e
dê vantagem tática, para o jogador montar a barra conforme o estilo.

## Decisão
- **Sistema de buffs** (`gameplay/buffs.ts`): `game.buffs` guarda buffs ativos
  `{ id, kind: 'dmg'|'speed'|'taken', mul, remaining, total, name, icon, color }`.
  - `applyBuff` (mesmo `id` **renova**, não empilha), `tickBuffs` (decai/expira),
    `buffMul(kind)` (produto dos muls do tipo, 1 se nenhum), `activeBuffs`.
- **Comida** (`consumables.ts` `FOOD_BASES` + `generateFood`): consumíveis com
  `effect: 'buff'` e um `buff {kind, pct, dur, icon, color}`. Três iniciais:
  🍖 Carne Seca (+dano), 🍵 Chá de Ervas (+velocidade), 🍲 Ensopado (−dano
  recebido). `useConsumable` aplica/renova o buff (`taken` vira `mul = 1 − pct`).
- **Integração pelos muls existentes**: dano em `Game.dmgMul` (`× buffMul('dmg')`),
  velocidade no `playerControl` (`× buffMul('speed')`), dano recebido no
  `applyDamage` (`× buffMul('taken')`, só para o jogador). Tick roda como sistema
  no loop.
- **HUD** (`Hud.ts` `#hud-buffs`): chips acima da hotbar com ícone + segundos
  restantes, borda na cor do buff.
- **Obtenção**: comida entra no `rollLoot` (~6% de chance), então já pinga no
  mundo; como consumível, encaixa na hotbar livre pela mochila (hover + 1–9).

## Consequências
- Fecha o E18: a barra 1–9 agora recebe **skill, forma, poção, equipamento e
  comida** — tudo acionável, montável livremente.
- Buffs são do grupo (`game.buffs`) e transitórios (não persistem no save, por
  design). O `meal` da taverna (ADR 0094) segue como está; poderia migrar para
  este sistema no futuro.
- Verificado por print (3 chips com contagem) + testes de applyBuff/tick/renova/
  buffMul e de comida.
- Futuro possível: vender comida no mercador; ícone específico da comida na
  célula de poção da hotbar (hoje genérico 🧪).

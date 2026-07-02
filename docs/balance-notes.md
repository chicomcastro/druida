# 📐 Notas de balanceamento (estado atual + o que medir)

Companheiro do ADR 0051. Os números vivem em `src/data/balance.ts` (ADR 0012);
este documento registra **a intenção por trás deles** e **o que medir em
playtest** (a telemetria local exportável existe para isso).

## Intenções atuais (chutes educados, nunca medidos com jogadores)

| Sistema | Número | Intenção |
|---|---|---|
| TTK inimigo comum | ~2–4 golpes no anel do nível | Combate ágil estilo MC Dungeons |
| TTD do jogador | ≥ 4 acertos no anel do nível | Morte por acúmulo de erro, não por burst |
| Elites (ADR 0045) | 2–8% de chance por anel; recompensa 2.5× XP | Pico de tensão a cada ~2 min de farm |
| Packs (ADR 0045) | 22% dos spawns | 1 encontro "composto" por minuto de exploração |
| Noite (ADR 0049) | +25% de cap de spawn | Noite sensivelmente mais perigosa sem virar paredão |
| Seiva | regen 15/s base; formas drenam | Ficar 100% em forma deve ser insustentável |
| Economia | inimigo ~1–4 ✦; item comum 12 ✦ | ~5 min de farm para 1 compra comum |
| Missões de vila (ADR 0047) | 40–60 ✦ + artefato Único | Recompensa clara acima do farm equivalente |
| Dons (ADR 0050) | ±10–30% em um eixo | Percebível, não dominante |

## O que medir no playtest (com os contadores exportados)

1. **Curva de morte**: `downs`/`wipes` por `playSeconds` — alvo: 1ª morte
   entre 5–10 min (Pântano), não na Clareira.
2. **Ritmo de campanha**: `maxStoryStep` × `playSeconds` — alvo: vitória em
   40–70 min na primeira run.
3. **Economia**: `essenceEarned` / compras — se sobrar essência no fim,
   preços do mercador estão baixos.
4. **Elites**: `eliteKills`/`kills` deve ficar perto de 4–6%; muito acima =
   chance alta demais; `damageTaken` disparando após elites = afixos fortes.
5. **Dano dado vs. tomado**: razão `damageDealt`/`damageTaken` por sessão —
   quedas bruscas indicam paredes de dificuldade entre anéis.
6. **Engajamento lateral**: `questsCompleted`/`campsPurified` baixos com
   `playSeconds` alto = conteúdo lateral invisível ou pouco recompensador.

## Alavancas rápidas (onde mexer primeiro)

- Dificuldade geral: `BALANCE.enemy.hpPerLevel` / `damagePerLevel`.
- Pressão de spawn: `BALANCE.spawn.capBase` e `dayNight.nightSpawnBonus`.
- Tensão de elite: `BALANCE.encounters.eliteChancePerRing`.
- Economia: preços em `economy.rerollShop` + `BALANCE.loot.essenceMin/Max`.

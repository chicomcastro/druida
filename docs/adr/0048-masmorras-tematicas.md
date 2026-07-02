# ADR 0048 — Masmorras temáticas por bioma

**Status:** Aceito · **Data:** 2026-07-02

## Contexto
A masmorra (ADR 0022) era uma arena genérica: mesmas cores, mesmo pool global
de inimigos e ondas idênticas nas duas entradas. Só o Pântano tinha um
mini-chefe (o da campanha). Pouca identidade e zero surpresa na revisita.

## Decisão
Tema data-driven pelo **bioma da entrada** (`data/dungeons.ts`), aplicado
pelo `DungeonManager` ao entrar:

- **Identidade**: nome ("Toca Raizal", "Fosso do Lodo", "Forno Afundado",
  "Caverna do Degelo", "Víscera"), paleta da arena (materiais próprios de
  chão/muralha recoloridos por entrada) e clima/névoa próprios.
- **Pool do bioma**: as ondas sorteiam da tabela de inimigos do próprio bioma
  (ADR 0007) em vez de um pool global.
- **Perigo ambiental telegrafado**: a cada ~5–6s um círculo na cor do tema
  anuncia o golpe; após 1,1s quem ficou dentro leva dano leve + o status do
  tema — lodo enraíza, brasas queimam, gelo congela, a Víscera pulsa. A Toca
  Raizal (Clareira) não tem perigo: é a masmorra introdutória.
- **Mini-chefe temático na onda final**: a 3ª onda vira o mini-chefe do tema
  (Raiz-Faminta, Boca do Brejo, Carvoeiro Morto, Uivo Branco, Eco do
  Apodrecedor) com escolta reduzida — `spawnMiniBoss` ganhou `overrides`
  (nome/mesh/HP), preservando a Árvore-Carniça da campanha como default.

## Consequências
- As duas masmorras do mundo deixam de ser intercambiáveis; o perigo
  ambiental adiciona leitura de arena ao combate (reposicionar durante as
  ondas), no mesmo padrão de telegraph do chefe (ADR 0037).
- Tema novo = entrada em `DUNGEON_THEMES`; nenhuma mudança de fluxo/save
  (recompensas e `cleared` intactos).
- O perigo usa `vfxRing` + `schedule` existentes — sem sistema novo de área.

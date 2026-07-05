# ADR 0101 — Mundo vivo: chefes de bioma (E8.4)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O E8 pede **+2 bosses**. O jogo tinha só o chefe de campanha (O Apodrecedor) e
os mini-chefes temáticos das masmorras (ADR 0048). Faltavam chefes plenos —
com fases, golpe em área e invocações — como clímax das masmorras de bioma.

## Decisão
- **2 novos chefes** (`data/enemies.ts`, `BOSSES`), `boss: true` — dirigidos
  pelo `bossSystem` existente (fases por % de vida, slam telegrafado,
  invocações a partir da Fase 2):
  - **Senhor do Lodo** (Pântano) — behavior `summoner`, convoca **Atoladiços**
    (ADR 0100).
  - **Ceifador Gélido** (Picos) — melee que **congela** no golpe (`onHit`).
- **`spawnBossByKey`** (spawn.ts + método no `Game`): cria qualquer chefe do
  catálogo como chefe pleno (sem `miniBoss`), com anúncio de despertar.
- **Integração nas masmorras**: o tipo `DungeonTheme.miniboss` ganhou um campo
  opcional `boss`. Quando presente, a onda final do `DungeonManager` invoca o
  chefe pleno via `spawnBossByKey` (fases + invocações); sem ele, mantém o
  mini-chefe temático de antes. Pântano e Picos passam a fechar com chefe
  pleno; os demais temas seguem com mini-chefe.

## Consequências
- As masmorras de bioma médio/avançado ganham um clímax real (fases, área,
  invocações), fechando a parte de bosses do E8 — o épico "mundo vivo" está
  completo (fauna E8.1, hazards E8.2, inimigos E8.3, bosses E8.4). Segue para
  o Gate E (playtest).
- `spawnBossByKey` + o campo `boss` no tema tornam trivial promover qualquer
  masmorra a chefe pleno (só dados) — base para variações de chefe no E9/futuro.
- Reuso de malhas (husk/wolf) mantém o escopo; modelos próprios de chefe podem
  vir depois.

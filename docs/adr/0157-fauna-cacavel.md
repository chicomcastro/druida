# ADR 0157 — Fauna caçável: animais soltam ingredientes (E25.1)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
No playtest o jogador perguntou se os animais eram matáveis para conseguir carne.
Não eram: por ADR 0098 a fauna era **inofensiva e sem combate** (só passeava e
fugia) e a **carne vinha só dos monstros corrompidos**. Havia uma desconexão —
o cervo/lebre/cabra andando pelo mundo eram puro cenário, enquanto a "carne
crua" caía de fungos e javalis.

## Decisão
- **Fauna caçável** (`data/fauna.ts`): cada espécie ganha `hp` e `drops`
  (ingredientes temáticos). Bicho sem `drops` segue só de enfeite (libélula).
  - cervo/cabra → carne + sebo · lebre/sapo → carne · corvo/coruja → ovo.
  - Toda vila-bioma jogável tem ≥1 espécie caçável (fonte de comida por bioma).
- **Integração de combate** (`world/FaunaManager.ts`): ao nascer, o bicho
  caçável recebe **Health + Faction NEUTRA + Collider leve (não bloqueia) +
  Tint**. Como o `meleeArc` acerta times opostos, o golpe do jogador o atinge;
  como a IA só conduz entidades com `C.AI`, ele **não persegue** — continua
  fugindo. Ao morrer (evento `kill`), o FaunaManager solta os ingredientes da
  espécie (loot orbs) e para de conduzi-lo; o corpo tomba e some pelo caminho
  normal (`killEntity` + `_cleanupDestroyed`).
- **Sem loot de monstro** (`core/gameEvents.ts`): o handler de `kill` pula
  XP/essência/drop genérico para fauna (`game.fauna.isFauna(id)`), então caçar é
  coleta de comida, não farm de monstro.

## Consequências
- Carne/sebo/ovo agora vêm **dos animais** (caça, por bioma) além dos inimigos,
  como o jogador esperava. Fauna deixa de ser só enfeite.
- Verificado por teste de dados (`forageBiomes.test`) e **de ponta a ponta**
  (`faunaHunt.test`: golpe → morte → drop de carne+sebo; libélula não caçável).
  347 testes verdes.
- Balance (dano/hp/densidade) fica para o playtest (Gate E/F). Colateral aceito:
  um golpe de inimigo em área pode acertar um bicho neutro — "mundo vivo".

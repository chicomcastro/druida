# ADR 0093 — Especialização & árvore de talentos (E4)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O roadmap (E4) pede especialização de classe por **arma**
(machado/foice/garras/cajado) e por **forma animal** (lobo/urso/corvo/sapo),
ligada a uma **árvore de skills**. O usuário quer que "quanto mais usa, mais
especializa" e que a construção do personagem mude a dinâmica de combate. O
poder do jogo vem do equipamento (fiel ao MCD, ver ADR 0007/§9), então a
árvore precisa complementar sem virar um segundo grind de stats brutos.

## Decisão
- **`skills.ts`** (lógica pura, testável): `SKILL_TREES` — uma trilha por
  família de arma e por forma, 2–3 nós cada, com `effect`
  (`dmg`/`atkSpeed`/`combo`/`range`/`formDur`/`dr`), `per` (valor/nível),
  `max` e `req` (pré-requisito encadeado). Tudo em data para tunar no Gate.
- **Duas fontes de progressão**, ambas em `game.progress` (party, persiste no
  save via spread — ADR de save):
  - **Proficiência por uso** (`gainProficiency`): cada golpe conta para a
    trilha da arma equipada ou da forma ativa. Registra a diegese do "usar
    para dominar" e alimenta o painel; base para gates futuros de nós.
  - **Pontos de talento** (`skillPoints`): **1 por nível** (em
    `progression.grantXp`), gastos via `learn` respeitando pontos/teto/req.
- **`skillBonus(game, id, effect)`**: soma só as trilhas **relevantes ao
  estado atual** — a arma que está na mão e a forma ativa. Bônus de machado
  só vale empunhando machado; de lobo, só na forma lobo. Isso força escolha e
  premia a especialização coerente em vez de acumular tudo.
- **Fiação nos sistemas**: `atkSpeed` encurta a janela de ataque e `combo`
  alarga o sweet spot (ADR 0092) em `playerControl`; `dmg` entra no `dmgMul`
  do `Game`. `range`/`formDur`/`dr` ficam expostos para os sistemas de
  ability/forma/dano consumirem.
- **Respec grátis** (`respec`): devolve todos os pontos e zera a árvore — a
  intenção é liberar na Guardiã (hub), mas o custo zero já vale para o
  playtest de build.
- **UI (Menus)**: painel de Talentos (tecla **K** ou botão na pausa) com
  trilhas em grade, ícone por efeito, pips de nível, botão +1 gated por
  `canLearn`, contagem de proficiência e destaque na trilha ativa
  (arma/forma). Botão de redistribuir.

## Consequências
- Personagem passa a ter build: a mesma árvore recompensa quem se compromete
  com uma arma/forma, sem inchar stats globais. Complementa o combo (E3) —
  ritmo + foco de arma se reforçam.
- `skillBonus` ser sensível ao estado abre espaço para trocas táticas
  (trocar de forma/arma muda os bônus ativos), coerente com o loop druida.
- Gate C (playtest) calibra `per`/`max`/`req` e decide se a proficiência
  passa a **destravar** nós (hoje só é exibida). Respec pode ganhar custo.

# ADR 0170 — Ermos: cenários únicos, eremitas e caçadas exploratórias (E37)

**Status:** Aceito · **Data:** 2026-07-11

## Contexto
O mapa fora das vilas era só bioma + acampamentos corrompidos (POIs de combate).
Faltava **conteúdo explorativo**: cenários únicos que preenchem o mundo, NPCs
isolados vivendo por conta própria e missões que premiam explorar (não só falar
com aldeões). O pedido: torres, cemitérios, estátuas, placas… + eremitas com
rotina + side quests (matar X, coletar, usar poder) com recompensas únicas.

## Decisão
1. **`LandmarkManager` (`world/LandmarkManager.ts`)** — gera, de forma
   determinística (semente do mundo), **spots isolados** nos ermos, um por
   anel-bioma, longe das vilas e dos acampamentos e evitando o eixo dos
   santuários.
2. **Cenários únicos** (voxel): Torre Rachada, Cemitério Esquecido (com lápides,
   mortalha e cadáver), Estátua Caída, Pedras Eretas e Marco da Romaria (arco +
   lanterna). Cada um tem uma **placa** com inscrição, revelada ao chegar perto.
3. **Eremitas** — alguns spots têm um NPC vivendo ali, com uma **rotininha** de
   perambular perto de casa (para pra conversar quando você chega). Dados de
   sabor em `data/landmarks.ts`.
4. **Caçadas (bounties exploratórias)** — o eremita pede para **expurgar N
   criaturas do ermo** (o inimigo local, derivado do bioma do spot). O progresso
   é rastreado pelo evento `kill` casando a espécie (marquei a espécie no
   `Renderable.kind` em `spawnEnemyByKey`). Ao completar, largo a **recompensa
   ÚNICA**: um item forçado à raridade `unique` com **nome próprio** (Lâmina do
   Vígia, Mortalha da Coveira, Selo do Caído) + essência.
5. **Persistência** — caçadas concluídas vão pro save (`landmarks.done`).

## Consequências
- Mundo mais vivo e explorativo: lugares para achar, ler, e eremitas para ajudar
  em troca de itens que não saem de loja. Integra com o combate existente (mata
  o bicho local) e com o loot (item único nomeado).
- Travado por testes (`landmarks.test`: geração determinística por anel + 5
  cenários; eremita interativo; caçada ativa ao falar, conta só o alvo, completa
  com recompensa nomeada; conclusão persiste). 374 testes verdes, `tsc` limpo,
  `vite build` ok. Runtime: os 5 cenários renderizam certo, eremita ao lado,
  caçada ativa, sem erros. Wiki ilustrada (`img/ermos.jpg`).

## Futuro (próximas fatias do E37)
Outros tipos de caçada (coletar ingrediente, usar um poder N vezes); recompensa
em **skill** com atributo único; mais tipos de cenário e mais spots por anel;
eremitas com diálogo ramificado / codex.

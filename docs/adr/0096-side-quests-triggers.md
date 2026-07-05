# ADR 0096 — Side quests & eventos de mid-game (E6)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O E6 pede side quests diversas por cidade, desbloqueadas por **triggers de
mid-game** (visitou N vilas, interação entre NPCs, coleta, exploração,
despertar de habilidade) e com arcos **inter-vilas**. As missões do ancião
(ADR 0047) já existem, mas são uma por vila, focadas em combate e ativadas
manualmente — não cobrem gatilhos condicionais nem cadeias narrativas.

## Decisão
- **`SideQuestManager`** (novo, testável): estado por quest (`locked`/`active`/
  `done` + passo). Reage a eventos **já existentes** — `settlementEntered`
  (conta vilas visitadas), `formUnlocked` (formas despertadas), `loreFound`
  (segredos do codex) — e a `talkedNpc`, emitido pela interação com NPCs de
  interior (ADR 0094/0095). Sem lógica de mundo/combate própria.
- **Data-driven** (`data/sidequests.ts`): cada quest tem `unlock` (condições de
  snapshot: `visited`/`lore`/`form`) e `steps` sequenciais que **avançam ao
  conversar** com um NPC específico (`talk`). Recompensa em essência e/ou
  fragmento de codex.
- **Desbloqueio**: quando as condições de `unlock` passam a valer, a quest é
  oferecida (diálogo de intro + objetivo). **Avanço**: um `talkedNpc` que bate
  com o passo atual avança um passo; o último completa (outro + recompensa +
  `questCompleted`).
- **Arcos entregues**:
  - **O Nó de Duas Cordas** (piloto da rixa, ADR 0095): desbloqueia ao
    descobrir o segredo (l14) e encadeia forja → campos → liderança — quest
    **inter-NPC** que resolve a rixa e revela a pista final (l15).
  - **Pele Emprestada**: desperta uma forma → mostrar ao cronista.
  - **Pés de Estrada** (**inter-vilas**): visitar 2+ assentamentos → descansar
    na taverna.
- **Persistência**: `serialize()/restore()` (estados + contadores de gatilho),
  ligados ao `save.ts` e ao tipo `SaveV1.sideQuests`.

## Consequências
- O mundo passa a reagir ao que o jogador faz: explorar, aprender segredos e
  mudar de forma abrem conteúdo — o núcleo do mid-game pedido no E6.
- O motor é genérico: novas quests são só dados. O E7 replica arcos nas outras
  vilas; o E9 usa `questCompleted`/telemetria para tunar ritmo. Novos tipos de
  gatilho (item carregado, hora do dia) entram como campos em `UnlockDef` sem
  tocar a máquina.
- Falta de UI de "diário" dedicada é intencional (os objetivos aparecem no HUD
  via eventos `objective`); um painel de quests pode vir no polimento do Gate D.

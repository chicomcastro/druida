# ADR 0050 — Dons dos Santuários (escolhas de build)

**Status:** Aceito · **Data:** 2026-07-02

## Contexto
A progressão vinha só de equipamento + números (ADR 0006): nenhuma decisão
permanente moldava o jeito de jogar. Os santuários (o momento mais cerimonial
da campanha) entregavam a Forma e nada mais.

## Decisão
`gameplay/boons.ts` — ao despertar cada Forma Ancestral, um overlay oferece
**um de dois dons permanentes** (mutuamente exclusivos, sem respec):

| Santuário | Dom A | Dom B |
|---|---|---|
| Urso | 🛡️ Casca de Carvalho (+20% vida máx) | 🌵 Pelagem de Espinhos (reflete 15% do dano recebido) |
| Corvo | 💨 Asas do Vento (+10% velocidade) | 👁️ Presságio (i-frames da esquiva +50%) |
| Sapo | 💧 Orvalho Eterno (+30% regen de Seiva) | 🩹 Pele Úmida (cura 10 ao trocar de forma) |

Arquitetura por tipo de efeito:
- **Passivos de stat** (vida/regen) entram no `applyEquipment` (ADR 0006) —
  recalculados no equip, na escolha e no load.
- **Multiplicadores** (velocidade/i-frames) são funções puras
  (`speedBoonMul`/`iframeBoonMul`) lidas no `playerControlSystem`.
- **Reativos** (refletir, curar no swap) são hooks de evento
  (`registerBoonHooks`), com marcador `reflected` no dano para impedir eco.
- **Escolha** via overlay do `Menus` no `formUnlocked`; estado em
  `game.boons` (form → boonId), persistido em `SaveV1.boons` (opcional,
  retrocompatível; restaurado ANTES do re-equip dos jogadores para os
  passivos valerem no load). `boonChosen` é gatilho de autosave.
- Dons são **do grupo** (escolha única, vale para todos os jogadores no
  coop) — consistente com essência/progresso compartilhados.

## Consequências
- Cada campanha ganha identidade de build (8 combinações) e o despertar de
  santuário vira um momento de decisão, não só um unlock.
- Sem respec por ora (decisão explícita: escolhas pesam); um "altar de
  reescolha" pago em essência fica como evolução natural.
- Dom novo de stat puro = entrada na tabela + (se preciso) um multiplicador;
  o overlay e a persistência já generalizam.

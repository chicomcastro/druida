# ADR 0099 — Mundo vivo: perigos ambientais por bioma (E8.2)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O E8 pede **hazards jogáveis por bioma** (lodo que prende, gelo que escorrega,
cinza que cega). As masmorras já têm perigo ambiental (ADR 0048), mas o mundo
aberto não — andar entre regiões era mecanicamente seguro. Hazards recompensam
leitura e movimentação e dão identidade de risco a cada bioma.

## Decisão
- **`HazardManager`** (novo, testável): no bioma atual (fora das vilas e das
  masmorras), dispara periodicamente uma **zona telegrafada** perto do grupo;
  após o aviso, quem ficar na área leva dano + status. Os golpes pendentes são
  resolvidos no próprio `update` (determinístico, sem depender do agendador do
  loop — o que também o torna trivial de testar).
- **Data-driven** (`data/hazards.ts`): `OVERWORLD_HAZARDS` por bioma com
  intervalo, telegrafo, raio, dano, status e cor:
  - **Pântano** → lodo que **enraíza** (root).
  - **Bosque Cinza** → nuvem de cinza que **atordoa** (stun curto).
  - **Picos** → gelo que **congela** (freeze).
  - **Coração** → chão pulsante que **queima** (burn), mais forte e frequente.
  - **Clareira** → `null`: região inicial permanece segura.
- **Refúgios**: suspenso em `game.inDungeon` e dentro de qualquer vila
  (`settlements.isSafe`) — as cidades continuam sendo abrigo.
- **Visual**: reusa o evento `vfxRing` (anel de aviso + anel de impacto) já
  renderizado pelo VfxManager; nenhuma malha nova.

## Consequências
- Cada bioma ganha uma ameaça ambiental própria — atravessar o mundo passa a
  exigir atenção, e as vilas viram refúgio com propósito mecânico.
- Motor genérico e barato (sem entidades/colisores): novos perigos são só
  dados; intervalos/dano/raio ficam para o tuning do Gate E.
- Fecha a parte de "hazards" do E8; faltam os **novos inimigos e bosses**
  (E8.3) para encerrar o épico.

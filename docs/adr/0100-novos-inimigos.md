# ADR 0100 — Mundo vivo: novos inimigos (E8.3)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O E8 pede **+3 inimigos com comportamentos novos**. O catálogo tinha melee,
ranged, exploder e summoner; faltava variedade que mudasse o combate por
bioma além de números.

## Decisão
- **Hook `onHit` na IA melee** (comportamento novo, mínimo e genérico): ao
  conectar o golpe telegrafado, o inimigo aplica um status no alvo
  (`applyStatus`). Propagado do catálogo para a `AI` (factories) e lido no
  `aiSystem`. Também passei a propagar `telegraph` por inimigo (antes só o
  default global valia).
- **3 novos inimigos** (`data/enemies.ts`), cada um com identidade de bioma via
  `onHit`:
  - **Atoladiço** (Pântano) — brutamontes tanque que **enven ena** (poison).
  - **Espectro de Cinza** (Bosque Cinza) — rápido e frágil que **atordoa**
    (stun), ecoando a cinza que cega (ADR 0099).
  - **Presa-Gélida** (Picos) — matilha veloz que **congela** (freeze).
- **Integração de spawn**: adicionados às tabelas de inimigos e a packs
  autorais dos respectivos biomas (`data/biomes.ts`) — aparecem no mundo aberto
  imediatamente pelo spawner e pelos encontros compostos (ADR 0045).
- Reuso de malhas existentes (husk/shaman/rotboar) para manter o escopo; modelos
  próprios podem vir depois.

## Consequências
- Cada bioma médio/avançado ganha uma ameaça com efeito de status distinto —
  combate mais legível e perigoso conforme se avança, sinergizando com os
  hazards (ADR 0099).
- O hook `onHit` é reutilizável: novos inimigos (ou elites) com status no golpe
  são só dados.
- Fecha a parte de "novos inimigos" do E8; faltam os **bosses** (E8.4) para
  encerrar o épico e chegar ao Gate E.

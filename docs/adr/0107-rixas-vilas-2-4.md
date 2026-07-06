# ADR 0107 — Rixa das famílias nas vilas 2–4

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
A camada social de famílias rivais (ADR 0095) existia só no Círculo do Carvalho
(Fenwick × Aldren). As vilas 2–4 tinham interiores, mas com temas genéricos
(`market`/`tavern`/`leader`) e nenhum arco social próprio — a wiki (ADR 0105)
registrou isso como lacuna. Consultado, o usuário escolheu **expandir a rixa
para as vilas 2–4**, cada uma com seu par de famílias e seu arco.

## Decisão
Replicar a assinatura da Clareira em cada vila, 100% data-driven (sem cirurgia
de layout 3D — reaproveita as portas/interiores já existentes):

- **6 novas famílias** (`data/families.ts`), duas por vila, temáticas ao ofício/
  bioma, com fofoca que cita a rival. Novo campo `settlement` + helper
  `familiesOf(id)`:
  - **Vau das Palafitas** — *Vison* (arpões/canais) × *Caniço* (filtros de seiva): a água escura do brejo.
  - **Cinzafolha** — *Cerne* (serraria) × *Brasa* (fornos de carvão): cortar × queimar.
  - **Abrigo do Degelo** — *Cairn* (trilha/marcos) × *Velo* (rebanho): a encosta.
- **6 lojas de interior temáticas** (`data/interiors.ts`), uma por família
  (viés arma/armadura como Fenwick/Aldren), com falas de fofoca e um fragmento
  do codex por porta. Ligadas nos arrays de porta de cada vila
  (`SettlementManager`: `PAL_THEMES`/`LEN_THEMES`/`DEG_THEMES`). Cinzafolha (3
  portas) troca mercado/liderança-genérica pelas duas famílias + taverna; o
  mercador regional dela continua ao ar livre.
- **6 fragmentos de lore** (`data/lore.ts`, l16–l21): por vila, uma "rixa"
  (fofoca) e um "segredo" (a Corrupção é a causa real) — o segredo destrava a
  quest.
- **3 side quests de reconciliação** (`data/sidequests.ts`: `feud_vau`,
  `feud_cinza`, `feud_degelo`), no mesmo motor de triggers do E6: desbloqueiam
  ao descobrir o segredo e completam levando a verdade às duas famílias.

## Consequências
- As 4 vilas passam a ter identidade social própria e um arco opcional cada,
  reforçando o pilar "vila 1 como template replicado com identidade".
- Some a lacuna "rixa só na Clareira"; fica pendente apenas **reputação por
  vila** (ADR 0108, a seguir) — recompensa mecânica por resolver as rixas.
- Como tudo é data, tunar/estender é barato; testes cobrem pares por vila,
  vieses das lojas e a cadeia de cada feud.

# ADR 0148 — Famílias, gênero e lares (E22.2)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
Os moradores eram avulsos e sem gênero, e cada um perambulava em torno do próprio
ponto de spawn. O Chico pediu o conceito de **família**: cada morador com uma
casa, algumas com casal (um de cada gênero) e uma ou outra com um filho — e que a
rotina (E22.1) gire em torno desse lar.

## Decisão
- **Modelo de domicílios** (`src/gameplay/households.ts`, puro/testável):
  `assignHouseholds(members)` agrupa vizinhos (por ângulo) em **famílias de 1–3**:
  casal por padrão (2 adultos de gêneros opostos), ~1/4 com um filho, e um
  solteiro no que sobra. Cada família compartilha o **lar** (âncora de moradia).
- **Gênero no visual** (`voxelModels.makeVillagerSpec`): flag `female` (saia +
  cabelo mais longo, sem barba) e `child` (silhueta menor via `baseScale`).
- **SettlementManager** (`_populate`): junta os defs de moradores (nomeados +
  ambientes + trabalhadores), roda `assignHouseholds`, e constrói cada um com
  **gênero, papel e o lar da família** — o registro de rotina passa a usar o lar
  compartilhado como âncora de "casa" (a família dorme/volta junta, ver E22.1).
  `_ambientVillagers`/`_workers` viraram `_ambientDefs`/`_workerDefs` (retornam
  defs em vez de construir), para o agrupamento acontecer antes da construção.

## Consequências
- A vila deixa de ser um amontoado de andarilhos: vira lares com casais, alguns
  filhos, gêneros visíveis — e a rotina do dia gira em torno da casa da família.
- Verificado por teste (todo morador num lar de 1–3; casal com gêneros opostos;
  criança só em lar de 3; determinístico; vila vazia/solteiro) e em runtime num
  Game real (35 moradores: 17f/18m, 17 lares → 14 casais, 2 com filho, 1 solteiro).
- Próximo: **E22.3** casas residenciais físicas por família (hoje o lar é a âncora
  de moradia; falta o prédio dedicado em cada vila) e aldeões conversando entre si.

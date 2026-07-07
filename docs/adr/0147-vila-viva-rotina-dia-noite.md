# ADR 0147 — Vila viva: rotina de dia/noite + reunião no salão (E22.1)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
Os moradores só perambulavam ao acaso em torno de um ponto fixo. O Chico pediu
uma **vila viva**: cada aldeão com uma rotina que gira em torno da casa e do
salão comunal — sai de manhã ou à tarde, almoça em casa ou no salão, todos se
reúnem ao entardecer para a comunhão e voltam pra casa à noite; um ou outro é
notívago. E que **não seja igual todo dia**.

## Decisão
- **Motor de rotina** (`src/gameplay/routine.ts`, funções puras/testáveis):
  `dayPhase(time)` fatia o dia (manhã/almoço/tarde/entardecer/noite) a partir de
  `game.dayNight.time`; `routineGoal(archetype, time, {seed, day})` devolve o
  objetivo atual — `home | work | hall | roam | sleep`. Arquétipos:
  `worker`, `homebody`, `wanderer`, `social`, `nightowl`.
  - **Entardecer** → todos ao **salão** (`hall`), menos notívagos.
  - **Noite** → dormem em casa; notívago perambula.
  - **Almoço** → parte no salão, parte em casa (varia por dia).
  - **Manhã/tarde** → cada arquétipo cuida do seu; o `social` sai de manhã OU à
    tarde conforme o dia (**variação diária** via hash de semente+dia) — a vila
    nunca repete igual.
- **SettlementManager**: cada morador ganha `archetype` (sorteado por hash; posto
  de trabalho = `worker`), âncoras `home`/`work`/`center` e o **ponto de reunião**
  (`gather`, o salão comunal de cada vila — `GATHER_OFFSET`). O antigo `_wander`
  virou uma rotina guiada pela hora: escolhe o objetivo, mira a âncora certa com
  a dispersão de `goalSpread`, e um contador de dia (detectado na virada da hora)
  alimenta a variação.

## Consequências
- A vila ganha ritmo diário legível: manhã movimentada, almoço dividido, festa
  no salão ao entardecer, noite calma com um notívago solto.
- Verificado por teste (fases; objetivos por arquétipo; variação diária a nível de
  população; sem sair em dois turnos no mesmo dia) e em runtime num Game real
  (35 moradores: manhã 15 fora/12 casa/3 posto/5 dormindo → entardecer 30 no
  salão → noite 30 dormindo/5 perambulando).
- Próximo: **E22.2** casas residenciais + famílias (domicílios com gênero, casal/
  filho) e atribuição casa↔morador; **E22.3** aldeões conversando entre si.

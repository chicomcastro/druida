# ADR 0049 — Ciclo dia/noite + clima por bioma

**Status:** Aceito · **Data:** 2026-07-02

## Contexto
O mundo tinha hora fixa: luz eternamente igual, lanternas que não importavam
e biomas sem variação temporal. As camadas de atmosfera (ADR 0042) e vilas
(ADR 0041) pediam um mundo que *muda* enquanto se joga.

## Decisão
`world/DayNightManager.ts` — simulação testável, view por multiplicadores:

- **Ciclo de ~7 min** (`BALANCE.dayNight`): `nightAmount()` 0→1 com
  crepúsculo suave nos dois lados. O Renderer captura a base do bioma no
  `setBiomeMood` e `applyDayNight(night)` modula por frame (fundo/névoa
  escurecem, sol −72%, hemisfério −45%) — o dia/noite compõe com o clima do
  bioma e com a purificação (ADR 0044) em vez de brigar com eles.
- **A noite importa**: lanternas/chamas das vilas brilham +70% (é a luz delas
  que desenha a vila no escuro), vagalumes/fagulhas ficam mais visíveis, o
  cap de spawn sobe +25% (a floresta fica mais perigosa) e o HUD mostra
  🌙/☀️. Viradas anunciadas por toast (`nightFall`/`dayBreak`).
- **Clima por bioma** (máquina de estados com rng seedável): chuva fina na
  Clareira, chuva do brejo, chuva de cinzas no Bosque, nevasca nos Picos,
  miasma no Coração — cada um troca as partículas ambientais (override sobre
  o ADR 0042) e aproxima a névoa (~20%). Calmarias de 45–100s, eventos de
  22–45s.
- **Masmorras não têm céu**: o ciclo/clima pausa lá dentro e o mood do tema
  (ADR 0048) fica intocado.
- **Relógio não persiste**: cada sessão nasce de manhã — retomar o jogo de
  dia é deliberadamente mais acolhedor (e evita carregar um save no breu).

## Consequências
- O mesmo trecho de mundo rende cenas diferentes (entardecer na vila com
  lanternas acesas, nevasca nos Picos à noite) — variedade sem conteúdo novo.
- Custo de runtime ~zero: multiplicadores sobre luzes/cores existentes e o
  mesmo `THREE.Points` de partículas.
- Balanceamento noturno (+25% spawn) é um número em `BALANCE`; o clima é
  puramente visual por ora — efeitos de gameplay por clima ficam como
  evolução (ex.: chuva apaga `burn`).

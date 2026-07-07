# ADR 0150 — Casa pra todo mundo: famílias nas vilas 2–4 (E22.4)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
A Clareira já tinha casas de família (E22.3). Faltava dar casa aos moradores das
outras três vilas — mas Vau/Cinzafolha/Degelo são apertadas e o validador de
pegadas é rígido: construir moradias novas seria arriscado e fora do estilo de
cada vila.

## Decisão
- **Reaproveitar as construções da vila como lares** (`RESIDENCES`): cada vila já
  tem suas moradias temáticas — **palafitas** no Vau, **cabanas** em Cinzafolha,
  **tendas** no Degelo. Em vez de erguer prédios novos, cada família é ancorada a
  uma dessas construções (o povo mora onde vive). Zero construção nova ⇒ zero
  risco de sobreposição de pegadas.
- Coordenadas locais das moradias de cada vila entram em `RESIDENCES`; o
  `_populate` já passa `RESIDENCES[theme]` ao `assignHouseholds`, então as famílias
  das 4 vilas ancoram a casas reais (cicla se houver mais famílias que casas — um
  "sobrado" ocasional).

## Consequências
- **Todo morador tem casa, nas 4 vilas** — a rotina do dia (sair, almoçar, reunir
  no salão ao entardecer, dormir) gira em torno de um prédio real em qualquer vila.
- Verificado por teste (footprints sem sobreposição — nenhuma construção nova;
  suíte completa) e em runtime num Game real: **35/35 moradores ancorados a casas**
  (Clareira 10/10, Vau 9/9, Cinzafolha 8/8, Degelo 8/8).
- Próximo: **E22.5** aldeões conversando entre si ao se cruzarem (fecha o E22).

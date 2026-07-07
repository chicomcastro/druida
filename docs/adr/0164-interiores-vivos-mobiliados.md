# ADR 0164 — Interiores vivos e mobiliados (E31)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
Follow-up do ADR 0163. No playtest os interiores ficaram **vazios demais**: só o
NPC-título e um cantinho de sotaque da vila. O pedido foi direto — mais móveis
(mesas, quadros, cadeiras, jarros), **gente dentro** e, no Salão Comunal, um
banquete com os aldeões comendo e se servindo. Além disso, os modelos dentro do
interior **pareciam sem olhos** e **não refletiam os moradores** que trabalham ali.

## Decisão
1. **Móveis por serviço** (`InteriorManager._buildProps`): todo interior agora
   ganha **quadros** na parede (norte/oeste, visíveis na iso), **tapete**, **vaso
   de planta** e **jarros**. Lojas mantêm balcão/prateleiras + jarros; taverna e
   salão ganham **mesas fartas** (assado, pão, canecas de bebida com espuma) +
   banquetas; o **Salão Comunal** vira um mesão de banquete com estandarte e
   barril de bebida.
2. **Layout compartilhado** (`_layout`): uma só fonte de verdade para onde ficam
   as mesas e os lugares — móveis (`_buildProps`) e gente (`_populatePatrons`)
   ficam alinhados. Salão = 3 mesas / 6 lugares; taverna = 2 mesas / 3; salão de
   liderança = 2; loja = 2 fregueses.
3. **Aldeões de verdade** (`_populatePatrons`): as pessoas dentro são **moradores
   reais da vila** — nomes puxados do elenco do assentamento (`settlements.list`)
   e túnicas na **paleta da vila** (`PATRON_LOOKS`: verdes na Clareira, azuis de
   água no Vau, marrons de lenha em Cinzafolha, tons frios no Degelo). Sentam às
   mesas comendo (`E — Nome` + fala) e alguns "se servem". Ids em `active.patrons`,
   destruídos na saída (o mesh some pelo `_cleanupDestroyed` do Game).
4. **Olhos à mostra**: o NPC do interior virava `Math.PI` (de costas pra câmera
   isométrica SE) — daí "sem olhos". Agora todos encaram a câmera (`rot ~0.35`),
   com o rosto (e os olhos, que o `makeVillagerSpec` sempre teve) visível.

## Consequências
- Interiores parecem **habitados**: mesa posta, quadros, jarros, planta, e a vila
  reunida — o Salão Comunal com o banquete que o playtest pediu.
- Quem está dentro tem **cara e nome da vila** — o salão de Cinzafolha é gente de
  Cinzafolha, não figurante genérico.
- Travado por testes (`interiors.test`: povoamento ≥2 e limpeza na saída; salão
  reúne ≥6 e mais que a loja; fregueses batem com o elenco real; NPC não fica de
  costas) e verificado em runtime (salão de Cinzafolha com 6 lenhadores à mesa;
  taverna da Clareira com taverneira + cozinheiro + 3 fregueses, todos com olhos).
  360 testes verdes, `tsc` limpo, `vite build` ok.

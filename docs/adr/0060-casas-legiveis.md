# ADR 0060 — Construções legíveis: casas de duas águas por tema

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Feedback de playtest: "os modelos das casas estão me incomodando". A causa
principal: as cabanas do hub eram **cilindro + cone verde** — à distância
isométrica, a mesma silhueta e cor das copas das árvores. A vila desaparecia
no bioma. As demais construções eram caixas com pouco vocabulário (sem porta
com moldura, sem janela, sem beiral).

## Decisão
- **Helper compartilhado `_house`** (`SettlementManager`): casa de vigas com
  fundação de pedra, cantos em viga, telhado de **duas águas com beiral
  generoso**, sótão fechando a empena, cumeeira em destaque, porta com verga
  e degrau, e **janela acesa** (emissiva, registrada em `_flames` — pulsa e
  brilha mais à noite, junto do boost do dia/noite). A silhueta assimétrica
  do telhado é o que separa "casa" de "árvore" no isométrico.
- **Hub druida**: 5 casas de teto vivo (musgo com cumeeira de palha) voltadas
  ao centro; metade com chaminé + fumaça.
- **Vau das Palafitas**: cabine com vigas de canto e janela verde-água,
  telhado piramidal com beiral largo + pináculo, **guarda-corpo** no deck
  (frente aberta para a escada).
- **Cinzafolha**: cabanas de **toras empilhadas** (cilindros horizontais com
  topos salientes nos cantos + fechamento interno), telhado de duas águas em
  tábua escura, janela âmbar e chaminé de pedra (fumaça preservada, agora
  posicionada via `_spun` — offset local girado corretamente).
- **Abrigo do Degelo**: tendas ganham **armação de varas cruzadas** no topo e
  aba de entrada aberta — leitura de tenda de pele, não de cone.

## Consequências
- ~130 meshes a mais no total das 4 vilas (de ~15 para ~45 por vila) — nada
  instanciado, mas são poucas unidades e estáticas; sem impacto medível.
- Janelas acesas dão vida às vilas à noite (uma leitura de "tem gente aqui"
  que nenhuma lanterna dá).
- Colliders inalterados em posição (raio +0.1 nas casas maiores).

# ADR 0120 — Postes no fim do espigão (Clareira)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Mesmo depois do ADR 0116, os postes da Clareira ficavam **ao lado de cada
porta** — muito **próximos das casas** e **próximos uns dos outros**,
aglomerando o entorno das moradias. Pedido do playtest: os postes deveriam ficar
**longe das casas, no fim de cada espigão** (onde encontra a via em anel), mais
naturais e espaçados.

## Decisão
- **Poste no fim do espigão** (`SettlementManager._buildDruida`): em vez de um
  poste ao lado da porta, cada espigão agora coloca o poste **onde encontra a
  via em anel** (`ringEnds`), empurrado ~1.3u para **fora** do anel — ele
  flanqueia o caminho sem bloqueá-lo. A luz aponta para a **casa** que aquele
  espigão serve (sobe o caminho).
- **Sem aglomerar**: espigões cujos fins caem a menos de **4u** um do outro
  compartilham um único poste (dedupe). Resultado na Clareira: 7 postes em anel
  ao redor da praça, espaçados ~6u, nenhum ao lado de casa.
- **Acentos** de artéria mantidos, também flanqueando (não bloqueando): meio do
  corredor sul, portão sul e fim do espigão do mercado.

## Consequências
- A vila fica mais natural e arejada: a luz desenha o anel/praça central e os
  caminhos, longe das moradias.
- Padrão "poste no fim do espigão, flanqueando o caminho, deduplicado" fica
  pronto para reaproveitar nas vilas 2–4 (próximo passo do E15).
- Postes seguem sólidos (ADR 0113) mas ficam fora da laje da via, sem obstruir.

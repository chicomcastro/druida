# ADR 0116 — Lanternas direcionais, postes nas artérias e fix de colisão

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Playtest da Clareira apontou três coisas no cenário:
1. As **lanternas** ainda apontavam para direções "aleatórias" — o braço/luz de
   cada poste caía sempre para +x, sem relação com o caminho que ilumina.
2. Havia postes só nos **espigões** das casas; os **caminhos principais** (a via
   em anel e o corredor sul) ficavam sem iluminação própria.
3. Um **objeto decorativo colidia com uma casa**: o varal leste, em `(16,6)`,
   encostava no **anexo da casa 1** (centro `13.5,4.5`, 3×3).

## Decisão
- **Lanterna direcional** (`SettlementManager._lantern`): a assinatura ganhou
  `faceX/faceZ`. O braço, a tampa e a caixa de luz são posicionados por um
  ângulo `atan2` que aponta o offset local para o alvo — normalmente a
  porta/caminho. Sem alvo, mantém o comportamento antigo (aponta +x) por
  retrocompatibilidade.
- **Luz voltada ao caminho** (`_buildDruida`): cada poste de porta passa a
  registrar `[x, z, faceX, faceZ]`, apontando para a porta. Assim a luz "abre"
  para o espigão em vez de para o mato.
- **Postes nas artérias**: além dos espigões, agora há postes nas **quinas da
  via em anel** (`±8.5, ±8.5`, luz para o centro da praça), **flanqueando o
  corredor sul**, no **fim do espigão do mercado** e no **portão sul** — a
  iluminação desenha as vias principais, não só as entradas.
- **Fix da colisão**: o varal leste foi movido de `(16,6)` para `(17,7)`, um vão
  livre entre o anexo da casa 1 e a moradia externa. Verificado
  analiticamente (nenhuma pegada penetra) e no jogo.
- **Guarda de regressão**: os varais da Clareira agora **registram pegada**
  (`w.fp`) e entram no validador ADR 0085 — postes largos de props não podem
  mais invadir casas sem o `footprints.test` acusar.

## Consequências
- A iluminação conta a história das ruas: portas e artérias acesas, luz sempre
  virada para onde se anda.
- O padrão "props com pegada no validador" fecha o buraco que deixava colisões
  decorativas passarem (o validador só cobria estruturas até aqui).
- `_lantern` com `faceX/faceZ` é reaproveitável para as vilas 2–4 no próximo
  passo do E15.

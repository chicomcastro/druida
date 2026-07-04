# ADR 0065 — Luz dramática: pool de luzes pontuais e masmorras MCD (M14.4)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Fase 4 do estilo MCD ([plano](../art-direction-mcd.md)): ambiente frio/escuro
esculpido por luzes quentes locais. O forward renderer sofre com muitas
PointLights (recompilação de shader por contagem + custo por fragmento), e o
mundo tem dezenas de fontes (fogueiras, lanternas, braseiros, janelas).

## Decisão
- **`core/render/LightPool.ts`**: o mundo **registra** fontes
  (posição/cor/intensidade/flicker); o pool mantém **6 PointLights** fixas na
  cena e move-as para as fontes mais próximas do grupo (repick a cada 0.35s,
  imediato em teleporte). As demais fontes seguem como emissivo puro. Flicker
  por luz e boost noturno (ADR 0049) aplicados no pool. Atualizado no loop de
  SIMULAÇÃO (não no render — rAF pode ser estrangulado em headless/background).
- **Fontes migradas**: fogueiras/braseiros das vilas (`_fireLight` virou
  registro), lanternas, e 6 braseiros novos na arena de masmorra (chama
  recolorida pela cor do perigo do tema).
- **Intensidades em escala física** (three r155+, decay ~2): tocha ~30 cd,
  fogueira ~13–26 cd, lanterna 8 cd — calibradas visualmente para "poças de
  luz" legíveis em albedo escuro.
- **Masmorras no mood MCD** (`dungeons.ts`): cada tema ganhou `light` frio e
  fraco (sol 0.8–0.9, hemisfério 0.4) + pisos um degrau mais claros. **Fix
  de névoa**: fogNear/fogFar antigos (22/55) afundavam a arena inteira no
  preto — a câmera fica a ~44u do alvo; névoas subiram para ~40/95.
- **Sem céu na masmorra**: o domo esconde (`sky.visible=false`) — o vazio
  além das muralhas é o background escuro do tema, não um horizonte com
  brilho de pôr-do-sol.

## Consequências
- Vilas à noite: poças de luz de lanterna/fogueira no estilo MCD (verificado
  visualmente); masmorras: câmara escura com tochas esculpindo as muralhas.
- Custo fixo: 6 PointLights no mundo inteiro, independente de quantas fontes
  existam. Nenhuma recompilação de shader por variação de contagem.
- `_lights` do SettlementManager ficou vazio (legado) — o pulso de luz vive
  no pool agora.

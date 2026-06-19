# ADR 0037 — VFX: feedback de melee, status visíveis e mais juice

**Status:** Aceito · **Data:** 2026-06-19

## Contexto
Com o combate corpo-a-corpo no centro (ADR 0035), o feedback visual precisava
acompanhar: golpes sem cor, sem leitura de elemento e sem indicação de status no
inimigo deixavam o combate "seco".

## Decisão
Enriquecer a VFX (camada de view, fora da métrica de cobertura — coberta por
e2e), mantendo o pool de partículas (ADR 0025):

- **Feedback de melee + elemental**: `meleeArc` passa a propagar uma `color` no
  evento `meleeSwing`; o ataque-base e as formas (lobo/urso/sapo/rajada) enviam
  a cor do elemento/golpe. A faísca de impacto e o arco saem nessa cor. O burst
  de dano usa a cor do elemento do acerto (`elementColor(effect)`).
- **Status visíveis no inimigo**: `render.ts` tinge o corpo por emissão quando
  há status dominante (queimando/congelado/envenenado/enraizado), com pulso; a
  VFX solta um drip leve de partículas na cor do status (~12 Hz).
- **Mais juice**: trilhas curtas de projétil (cor do efeito), morte com burst
  maior + anel (chefe em roxo), e faíscas no impacto do golpe.

Cor de elemento centralizada: `ELEMENT_COLOR` (abilities) e `elementColor()`
(vfx) compartilham a paleta.

## Consequências
- Combate mais legível e "tátil" sem custo de cobertura (vfx/render já fora do
  escopo). Bundle praticamente inalterado (~154 kB brotli).
- Threading de `color` é opt-in (default branco), então habilidades antigas e
  testes seguem válidos; `meleeArc` ganhou só um campo no evento.
- Auras de status reaproveitam o caminho de `emissive` já existente do flash de
  dano (flash tem prioridade).

# ADR 0058 — Iluminação diurna legível: sol dominante e sombras visíveis

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Feedback de playtest: "falta de sombras". A investigação (verificação visual
headless com repro mínimo) mostrou que **as sombras sempre estiveram ligadas**
— shadow map PCFSoft 2048², sol com `castShadow`, chão/props com
`receiveShadow`. Um cubo de teste sobre um plano claro projetava sombra
perfeita. O problema era de **direção de arte**: paleta diurna escura
(albedo do chão ~20% de luminância), hemisfério quase tão forte quanto o sol
(0.8 vs 1.2) preenchendo a penumbra, névoa escura e vinheta 0.32 — a sombra
existia com contraste imperceptível.

## Decisão
- **Razão sol/ambiente**: sol vira a luz dominante (~1.45–1.8 por bioma; era
  0.85–1.35) e o hemisfério cai para ~0.5–0.6 (era 0.65–0.9). Sombra passa a
  ter ~2–3× de contraste com a área iluminada.
- **Paleta diurna clara** (`biomes.ts`): chão e background/névoa de cada
  bioma sobem de luminância mantendo a identidade — clareira ensolarada,
  pântano olivo opressivo, bosque cinza-pardo, picos brancos, coração roxo
  escuro (o final continua dramático, um degrau acima do ilegível). Versões
  `purified` sempre mais claras que a base (invariante do ADR 0044).
- **Qualidade da sombra** (`Renderer.ts`): `bias -0.0004` + `normalBias 0.04`
  (sem acne nas faces grandes do low-poly) e `radius 3` (borda macia no
  PCFSoft). Vinheta do grade de 0.32 → 0.24.
- Noite continua vinda do `applyDayNight` (lerp para `_nightBg`) — verificada
  visualmente: mood noturno preservado com as novas bases.

## Alternativas consideradas
- **SSAO/AO em screen-space**: caro no tablet (o alvo do playtest) e não
  resolvia a causa (contraste), só adicionaria oclusão de contato.
- **Aumentar exposure/bloom**: clareia tudo por igual — não devolve a leitura
  de profundidade que a sombra direcional dá.

## Consequências
- Sombras de copas, construções e personagens visíveis em todos os biomas de
  dia; o mundo ganha leitura de profundidade e "hora do dia".
- Zero custo novo de GPU (o shadow map já era renderizado todo frame).
- Screenshots de e2e ficam mais claros — thresholds de asserts visuais não
  existem, sem impacto em CI.

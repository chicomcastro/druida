# ADR 0078 — Telhados em degraus, casas maiores e partículas cúbicas (M17)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Feedback pós-M16: os telhados de duas águas ainda usavam lajes inclinadas
(a exceção do ADR 0077), as casas do hub pareciam pequenas em relação ao
herói, e sobravam dois efeitos não-cúbicos fora do cenário.

## Decisão
- **Telhado de duas águas em degraus** (`_house` e cabanas dos lenhadores):
  3 camadas de caixas que encolhem + cumeeira — a escada clássica de
  telhado MC. Sótão e lajes inclinadas aposentados; a exceção do ADR 0077
  deixa de existir.
- **Casas maiores** (escala MCD): base 3.6×2.9 → **4.4×3.6**, pé-direito
  1.7 → 2.1, porta 0.85×1.25 → **1.0×1.6** (o herói passa pela porta),
  colliders 2.6 → 3.1, chaminé/fumaça reposicionadas.
- **Partículas cúbicas**: clarão de impacto (VFX) vira cubo aditivo;
  orbes de projétil/essência viram **cubos girantes** — o drop canônico
  de MC (cache compartilhado do ADR 0026 preservado).

## Consequências
- Nenhuma rotação inclinada resta em cenário estático; 100% do vocabulário
  visual (mundo, fogo, fumaça, partículas, drops) é cúbico.
- Únicas exceções vivas: cristais octaédricos (gemas) e animações de
  vento/balanço.

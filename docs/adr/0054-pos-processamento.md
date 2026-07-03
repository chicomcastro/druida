# ADR 0054 — Render profissional: pós-processamento + céu com gradiente

**Status:** Aceito · **Data:** 2026-07-03

## Contexto
O render era "cru": sem glow nos emissivos (lanternas/cristais/chamas viram
apenas cores chapadas), fundo de cor sólida e nenhum acabamento de imagem.
Era o item que mais separava o visual de "protótipo" para "jogo profissional"
(feedback de playtest, M12).

## Decisão
Pipeline de pós-processamento no `Renderer` (EffectComposer do three.js):

- **RenderPass → UnrealBloomPass → OutputPass → Grade**: bloom sutil
  (strength 0.32, threshold 0.82) faz lanternas, cristais, chamas, gemas de
  elite e vagalumes brilharem de verdade; **OutputPass é obrigatório** (aplica
  ACES + sRGB no pipeline — sem ele o composer sai linear e escuro); o passe
  final "grade" (shader próprio) soma vignette suave + leve realce de
  saturação/contraste.
- **MSAA preservado** (`renderTarget.samples = 4` — WebGL2), sem FXAA.
- **Céu com gradiente**: domo (esfera BackSide com shader de 2 cores) que
  segue o grupo; topo profundo e horizonte com brilho, derivados do
  `background` do bioma e modulados pelo dia/noite (ADR 0049) — nada de nova
  tabela por bioma.
- **Toggle "✨ Efeitos visuais"** no menu de pausa: desliga o composer e cai
  no render direto (dispositivos fracos).
- **Orçamento de bundle**: 185 kB → **230 kB** (ADR 0029 continua valendo; o
  pipeline adicionou ~4,5 kB brotli, e o novo teto dá folga para o restante
  do M12 sem alarmes falsos).

## Consequências
- Emissivos ganham presença (a noite vira vitrine das vilas); a imagem tem
  direção (vignette/grade) sem perder o estilo low-poly.
- Custo: 2 render targets + bloom (~1–2 ms em GPU integrada); o toggle cobre
  o resto. SwiftShader (CI) roda o pipeline sem erros.
- Armadilha documentada: qualquer passe novo entra ANTES do OutputPass se
  opera em HDR/linear, DEPOIS se opera na imagem final (como o grade).

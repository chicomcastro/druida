# ADR 0059 — Locomoção natural: easing de amplitude e contrapeso corporal

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Feedback de playtest: "estranhei a animação de andar". A locomoção procedural
(ADR 0039) era mecanicamente correta mas robótica: a pose de caminhada
**estalava** ao começar/parar (amplitude ia de 0 ao máximo em um frame), a
cadência era acelerada, e só pernas/braços se moviam — tronco e cabeça iam
rígidos como um bloco.

## Decisão
Continuar 100% procedural (sem clips/GLB — ADR 0039 se mantém), com três
melhorias em `systems/animation.ts`:

- **Easing de amplitude**: `_amp` persiste no `userData` e converge para o
  alvo em ~0.1s — entrar/sair da caminhada é uma transição, não um corte.
  Todos os canais multiplicam por `amp`, então o corpo inteiro assenta junto.
- **Passada com peso**: bob do corpo em 2×freq (dois apoios por ciclo de
  seno) com afundada no contato do pé; cadência recalibrada (5.5 + speed).
- **Contrapeso**: tronco torce contra o quadril (`rotation.y`) e rola a cada
  apoio; cabeça compensa a torção (olhar estável); braços com follow-through
  (fase atrasada em 0.3 rad) e levemente abertos; arma balança com atraso
  na mão; bípede inclina o tronco à frente proporcional à passada.
  Quadrúpede ganha ondulação de coluna e cauda em dois eixos.

Contratos preservados (cobertos por teste): pernas/diagonais em oposição,
ataque lança o braço direito (x negativo), flinch recua cabeça/tronco
(x positivo) e domina a inclinação.

## Consequências
- Caminhada com peso e vida a custo zero de asset e ~10 ops a mais por corpo.
- O flinch continua dominante sobre a inclinação do tronco via blend `(1-r)`.
- `_amp` é estado por corpo (como `_phase`) — trocar de forma reinicia limpo.

# ADR 0092 — Combate: combo por timing + game feel (E3)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O roadmap (E3) pede a mecânica de combo do usuário: uma barra central que
enche no tempo de execução da habilidade; acertar o próximo ataque no
**sweet spot (~75%)** encadeia antes do fim (mais DPS + bônus); errar
degrada/interrompe, pior quanto mais longe do sweet spot. Mais game feel
(hit-stop, knockback, telegraphs).

## Decisão
- **`combo.ts`** (lógica pura, testável): `evalCombo(p)` → `{ ok, quality }`
  com janela 0.60–0.90 e pico em 0.75; `comboMul(count)` = +12%/stack até 8.
  Constantes em `COMBO` para tunar no Gate B.
- **playerControl**: ataque por **edge de press** (não auto-fire) — o timing
  é do jogador. 1º golpe abre a janela (`attackTimer=castTotal`); apertar de
  novo avalia o progresso: acerto encadeia imediatamente (combo++, reinicia a
  janela → ataca mais rápido que o cooldown = DPS↑); erro zera o combo e
  adiciona recuperação (`missPenalty`). Combo decai após `castTotal×1.6` sem
  acerto.
- **Dano**: `dmgMul` multiplica por `comboMul(pc.combo)` — toda a ofensiva
  ramp-a enquanto o combo vive.
- **Barra central** no HUD (`#hud-combo`): preenche 0→1, zona verde marca o
  sweet spot, contador "Combo ×N", flash ao encadear.
- **Game feel**: micro hit-stop + shake ao encadear (escala com a contagem);
  **telegraph de inimigo** — o golpe melee agora tem windup com anel de aviso
  vermelho e **erra se o alvo sair do alcance** (recompensa a esquiva);
  knockback/flinch já existentes preservados.

## Consequências
- Combate deixa de ser clique-automático: timing vira habilidade com
  recompensa (DPS) e risco (quebra). O Gate B (playtest) calibra 60/75/90 e
  o dano por stack.
- Inimigos ganham leitura de intenção (telegraph) — base para os chefes do E8.

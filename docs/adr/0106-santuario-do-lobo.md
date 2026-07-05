# ADR 0106 — Santuário do Lobo: a primeira Forma Ancestral

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
A wiki (ADR 0105) documentou uma lacuna real de conteúdo: a **Forma Lobo**
existia (FORM, modelo voxel, trilha de talentos) mas **não tinha caminho de
desbloqueio** — só havia santuários para Urso (Pântano), Corvo (Bosque) e Sapo
(Picos). O Lobo era inalcançável no jogo. Consultado, o usuário escolheu
**"Santuário na Clareira (1ª forma)"**: o Lobo vira a primeira Forma Ancestral,
com santuário na própria vila inicial.

## Decisão
- **Marco e passo de campanha** (`src/gameplay/story.ts`): novo
  `LANDMARKS.sanctuary_wolf` na Clareira (x 0, z −40, dentro do anel `clareira`
  r≤55) e novo passo `find_wolf` inserido **logo após `purify_clearing`** — a
  campanha passa de 8 para 9 passos. `_sanctuaryStepFor`, `formName` e a fala da
  Guardiã foram atualizados. O jogador continua começando só com `humanoid`
  (`factories.ts`) e desperta o Lobo como recompensa da 1ª purificação.
- **Marco no mundo e nos mapas** (`world/landmarks.ts`, `ui/WorldMap.ts`,
  `ui/Minimap.ts`): o santuário é construído no mesmo padrão dos demais (glow
  azul-lobo `#8fd0ff`) e aparece no mapa-mundi e no minimapa.
- **Dons do Lobo** (`gameplay/boons.ts`): como é a introdução ao sistema de
  Dons, o Lobo ganha dois — **Sede de Sangue** (cura 6 de vida a cada abate,
  hook em `kill`) e **Instinto de Caça** (+10% de dano de ataque, lido em
  `Game.dmgMul`). Consistente com Urso/Corvo/Sapo (escolha de 1 de 2).

## Consequências
- A campanha ganha um beat de recompensa cedo (forma + primeiro Dom) e todas as
  5 formas passam a ser alcançáveis; a lacuna da wiki é fechada.
- Saves antigos guardam `story.step` como índice: um save no antigo `find_bear`
  (2) passa a cair em `find_wolf` (2). É um deslocamento de 1 passo, aceitável
  no protótipo (sem migração de save).
- A rixa das famílias restrita à Clareira segue como lacuna aberta (ADR 0107).

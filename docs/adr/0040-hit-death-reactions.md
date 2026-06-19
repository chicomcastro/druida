# ADR 0040 — Reações de hit/morte e investida dos inimigos

**Status:** Aceito · **Data:** 2026-06-19 · **Depende de:** ADR 0039

## Contexto
A animação procedural (ADR 0039) cobria idle/andar/atacar do jogador. Faltava
feedback de combate nos inimigos: recuo ao tomar dano, animação de morte e
investida ao atacar — o que deixava os golpes "sem peso".

## Decisão
- **Flinch (recuo)**: `applyDamage` marca `tint.react` no alvo; o render decai o
  timer e passa `react` para `animateBody`, que joga cabeça/tronco para trás
  (sobrepõe ataque/idle).
- **Morte**: `killEntity` emite `kill` (loot/XP/história imediatos), torna o
  `Collider` não-sólido, marca `Renderable.dying` e **agenda a destruição**
  (~0.45 s). O render faz o corpo **tombar** (rotação Z), afundar e encolher; a
  IA passa a **ignorar mortos**.
- **Investida dos inimigos**: a IA seta `ai.swing` ao atacar (melee/ranged/
  summoner) e o decai; o render converte em `attack` para `animateBody`, que
  além do braço/arma move a **cabeça à frente** (gore p/ quadrúpedes).
- **Vitrine**: botões **Dano** e **Morte** reproduzem as reações.

## Consequências
- Combate com mais peso e leitura, reaproveitando o pipeline de animação
  (mesma função no jogo e na vitrine).
- Morte com pequena latência visual (0.45 s) antes do `dispose`; sem efeito na
  lógica (kill dispara na hora). Render/vfx seguem fora da cobertura; a lógica
  nova (combat/ai) é coberta por testes (flinch, ciclo de morte, IA inerte).

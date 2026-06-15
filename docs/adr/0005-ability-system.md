# ADR 0005 — Sistema de habilidades data-driven

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
Magias, ataques de forma e artefatos compartilham mecânica (custo, cooldown,
efeito). Queríamos adicionar conteúdo sem reescrever lógica.

## Decisão
Registro central `ABILITIES` (`src/gameplay/abilities/index.js`): cada
habilidade tem `{ sap, cooldown, execute(game, casterId, angle, opts) }`.
`castAbility` valida Seiva e cooldown, executa e registra o cooldown.

Primitivos reutilizáveis: `meleeArc` (dano em arco), `createProjectile`,
`aoeDamage`, `spawnSummon`, `game.schedule` (efeitos atrasados, ex.: meteoro).

Ataques básicos de forma são habilidades de custo 0; artefatos referenciam uma
habilidade por id. Itens só apontam para `ability` — sem lógica embutida.

## Consequências
- Novas habilidades = uma entrada no registro.
- Efeitos de encantamento que alteram habilidades (ex.: Metamorfo) são tratados
  por eventos (`formSwap`, `cast`) em vez de ramificar dentro de cada execute.

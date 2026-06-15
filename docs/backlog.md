# 📋 Druida — Backlog

Organizado em **épicos** e **milestones (M0–M10)**. Cada milestone tem um objetivo claro e tarefas acionáveis. As tarefas usam checkboxes para acompanhar progresso.

> Estimativas são relativas (P = pequeno, M = médio, G = grande). Ordem dos milestones é a sequência recomendada; itens dentro de um milestone podem paralelizar.

**Legenda de épicos:** 🧱 Fundação · 🎮 Gameplay · 🌿 Druida · 💎 Loot/Progressão · 🗺️ Mundo · 👥 Coop · 🤖 Inimigos · 📖 História · 🖥️ UI/UX · 🔊 Áudio · 🚀 Infra

---

## M0 — Fundação técnica
**Objetivo:** repositório roda, build funciona, loop e ECS de pé. Nada jogável ainda, mas a base existe.

- [ ] 🧱 Scaffold Vite + Three.js rodando (`npm run dev` abre uma cena vazia) — P
- [ ] 🧱 Decidir JS vs **TypeScript** e configurar (recomendado: TS) — P
- [ ] 🧱 ESLint + Prettier + EditorConfig — P
- [ ] 🧱 Vitest configurado com um teste smoke — P
- [ ] 🧱 `GameLoop` com timestep fixo + render interpolado — M
- [ ] 🧱 ECS mínimo: `World`, registro de entidades/componentes, `System` base — M
- [ ] 🧱 `Renderer` (wrapper Three.js) + `IsoCamera` (ortográfica isométrica) renderizando um chão e um cubo — M
- [ ] 🚀 GitHub Actions: lint + test + build em PR — P
- [ ] 🧱 Definir estrutura de pastas conforme arquitetura — P

**DoD:** `npm run dev` mostra um cubo num chão em câmera isométrica; `npm test` e `npm run build` passam no CI.

---

## M1 — Vertical slice jogável
**Objetivo:** um jogador controla um Druida (humanoide), anda no mundo, ataca, e um inimigo reage. Prova o pipeline ponta-a-ponta.

- [ ] 🎮 `InputManager` (teclado/mouse) → `InputSystem` → `InputState` — M
- [ ] 🎮 `PlayerControlSystem` + `MovementSystem` (mover 8/360°) — M
- [ ] 🎮 Colisão básica AABB + spatial hash; jogador não atravessa obstáculos — M
- [ ] 🌿 Personagem placeholder (cubo/voxel) + animação mínima de movimento — P
- [ ] 🎮 Ataque básico (hitbox + cooldown) com feedback visual — M
- [ ] 🤖 1 inimigo placeholder com `AISystem` (perseguir + atacar) e `Health` — M
- [ ] 🎮 Dano e morte (entidade some, drop placeholder) — P
- [ ] 🖥️ HUD mínimo: barra de vida do jogador (overlay DOM) — P
- [ ] 🎮 `CameraSystem` segue o jogador — P

**DoD:** dá para andar, bater num inimigo, matá-lo e tomar dano, com câmera isométrica seguindo.

---

## M2 — Kit do Druida (combate de classe)
**Objetivo:** a fantasia do Druida ganha vida: Seiva, magias elementais, formas animais e artefatos.

- [ ] 🌿 Recurso **Seiva**: componente + regen ao atacar + gasto — M
- [ ] 🌿 Sistema de **habilidades data-driven** (`AbilitySystem` + `data/abilities`) — G
- [ ] 🌿 2–3 magias elementais (ex.: espinhos de raiz, lança de gelo, chama selvagem) com status — M
- [ ] 🌿 Sistema de **Formas** (`Form` component) com troca instantânea e custo de Seiva por segundo — G
- [ ] 🌿 1ª forma jogável (**Lobo**: investida + mordida) — M
- [ ] 🌿 Status elementais (`StatusEffectSystem`: queimar, congelar, enraizar) — M
- [ ] 🌿 Sistema de **artefatos** (3 slots, cooldown) + 1 artefato (ex.: totem de cura) — M
- [ ] 🎮 Dodge/roll com i-frames — P
- [ ] 🖥️ HUD: Seiva, ícones de artefato/cooldown, forma atual — M

**DoD:** o Druida lança magias com status, transforma-se em Lobo e usa um artefato, gerindo Seiva.

---

## M3 — Loot, itens e encantamentos
**Objetivo:** o sistema que faz o jogador querer farmar — fiel ao MC Dungeons.

- [ ] 💎 `data/items` (armas de conjuração, armaduras, artefatos) + raridades — M
- [ ] 💎 `LootSystem`: drop tables, pickup, raridade ponderada — M
- [ ] 💎 Inventário e equipamento (`Inventory`, `Equipment`) — M
- [ ] 💎 Stats derivados do equipamento aplicados ao jogador — M
- [ ] 💎 **Encantamentos**: slots, pontos de encanto, ativar/escalar/salvage com devolução — G
- [ ] 💎 3–5 encantamentos temáticos (Fotossíntese, Matilha, Metamorfo...) — M
- [ ] 🖥️ Tela de inventário/equipamento + tela de encantamento — G
- [ ] 💎 Salvage de itens → recurso de encantamento — P

**DoD:** matar inimigos dropa itens; equipar muda o build; gastar pontos em encantamentos altera comportamento.

---

## M4 — Mundo aberto
**Objetivo:** sair de uma arena para um mundo contíguo, explorável e com streaming.

- [ ] 🗺️ `ChunkManager` + `WorldStreamingSystem` (carrega/descarrega por proximidade) — G
- [ ] 🗺️ `data/biomes` + 1º bioma jogável (Clareira Viva) handcrafted + variação — G
- [ ] 🗺️ InstancedMesh para vegetação/props; merge de estáticos por chunk — M
- [ ] 🗺️ Hub central (Carvalho-Mãe) com baú compartilhado e mercador placeholder — M
- [ ] 🗺️ Fast travel via santuários + mapa com fog of war — M
- [ ] 🗺️ Pontos de interesse: 1 masmorra opcional + 1 acampamento inimigo — M
- [ ] 🗺️ Recursos colhíveis (essência/ervas) — P
- [ ] 🗺️ Persistência leve de estado do mundo (áreas limpas) — M
- [ ] 🌿 2ª forma desbloqueável via santuário (ex.: Urso) — M

**DoD:** dá para explorar um bioma contíguo com streaming, usar fast travel, entrar numa masmorra e voltar ao hub.

---

## M5 — Coop local same-screen
**Objetivo:** 2–4 jogadores no mesmo sofá, conforme decisão de design.

- [ ] 👥 Gamepad API: detecção e "pressione para entrar/sair" (P1–P4) — M
- [ ] 👥 `PlayerBindings` por jogador (teclado p/ P1; gamepads p/ P2–P4) — M
- [ ] 👥 `CoopManager`: spawn/despawn de jogadores adicionais — M
- [ ] 👥 Câmera de grupo: centróide + zoom dinâmico + clamp de distância — G
- [ ] 👥 Escala de dificuldade por nº de jogadores (vida/qtd inimigos) — M
- [ ] 👥 Revive de aliado caído + lógica de wipe/checkpoint — M
- [ ] 👥 Decidir e implementar **loot compartilhado vs instanciado** (validar) — M
- [ ] 🖥️ HUD multi-jogador (cor/identidade por jogador) — M

**DoD:** 2–4 jogadores entram a qualquer momento, jogam juntos com câmera estável, revivem-se e o loot funciona em grupo.

---

## M6 — Inimigos, IA e primeiro chefe
**Objetivo:** combate com variedade e um pico de tensão.

- [ ] 🤖 `data/enemies` + 4–6 inimigos comuns variados (corpo-a-corpo, ranged, explosivo) — G
- [ ] 🤖 1–2 elites (xamã que cura/invoca; tanque de casca) — M
- [ ] 🤖 Comportamentos de IA: hordas, flanqueio, manter distância — M
- [ ] 🤖 Object pooling para hordas — M
- [ ] 🤖 1 mini-chefe de bioma (Árvore-Carniça) — M
- [ ] 🤖 Chefe de região com fases (esqueleto do Apodrecedor) — G
- [ ] 🌿 Invocações do Druida (lobos/totem) como aliados controlados pela IA — M

**DoD:** combate variado contra hordas e elites, com um chefe multi-fase derrotável (idealmente em coop).

---

## M7 — História e campanha
**Objetivo:** dar propósito ao mundo aberto.

- [ ] 📖 Sistema de missões/objetivos (data-driven) — G
- [ ] 📖 Gating de progressão: regiões/formas liberadas por marcos da história — M
- [ ] 📖 NPCs no hub com diálogos (sistema de diálogo simples) — M
- [ ] 📖 Arco principal: purificar N regiões → confronto final — M
- [ ] 📖 Eventos dinâmicos por região (acampamentos, invasões) — M
- [ ] 📖 Lore/colecionáveis opcionais — P

**DoD:** há um fio condutor: missões guiam o jogador pelas regiões até o antagonista, sem travar a exploração livre.

---

## M8 — UI/UX, menus e save
**Objetivo:** o jogo vira um produto navegável.

- [ ] 🖥️ Menu principal (novo jogo / continuar / opções) — M
- [ ] 🖥️ Pause + opções (volume, controles, vídeo) — M
- [ ] 🖥️ Mapa do mundo navegável com marcadores — M
- [ ] 🖥️ Tutoriais/onboarding contextual — M
- [ ] 🖥️ Tela de game over / retorno a checkpoint — P
- [ ] 💾 Save/load (localStorage → IndexedDB) com versionamento de schema — G
- [ ] 🖥️ Rebind de controles + suporte a múltiplos layouts de gamepad — M

**DoD:** dá para começar/continuar uma jornada salva, pausar, ver o mapa e configurar controles.

---

## M9 — Áudio, polish e performance
**Objetivo:** sensação, ritmo e fluidez.

- [ ] 🔊 Camada de áudio (Web Audio/Howler) com pooling de SFX — M
- [ ] 🔊 SFX de combate/habilidades/UI + música por bioma — M
- [ ] 🎮 Game feel: hit-stop, screen shake, partículas, feedback de dano — M
- [ ] 🚀 Profiling: draw calls, GC, budget de entidades; otimizações — G
- [ ] 🚀 LOD/culling refinados; carregamento de assets progressivo — M
- [ ] 🎮 Balanceamento de combate/loot/progressão — G

**DoD:** o jogo soa bem, dá feedback gostoso e roda estável com 4 jogadores e hordas.

---

## M10 — Release / Infra
**Objetivo:** publicar e iterar.

- [ ] 🚀 Build de produção + deploy estático (GitHub Pages/Netlify/Vercel) — P
- [ ] 🚀 Telemetria leve opcional (erros, FPS) — P
- [ ] 🚀 Página/itch.io de divulgação — P
- [ ] 🚀 Playtest com grupo coop + coleta de feedback — M
- [ ] 🚀 Pipeline de assets documentado (MagicaVoxel → glb) — P

**DoD:** versão jogável publicada na web, com loop de feedback estabelecido.

---

## Caminho crítico (resumo)

```
M0 base → M1 vertical slice → M2 kit do Druida → M3 loot
                                      ↓
                         M4 mundo aberto → M5 coop
                                      ↓
              M6 inimigos/chefe → M7 história → M8 UI/save
                                      ↓
                        M9 polish → M10 release
```

**Primeiro marco "demonstrável" recomendado:** fim de **M2** (um Druida que vira lobo e dobra elementos numa arena) — já comunica a fantasia central.
**Primeiro marco que valida o conceito da aposta:** fim de **M5** (mundo aberto + coop local com o Druida).

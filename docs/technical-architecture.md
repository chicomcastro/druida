# 🏗️ Druida — Arquitetura Técnica

Complementa o [`game-design.md`](game-design.md). Define stack, estrutura de pastas e sistemas. A execução por fases está em [`backlog.md`](backlog.md).

---

## 1. Stack

| Camada | Escolha | Por quê |
|--------|---------|---------|
| Build / dev server | **Vite** | HMR rápido, zero-config, build otimizado. |
| Render 3D | **Three.js** | 3D no navegador maduro; câmera ortográfica = isométrico. |
| Linguagem | **JavaScript (ESM)** — TS recomendado | Pedido do projeto. Migração para **TypeScript** fortemente recomendada (ver §7). |
| Arquitetura de jogo | **ECS** (Entity-Component-System) próprio e enxuto | Mundo aberto com muitas entidades + data-driven. |
| Física/colisão | **Custom leve** (AABB + spatial hash) no MVP; avaliar **Rapier (wasm)** depois | Evita peso desnecessário cedo; Rapier se precisar de física rica. |
| Input | **Keyboard/Mouse + Gamepad API** | Coop local multi-jogador. |
| Áudio | **Web Audio API** (wrapper fino) ou **Howler.js** | SFX/música com pooling. |
| Estado/Save | **localStorage** (MVP) → **IndexedDB** | Saves de mundo aberto crescem. |
| Assets 3D | **MagicaVoxel → glTF (.glb)** | Pipeline voxel padrão, carregável pelo `GLTFLoader`. |
| Testes | **Vitest** | Integra com Vite; foco em sistemas puros (combate, loot, encantamentos). |
| Lint/format | **ESLint + Prettier** | Consistência. |

> **Sem framework de UI pesado** no canvas. HUD/menus em **DOM/CSS sobreposto** ao canvas (mais simples e acessível) ou via biblioteca leve; decidir em M8.

---

## 2. Câmera isométrica

- **`THREE.OrthographicCamera`** posicionada em ângulo fixo (ex.: rotação ~35.264° / 45° — projeção isométrica clássica), olhando para o centróide do grupo.
- **Zoom dinâmico** (ajuste do frustum ortográfico) para enquadrar todos os jogadores no coop.
- Mundo modelado em 3D real; a "iso" é só a câmera — permite verticalidade leve e iluminação 3D.

---

## 3. Arquitetura ECS (visão geral)

Entidades = ids. Componentes = dados puros. Sistemas = lógica que itera sobre componentes.

**Componentes (exemplos):** `Transform`, `Velocity`, `Renderable`, `Health`, `SapResource`, `PlayerControlled`, `InputState`, `Form` (forma animal atual), `AbilityLoadout`, `Cooldowns`, `Collider`, `Hitbox`, `Faction`, `AIState`, `LootTable`, `StatusEffects`, `Inventory`, `Equipment`.

**Sistemas (ordem aproximada por frame):**
1. `InputSystem` — lê teclado/gamepads → escreve `InputState` por jogador.
2. `PlayerControlSystem` — `InputState` → intenção (mover, atacar, trocar forma, usar artefato).
3. `AbilitySystem` — resolve magias/artefatos/formas (data-driven), gere cooldowns e Seiva.
4. `AISystem` — comportamento de inimigos/invocações.
5. `MovementSystem` + `PhysicsSystem` — integra velocidade, resolve colisão (AABB + spatial hash).
6. `CombatSystem` — hitboxes, dano, status elementais.
7. `StatusEffectSystem` — DoTs, slows, roots.
8. `LootSystem` — drops, salvage.
9. `WorldStreamingSystem` — carrega/descarrega chunks por proximidade.
10. `CameraSystem` — centróide + zoom dinâmico do grupo.
11. `RenderSyncSystem` — sincroniza `Transform` → objetos Three.js (com instancing).
12. `HudSystem` — atualiza overlay DOM por jogador.

> Loop com **timestep fixo** para simulação (determinístico) e render interpolado.

---

## 4. Design data-driven

Conteúdo definido em **JSON/JS data**, não hardcode — facilita balanceamento e modding interno.

- `data/abilities/*.json` — magias, artefatos, ataques de forma.
- `data/forms/*.json` — formas animais (stats, moveset, custo de Seiva).
- `data/items/*.json` — armas, armaduras, artefatos, raridades.
- `data/enchantments/*.json` — efeitos e curvas por nível.
- `data/enemies/*.json` — stats, IA, loot table.
- `data/biomes/*.json` — tabela de spawn, paleta, props.

---

## 5. Mundo aberto — streaming

- Mundo dividido em **chunks** (grid). Cada chunk: geometria (instanced/merged), props, spawns.
- **WorldStreamingSystem** carrega chunks num raio ao redor do centróide do grupo e descarrega os distantes.
- **InstancedMesh** para vegetação/props repetidos; **merge** de geometria estática por chunk.
- Spawns de inimigos/eventos por chunk, com persistência leve (estado purificado/limpo salvo).
- Geração: **handcrafted + parametrizada** (layout autoral por bioma com variação procedural de detalhe), não 100% procedural.

---

## 6. Estrutura de pastas

```
druida/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── docs/
│   ├── game-design.md
│   ├── technical-architecture.md
│   └── backlog.md
├── public/
│   └── assets/            # .glb, texturas, áudio (adicionados conforme M1+)
└── src/
    ├── main.js            # bootstrap: cria Game e inicia
    ├── core/
    │   ├── Game.js        # orquestra loop, cenas, sistemas
    │   ├── GameLoop.js     # timestep fixo + render interpolado
    │   ├── ecs/
    │   │   ├── World.js    # registro de entidades/componentes
    │   │   ├── System.js   # base de sistema
    │   │   └── components/ # definições de componentes
    │   ├── input/
    │   │   ├── InputManager.js  # teclado/mouse + Gamepad API
    │   │   └── PlayerBindings.js
    │   ├── render/
    │   │   ├── Renderer.js      # wrapper Three.js
    │   │   └── IsoCamera.js     # câmera ortográfica + zoom dinâmico
    │   └── assets/
    │       └── AssetLoader.js   # GLTF/áudio + cache
    ├── systems/           # InputSystem, MovementSystem, CombatSystem, ...
    ├── entities/          # factories (createPlayer, createEnemy, ...)
    ├── gameplay/
    │   ├── abilities/     # resolução de habilidades/formas
    │   ├── combat/        # dano, status
    │   ├── loot/          # drops, salvage, encantamentos
    │   └── progression/   # nível, pontos de encanto
    ├── world/
    │   ├── ChunkManager.js
    │   ├── WorldStreamingSystem.js
    │   └── biomes/
    ├── coop/
    │   └── CoopManager.js # join/leave, câmera de grupo, revive, escala
    ├── ui/                # HUD/menus (overlay DOM)
    ├── data/              # JSON data-driven (abilities, items, ...)
    └── utils/             # math, spatial hash, rng seedável, eventos
```

---

## 7. Recomendação: TypeScript

Para um projeto deste tamanho (muitos sistemas, dados estruturados, refactors frequentes), **TypeScript reduz bugs e melhora DX** significativamente. O scaffold inicial é JS (conforme pedido), mas há uma tarefa em M0 para **decidir/migrar para TS** antes do código crescer. Vite suporta TS sem config extra.

---

## 8. Performance (mundo aberto + 4 jogadores + WebGL)

- **InstancedMesh** para multidões e vegetação.
- **Frustum/occlusion culling** (Three.js já faz frustum; chunks distantes descarregados).
- **Object pooling** de inimigos, projéteis e partículas.
- **Spatial hash** para broadphase de colisão.
- **Timestep fixo** desacoplado do render; cap de entidades ativas por frame.
- Orçamento de draw calls monitorado desde M1 (stats.js).

---

## 9. Persistência / Save

- Estado serializável: jogador(es) (nível, equipamento, encantamentos, formas), progresso do mundo (regiões purificadas, fast-travel descobertos), inventário/baú compartilhado.
- MVP em `localStorage`; migrar para `IndexedDB` quando o save crescer.
- Versionamento do schema de save desde o início.

---

## 10. Build / Deploy

- `vite build` → estático. Deploy em qualquer host estático (GitHub Pages, Netlify, Vercel).
- Pipeline de CI (GitHub Actions): lint + testes + build em PR.

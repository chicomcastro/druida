# 📋 Druida — Backlog

Organizado em **épicos** e **milestones (M0–M10)**. Itens marcados `[x]` já
foram implementados; `[~]` parcial. Ver `docs/adr/` para as decisões.

> Estimativas relativas (P/M/G). Estado atualizado conforme o desenvolvimento
> autônomo avança.

**Legenda de épicos:** 🧱 Fundação · 🎮 Gameplay · 🌿 Druida · 💎 Loot/Progressão · 🗺️ Mundo · 👥 Coop · 🤖 Inimigos · 📖 História · 🖥️ UI/UX · 🔊 Áudio · 🚀 Infra

---

## 🟢 Progresso atual

- **M0 Fundação** — ✅ completo
- **M1 Vertical slice** — ✅ completo
- **M2 Kit do Druida** — ✅ completo (Seiva, formas, magias, artefatos, dodge)
- **M3 Loot/Progressão** — 🟡 ~70% (sistemas prontos; falta UI de inventário/encantamento e salvage)
- **M4 Mundo aberto** — 🟡 ~55% (zonas/biomas + pseudo-streaming + hub + santuários/marcos; falta POIs, masmorras, fast-travel, persistência)
- **M5 Coop local** — ✅ completo
- **M6 Inimigos/IA/Chefe** — ✅ ~90% (5 inimigos + invocações + mini-chefe + chefe com 3 fases; falta object pooling)
- **M7 História** — ✅ completo (campanha + gating de formas + chefe; eventos dinâmicos + lore/codex)
- **M8 UI/Save** — ✅ ~80% (menu principal, pausa, inventário/equipamento/encantamento, salvage, minimapa, save/continuar; falta tela de mapa-mundi e rebind)
- **M9 Áudio/Polish** — 🟡 ~50% (áudio procedural + screen shake + VFX; falta partículas, profiling/spatial hash, balanceamento fino)
- **M10 Release** — 🟡 deploy GitHub Pages configurado (falta playtest/telemetria)

Jogo já **rodável e com começo/meio/fim**: `npm install && npm run dev`.

---

## M0 — Fundação técnica ✅
- [x] 🧱 Scaffold Vite + Three.js rodando
- [x] 🧱 Migração para **TypeScript** (config lenient + typecheck no CI) — ADR 0014
- [x] 🧱 ESLint + Prettier
- [x] 🧱 Vitest configurado + suíte de testes (`tests/core.test.js`, 10 testes)
- [x] 🧱 `GameLoop` com timestep fixo + render interpolado
- [x] 🧱 ECS mínimo (`World`, componentes, query, event bus) — ADR 0002
- [x] 🧱 `Renderer` + `IsoCamera` (ortográfica isométrica)
- [x] 🚀 GitHub Actions: lint + test + build (`.github/workflows/ci.yml`)
- [x] 🧱 Estrutura de pastas

## M1 — Vertical slice jogável ✅
- [x] 🎮 `InputManager` (teclado/mouse) → Intent
- [x] 🎮 Controle + movimento 360°
- [x] 🎮 Colisão por círculos (push-out)
- [x] 🌿 Personagem voxel placeholder
- [x] 🎮 Ataque básico com feedback
- [x] 🤖 Inimigo com IA (perseguir + atacar) e vida
- [x] 🎮 Dano e morte + drop
- [x] 🖥️ HUD de vida
- [x] 🎮 Câmera seguindo o jogador

## M2 — Kit do Druida ✅
- [x] 🌿 Recurso **Seiva** (regen + gasto + drena em forma)
- [x] 🌿 Habilidades **data-driven** (`ABILITIES` + `castAbility`) — ADR 0005
- [x] 🌿 Magias elementais (raiz, chama, gelo, +) com status
- [x] 🌿 Sistema de **Formas** com custo de Seiva — ADR 0004
- [x] 🌿 Formas jogáveis: Lobo, Urso, Corvo, Sapo
- [x] 🌿 Status elementais (queimar, congelar, enraizar, atordoar, veneno)
- [x] 🌿 **Artefatos** (3 slots, cooldown) + 8 habilidades de artefato
- [x] 🎮 Dodge/roll com i-frames
- [x] 🖥️ HUD: Seiva, artefatos/cooldown, forma atual

## M3 — Loot, itens e encantamentos 🟡
- [x] 💎 `loot.js`: armas/armaduras/artefatos + raridades — ADR 0006
- [x] 💎 `LootSystem` (drops, pickup com ímã, raridade ponderada)
- [x] 💎 Inventário e equipamento (auto-equip em slots vazios)
- [x] 💎 Stats derivados do equipamento (`applyEquipment`)
- [x] 💎 Encantamentos (dados + funcionais: Ferocidade, Vigor, Fotossíntese, Metamorfo)
- [ ] 🖥️ Tela de inventário/equipamento + tela de encantamento (gastar pontos manualmente)
- [ ] 💎 Salvage com devolução de pontos (helper existe; falta UI)

## M4 — Mundo aberto 🟡
- [x] 🗺️ Zonas de bioma radiais + pseudo-streaming de props (`WorldManager`) — ADR 0008
- [x] 🗺️ `biomes.js` + 5 biomas com clima/spawn
- [x] 🗺️ Hub central (Carvalho-Mãe) como zona segura
- [x] 🗺️ Props via InstancedMesh (otimização) — ADR 0015
- [x] 🗺️ Mercador + baú compartilhado no hub — ADR 0016
- [x] 🗺️ Fast travel (mapa-mundi + recall ao hub) + fog of war
- [x] 🗺️ POIs: acampamentos corrompidos (escala por anel, recompensa) — ADR 0017
- [ ] 🗺️ POIs: masmorras instanciadas dedicadas
- [x] 🗺️ Recursos colhíveis (fragmentos de essência) — ADR 0017
- [x] 🗺️ Persistência de estado do mundo (fog, baú, acampamentos purificados)

## M5 — Coop local same-screen ✅
- [x] 👥 Gamepad API: "pressione para entrar" (P1–P4)
- [x] 👥 Bindings por jogador (teclado P1, gamepads P2–P4)
- [x] 👥 `coopSystem`: spawn de jogadores adicionais
- [x] 👥 Câmera de grupo: centróide + zoom dinâmico + clamp — ADR 0003
- [x] 👥 Escala de dificuldade por nº de jogadores
- [x] 👥 Revive de aliado caído + wipe/checkpoint
- [x] 👥 Loot (instanciado, com ímã ao jogador mais próximo)
- [x] 🖥️ HUD multi-jogador com cor de identidade

## M6 — Inimigos, IA e chefe 🟡
- [x] 🤖 5 inimigos com comportamentos (melee/ranged/exploder/summoner) — ADR 0007
- [x] 🤖 Elites (Casca Oca, Xamã invocador)
- [x] 🤖 IA por estados (perseguir, manter distância, recuar, explodir)
- [x] 🌿 Invocações do Druida (matilha/totem) como aliados IA
- [ ] 🤖 Object pooling para hordas
- [x] 🤖 Mini-chefe de bioma (Árvore-Carniça) — golpe em área + raiz
- [x] 🤖 Chefe O Apodrecedor com 3 fases (slam telegrafado, invocações, enrage)

## M7 — História e campanha ✅ (narrativa — ADR 0010)
- [x] 📖 Sistema de missões/objetivos (StoryManager, event-driven)
- [x] 📖 Gating: Formas Ancestrais liberadas em santuários por passo
- [x] 📖 NPC no hub (Guardiã) + diálogos
- [x] 📖 Arco principal: purificar Clareira → santuários → chefes → vitória
- [x] 📖 HUD: rastreador de objetivo, prompt de interação, diálogo, tela de vitória
- [x] 📖 Eventos dinâmicos por região (Surto de Corrupção, Espírito do Tesouro) — ADR 0018
- [x] 📖 Lore/colecionáveis (codex, persistido) — ADR 0020

## M8 — UI/UX, menus e save 🟡
- [x] 🖥️ Menu principal (novo/continuar)
- [x] 🖥️ Pause + opções (som)
- [x] 🖥️ Minimapa/radar (hub, jogadores, inimigos, santuários, chefe)
- [x] 🖥️ Inventário/equipamento + tela de encantamento (gastar pontos) + salvage
- [x] 💾 Save/load (localStorage) com schema versionado
- [x] 🖥️ Checkpoint/wipe (revive de grupo)
- [x] 🖥️ Tela de mapa-mundi navegável (fog of war) + fast-travel a marcos descobertos
- [x] 🖥️ Tutoriais/onboarding contextual (dicas pontuais) — ADR 0019
- [ ] 🖥️ Rebind de controles · migração para IndexedDB

## M9 — Áudio, polish e performance 🟡
- [x] 🔊 Áudio procedural (SFX + drone ambiente por bioma) — ADR 0011
- [x] 🎮 Game feel: screen shake + VFX (anéis, arcos, telegrafos)
- [x] 🐛 Liberar meshes ao destruir entidades (evita vazamento de Object3D)
- [x] 🎮 Hit-stop e partículas
- [x] 🚀 Spatial hash para broadphase (colisão + projéteis) — ADR 0015
- [x] 🚀 InstancedMesh para props — ADR 0015
- [ ] 🚀 Object pooling (projéteis/inimigos) + profiling
- [ ] 🎮 Balanceamento fino

## M10 — Release / Infra 🟡
- [x] 🚀 Deploy estático (workflow GitHub Pages) + fast-travel ao hub (QoL)
- [ ] 🚀 Telemetria leve opcional
- [ ] 🚀 Playtest coop + feedback
- [ ] 🚀 Pipeline de assets (MagicaVoxel → glb)

---

## Caminho crítico (resumo)

```
M0 ✅ → M1 ✅ → M2 ✅ → M3 🟡
                 ↓
        M4 🟡 → M5 ✅
                 ↓
   M6 🟡 → M7 → M8 → M9 → M10
```

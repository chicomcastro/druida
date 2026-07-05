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
- **M3 Loot/Progressão** — ✅ completo (loot/raridades/encantamentos, inventário/equip/encantar, salvage)
- **M4 Mundo aberto** — 🟡 ~55% (zonas/biomas + pseudo-streaming + hub + santuários/marcos; falta POIs, masmorras, fast-travel, persistência)
- **M5 Coop local** — ✅ completo
- **M6 Inimigos/IA/Chefe** — ✅ ~90% (5 inimigos + invocações + mini-chefe + chefe com 3 fases; falta object pooling)
- **M7 História** — ✅ completo (campanha + gating de formas + chefe; eventos dinâmicos + lore/codex)
- **M8 UI/Save** — ✅ completo (menus, inventário/encantamento, minimapa, mapa-mundi, onboarding, rebind, save em IndexedDB)
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

## M3 — Loot, itens e encantamentos ✅
- [x] 💎 `loot.js`: armas/armaduras/artefatos + raridades — ADR 0006
- [x] 💎 `LootSystem` (drops, pickup com ímã, raridade ponderada)
- [x] 💎 Inventário e equipamento (auto-equip em slots vazios)
- [x] 💎 Stats derivados do equipamento (`applyEquipment`)
- [x] 💎 Encantamentos (dados + funcionais: Ferocidade, Vigor, Fotossíntese, Metamorfo)
- [x] 🖥️ Tela de inventário/equipamento + tela de encantamento (gastar pontos) — PR #7
- [x] 💎 Salvage (desmonta itens por essência na tela de inventário)

## M4 — Mundo aberto 🟡
- [x] 🗺️ Zonas de bioma radiais + pseudo-streaming de props (`WorldManager`) — ADR 0008
- [x] 🗺️ `biomes.js` + 5 biomas com clima/spawn
- [x] 🗺️ Hub central (Carvalho-Mãe) como zona segura
- [x] 🗺️ Props via InstancedMesh (otimização) — ADR 0015
- [x] 🗺️ Mercador + baú compartilhado no hub — ADR 0016
- [x] 🗺️ Fast travel (mapa-mundi + recall ao hub) + fog of war
- [x] 🗺️ POIs: acampamentos corrompidos (escala por anel, recompensa) — ADR 0017
- [x] 🗺️ POIs: masmorras instanciadas (arena, ondas, recompensa Única) — ADR 0022
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

## M8 — UI/UX, menus e save ✅
- [x] 🖥️ Menu principal (novo/continuar)
- [x] 🖥️ Pause + opções (som)
- [x] 🖥️ Minimapa/radar (hub, jogadores, inimigos, santuários, chefe)
- [x] 🖥️ Inventário/equipamento + tela de encantamento (gastar pontos) + salvage
- [x] 💾 Save/load com schema versionado (IndexedDB + fallback localStorage) — ADR 0024
- [x] 💾 Autosave (marcos + flush ao sair da aba) + posição do grupo persistida — ADR 0024 (adendo)
- [x] 🖥️ Checkpoint/wipe (revive de grupo)
- [x] 🖥️ Tela de mapa-mundi navegável (fog of war) + fast-travel a marcos descobertos
- [x] 🖥️ Tutoriais/onboarding contextual (dicas pontuais) — ADR 0019
- [x] 🖥️ Rebind de controles (P1, persistido) — ADR 0023
- [x] 🖥️ Migração do save para IndexedDB — ADR 0024

## M9 — Áudio, polish e performance 🟡
- [x] 🔊 Áudio procedural (SFX + drone ambiente por bioma) — ADR 0011
- [x] 🎮 Game feel: screen shake + VFX (anéis, arcos, telegrafos)
- [x] 🐛 Liberar meshes ao destruir entidades (evita vazamento de Object3D)
- [x] 🎮 Hit-stop e partículas
- [x] 🚀 Spatial hash para broadphase (colisão + projéteis) — ADR 0015
- [x] 🚀 InstancedMesh para props — ADR 0015
- [x] 🚀 Object pooling de partículas — ADR 0025
- [x] 🚀 Geometria/material compartilhados em projéteis/loot — ADR 0026 (−52% alloc, −83% CPU)
- [ ] 🚀 Object pooling de projéteis/inimigos (entidades ECS) + profiling
- [x] 🧱 Endurecer tipos TS (índice `any` removido de todas as classes) — ADR 0021
- [x] 🧱 Modelos de domínio centralizados em `src/types.ts` (Item/Save/Form/componentes) — ADR 0032
- [x] 🎮 Foco em combate melee: ataque-base corpo-a-corpo, armas melee/ranged, ranged inimigo mais tardio — ADR 0035
- [x] 🎨 Pipeline de modelos .glb com fallback procedural — ADR 0036
- [x] 🎮 VFX: feedback de melee/elemental, status visíveis no inimigo, trilhas/morte — ADR 0037
- [x] 🎨 Modelos voxel data-driven (MC Dungeons) + vitrine/backoffice — ADR 0038
- [x] 🎮 Animação procedural por partes (idle/andar/atacar) — ADR 0039
- [x] 🎮 Reações de hit/morte + investida dos inimigos — ADR 0040
- [ ] 🎮 Balanceamento fino

## M10 — Release / Infra 🟡
- [x] 🚀 Deploy estático (workflow GitHub Pages) + fast-travel ao hub (QoL)
- [x] 🚀 CI: cobertura com comentário fixo no PR — ADR 0027
- [x] 🚀 CI: e2e Cypress com evidência visual (capturas inline no PR) — ADR 0028
- [x] 🚀 CI: guarda de tamanho de bundle (size-limit) + badges — ADR 0029
- [x] 🚀 CI: Dependabot (npm + github-actions, agrupado)
- [x] 🚀 CI: Lighthouse (orçamento de performance, warn) — ADR 0030
- [x] 🚀 CI: delta de cobertura vs main + comentário de perf do Lighthouse
- [x] 🧪 Testes dos sistemas: cobertura escopada ~94% (threshold 80%) — ADR 0031
- [x] 🐛 Corrige bug latente de projéteis (createProjectile recebia game)
- [x] 🚀 Telemetria leve opcional (local, exportável) — ADR 0051
- [ ] 🚀 Playtest coop + feedback
- [x] 🚀 Pipeline de assets documentado (MagicaVoxel → glb) — `docs/asset-pipeline.md`

---

## M11 — Encanto & Engajamento 🟡

Pacote de acionáveis para deixar o jogo mais encantador/engajante/divertido
(um ADR por item):

- [x] 🌿 Purificação visível do mundo (regiões curam, acampamentos florescem) — ADR 0044
- [x] 🤖 Encontros: packs compostos + elites com afixos — ADR 0045
- [x] 🔊 Música procedural por bioma + intensidade de combate — ADR 0046
- [x] 📖 Missões locais por vila + mercador regional — ADR 0047
- [x] 🗺️ Masmorras temáticas por bioma (mecânica + mini-chefe) — ADR 0048
- [x] 🗺️ Ciclo dia/noite + clima por bioma — ADR 0049
- [x] 🌿 Dons dos santuários (escolha de build) — ADR 0050
- [x] 🚀 Telemetria leve opcional + notas de balance — ADR 0051

---

## M12 — Cara de jogo profissional 🟡

Pacote de polish visual/UX (feedback de playtest em tablet):

- [x] 🐛 Nitidez: fix do blur de inicialização (resize/DPR) — ADR 0052
- [x] 🎮 Tablet: controles touch + gamepad no P1 — ADR 0053
- [x] 🎨 Render pro: pós-processamento (bloom/vignette) + céu — ADR 0054
- [x] 🎨 Mundo vivo: modelos por bioma, vento, fumaça, moradores passeando — ADR 0055
- [x] 🖥️ UI profissional: fonte própria, HUD/menus refinados, números de dano — ADR 0056

---

## M13 — Beleza & segurança 🟡

Pacote de revisão visual (feedback de playtest 2) + higiene de dependências:

- [x] 🚀 Zerar vulnerabilidades do Dependabot (vite 7, vitest 4, cypress 15) — ADR 0057
- [x] 🎨 Iluminação diurna legível + sombras visíveis (sol dominante) — ADR 0058
- [x] 🎨 Animação de locomoção revisada (andar natural) — ADR 0059
- [x] 🎨 Modelos das casas/construções revisados — ADR 0060
- [x] 🎨 VFX de combate e polish visual — ADR 0061

---

## M14 — Direção de arte Minecraft Dungeons ✅

Pivot de direção de arte (playtest 3, com referências visuais). Análise e
plano completo em [`art-direction-mcd.md`](art-direction-mcd.md).

- [x] 🎨 M14.1 Spike: atlas pixel-art procedural (NearestFilter) no chão, props e construções — ADR 0062
- [x] 🎨 M14.2 Chão de blocos: grade de topos de bloco por bioma (InstancedMesh + atlas) — ADR 0063
- [x] 🎨 M14.3 Elevação decorativa: falésias nas bordas de bioma + veios de lava no Coração — ADR 0064 (ruínas de POI → M14.6)
- [x] 🎨 M14.4 Luz dramática: pool de PointLights (flicker + culling), masmorras no mood MCD — ADR 0065
- [x] 🎨 M14.5 Personagens MCD: proporção cabeçuda, trama de tecido, losango de identidade — ADR 0066
- [x] 🎨 M14.6 Polish: ruínas nos POIs, grade recalibrado (rim light dispensado) — ADR 0067

---

## M15 — Playtest 3: UI, câmera e voz ✅

Feedback jogando no celular (prints) + refinamentos aprovados:

- [x] 🐛 M15.1 UI mobile: sem dicas de teclado no touch, sem sobreposições (retrato/paisagem) — ADR 0068
- [x] 🎨 M15.2 Texturas faltantes nos props (banca, caminho de pedras, menires, cercas, baú, santuários…) — aplica ADR 0062 em 100% dos props
- [x] 🎨 M15.3 Câmera mais perto (frustum 14→11, min 9) estilo MCD — ADR 0069
- [x] 📖 M15.4 Copy com voz: textos divertidos e intencionais + dicas por dispositivo — ADR 0070
- [x] 🖥️ M15.5 HUD com layout MCD: orbe de vida + coluna de Seiva + slots — ADR 0071
- [x] 🖥️ M15.6 Inventário e mercador com grade de slots RPG + tooltip de comparação — ADR 0072
- [x] 🎨 M15.7 Overworld dramático (nublado MCD) sem perder legibilidade — ADR 0073
- [x] 🎨 M15.8 Tendas do Degelo em blocos + lagoa do Vau em blocos de água — ADR 0073

---

## M19 — Playtest 6: proporção, conexão e conteúdo das vilas ✅

Feedback: portas menores que o avatar encolhem as construções; portas sem
caminho; vilas dos outros biomas precisam de estrutura e conteúdo.

- [x] 📐 M19.1 Proporção herói/porta: portas ≥2.1u e pé-direito 3u em TODAS as construções (casas, cabanas, tendas, palafitas) — ADR 0082
- [x] 🛣️ M19.2 Toda porta liga numa rua: espigões automáticos no hub, rotações corrigidas (palafitas/cabanas), rede de píer no Vau — ADR 0083
- [x] 🏗️ M19.3 Vilas com estrutura e conteúdo: torre de vigia, píer, muro de gelo, +1 construção por vila e props de rua (barris, lenha, varais) — ADR 0084

---

## M18 — Playtest 5: vilas vivas e identidade dos personagens ✅

Feedback: mercador só faltou textura; avatares/NPCs sem textura e todos
iguais; vilas pequenas (mais casas, ruas, praça, NPCs); modelos fora das
arestas do chão.

- [x] 🎨 M18.1 Arestas no grid: pegadas inteiras + snap por paridade (casas 5×4, cabanas 4×3, tendas, palafitas, banca, menires, santuários) — ADR 0079
- [x] 🏘️ M18.2 Vilas maiores: 9 casas variadas (sobrado/anexos), tendas 5-3-1, cabanas 6×4, ruas de laje, praça com postes, +9 moradores — ADR 0080
- [x] 🧙 M18.3 Personagens com trama visível e variedade (tons, capuz/cabelo, avental/mochila) + mercadorias texturizadas — ADR 0081

---

## M17 — Feedback: degraus e escala das casas ✅

- [x] 🎨 M17.1 Telhados de duas águas em degraus (casas do hub + cabanas dos lenhadores) — ADR 0078
- [x] 🎨 M17.2 Casas do hub maiores (escala MCD), porta alta, colliders ajustados — ADR 0078
- [x] 🎨 M17.3 Partículas e drops cúbicos: clarão de impacto e orbes de projétil/essência — ADR 0078

---

## M16 — Playtest 4: escala MCD e voxelização total ✅

Insight do playtest (print de referência): no MCD o cenário é GRANDE em
relação ao herói — postes ~2.5× a altura do personagem, a banca do mercador
é uma estrutura inteira com toldo — e **tudo** é cubo alinhado ao grid, sem
rotações arbitrárias. A sensação de "câmera longe" era na verdade cenário
pequeno.

- [x] 🎨 M16.1 Árvores, pinheiros e rochas em blocos (copas em cluster de cubos, Carvalho-Mãe voxel) — ADR 0074
- [x] 🎨 M16.2 Escala MCD: postes jumbo, banca do mercador com toldo grande, props do cenário maiores — ADR 0075
- [x] 🎨 M16.3 Alinhamento voxel: construções e props sempre em rotações de 90°, posições no grid — ADR 0076
- [x] 🎨 M16.4 Sweep final de sólidos: cilindros/cones/esferas restantes viram blocos (serraria, paliçada, braseiros, santuários, POIs, fogo/fumaça) — ADR 0077

---

## Caminho crítico (resumo)

```
M0 ✅ → M1 ✅ → M2 ✅ → M3 🟡
                 ↓
        M4 🟡 → M5 ✅
                 ↓
   M6 🟡 → M7 → M8 → M9 → M10
```

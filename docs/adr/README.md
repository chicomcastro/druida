# Architecture Decision Records (ADRs)

Registro das decisões de arquitetura/design tomadas durante o desenvolvimento
autônomo do Druida. Cada ADR é curto: contexto, decisão e consequências.

| # | Título | Status |
|---|--------|--------|
| [0001](0001-stack-perspectiva-coop.md) | Stack, perspectiva e modelo de coop | Aceito |
| [0002](0002-ecs.md) | Arquitetura ECS própria e enxuta | Aceito |
| [0003](0003-coop-camera.md) | Câmera de grupo same-screen | Aceito |
| [0004](0004-druid-fantasy.md) | Fantasia do Druida: Seiva + formas + elementos | Aceito |
| [0005](0005-ability-system.md) | Sistema de habilidades data-driven | Aceito |
| [0006](0006-loot-enchant.md) | Loot, raridades e encantamentos | Aceito |
| [0007](0007-content-data.md) | Conteúdo data-driven (inimigos/biomas) | Aceito |
| [0008](0008-open-world.md) | Mundo aberto: zonas radiais + pseudo-streaming | Aceito |
| [0009](0009-ui-dom-overlay.md) | HUD como overlay DOM | Aceito |
| [0010](0010-narrativa-campanha.md) | Narrativa e estrutura da campanha | Aceito |
| [0011](0011-audio-procedural.md) | Áudio procedural (Web Audio) | Aceito |
| [0012](0012-balance.md) | Balanceamento centralizado | Aceito |
| [0013](0013-world-map.md) | Mapa-mundi com fog of war e fast-travel | Aceito |
| [0014](0014-typescript.md) | Migração para TypeScript | Aceito |
| [0015](0015-performance.md) | Performance: spatial hash + InstancedMesh | Aceito |
| [0016](0016-hub-economy.md) | Economia do hub: mercador e baú | Aceito |
| [0017](0017-pois-collectibles.md) | POIs (acampamentos) e colhíveis | Aceito |
| [0018](0018-dynamic-events.md) | Eventos dinâmicos por região | Aceito |
| [0019](0019-onboarding.md) | Onboarding por dicas contextuais | Aceito |
| [0020](0020-lore-codex.md) | Colecionáveis de lore (codex) | Aceito |
| [0021](0021-type-hardening.md) | Endurecimento dos tipos | Aceito |
| [0022](0022-dungeons.md) | Masmorras instanciadas | Aceito |
| [0023](0023-rebind.md) | Rebind de controles (P1) | Aceito |
| [0024](0024-indexeddb-save.md) | Save em IndexedDB (com fallback) | Aceito |
| [0025](0025-particle-pool.md) | Object pooling de partículas | Aceito |
| [0026](0026-shared-orb-resources.md) | Geometria/material compartilhados em orbes | Aceito |
| [0027](0027-ci-coverage.md) | Cobertura no CI com comentário fixo no PR | Aceito |
| [0028](0028-e2e-cypress.md) | E2E com Cypress + evidência visual no PR | Aceito |
| [0029](0029-bundle-size-guard.md) | Guarda de tamanho de bundle no CI | Aceito |
| [0030](0030-lighthouse-ci.md) | Lighthouse CI (orçamento de performance) | Aceito |
| [0031](0031-coverage-scope-threshold.md) | Escopo e threshold de cobertura (>80%) | Aceito |
| [0032](0032-domain-model-types.md) | Modelos de domínio centralizados (`src/types.ts`) | Aceito |
| [0033](0033-game-orchestrator-decomposition.md) | Decomposição do orquestrador `Game` | Aceito |
| [0034](0034-movement-facing.md) | Orientação pela direção do movimento | Aceito |
| [0035](0035-melee-focus.md) | Foco em melee; ranged como exceção | Aceito |
| [0036](0036-glb-model-pipeline.md) | Pipeline de modelos .glb (fallback procedural) | Aceito |
| [0037](0037-vfx-feedback.md) | VFX: feedback de melee, status visíveis e juice | Aceito |
| [0038](0038-voxel-models-showcase.md) | Modelos voxel data-driven + vitrine (backoffice) | Aceito |
| [0039](0039-procedural-animation.md) | Animação procedural por partes | Aceito |
| [0040](0040-hit-death-reactions.md) | Reações de hit/morte e investida dos inimigos | Aceito |
| [0041](0041-assentamentos-tematicos.md) | Assentamentos temáticos: uma cidade-vila por região | Aceito |
| [0042](0042-atmosfera-visual.md) | Atmosfera visual: luz por bioma, sol móvel e partículas | Aceito |
| [0043](0043-npcs-voxel.md) | NPCs em modelos voxel (aldeões, Guardiã, mercador) | Aceito |
| [0044](0044-purificacao-visivel.md) | Purificação visível do mundo | Aceito |
| [0045](0045-encontros-packs-elites.md) | Encontros: packs compostos + elites com afixo | Aceito |
| [0046](0046-musica-procedural.md) | Música procedural por bioma + intensidade de combate | Aceito |
| [0047](0047-missoes-de-vila.md) | Missões locais por vila + mercador regional | Aceito |

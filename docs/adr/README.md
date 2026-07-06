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
| [0048](0048-masmorras-tematicas.md) | Masmorras temáticas por bioma | Aceito |
| [0049](0049-dia-noite-clima.md) | Ciclo dia/noite + clima por bioma | Aceito |
| [0050](0050-dons-santuarios.md) | Dons dos Santuários (escolhas de build) | Aceito |
| [0051](0051-telemetria-local.md) | Telemetria leve local + notas de balanceamento | Aceito |
| [0052](0052-nitidez-resize.md) | Nitidez: dimensionamento correto do canvas | Aceito |
| [0053](0053-tablet-touch-gamepad.md) | Tablet: controles touch + gamepad dedicado no P1 | Aceito |
| [0054](0054-pos-processamento.md) | Render profissional: pós-processamento + céu | Aceito |
| [0055](0055-mundo-vivo.md) | Mundo vivo: vento, espécies, fumaça e moradores | Aceito |
| [0056](0056-ui-profissional.md) | UI profissional: tipografia, HUD refinado e números de dano | Aceito |
| [0057](0057-upgrade-deps-seguranca.md) | Upgrade de toolchain por segurança (vite 7, vitest 4, cypress 15) | Aceito |
| [0058](0058-iluminacao-diurna-sombras.md) | Iluminação diurna legível: sol dominante e sombras visíveis | Aceito |
| [0059](0059-locomocao-natural.md) | Locomoção natural: easing de amplitude e contrapeso corporal | Aceito |
| [0060](0060-casas-legiveis.md) | Construções legíveis: casas de duas águas por tema | Aceito |
| [0061](0061-vfx-impacto.md) | VFX de impacto: clarão aditivo, varredura e onda de choque | Aceito |
| [0062](0062-pixel-art-procedural.md) | Texturas pixel-art procedurais (spike M14.1 do estilo MCD) | Aceito |
| [0063](0063-chao-de-blocos.md) | Chão de blocos: grade instanciada que segue o grupo (M14.2) | Aceito |
| [0064](0064-elevacao-decorativa.md) | Elevação decorativa: falésias nas bordas e lava no Coração (M14.3) | Aceito |
| [0065](0065-luz-dramatica.md) | Luz dramática: pool de luzes pontuais e masmorras MCD (M14.4) | Aceito |
| [0066](0066-personagens-mcd.md) | Personagens MCD: proporção, trama de tecido e losango (M14.5) | Aceito |
| [0067](0067-polish-mcd.md) | Polish final do estilo MCD: ruínas de POI e grade recalibrado (M14.6) | Aceito |
| [0068](0068-mobile-ui.md) | UI mobile: sem teclado, sem sobreposição (M15.1) | Aceito |
| [0069](0069-camera-mcd.md) | Câmera mais perto, estilo MCD (M15.3) | Aceito |
| [0070](0070-copy-com-voz.md) | Copy com voz de mundo e dicas por dispositivo (M15.4) | Aceito |
| [0071](0071-hud-mcd.md) | HUD no layout MCD: orbe de vida e slots (M15.5) | Aceito |
| [0072](0072-inventario-slots.md) | Inventário e mercador em grade de slots RPG (M15.6) | Aceito |
| [0073](0073-nublado-e-agua-em-blocos.md) | Overworld nublado + água e tendas em blocos (M15.7–8) | Aceito |
| [0074](0074-voxelizacao-arvores-rochas.md) | Árvores, pinheiros e rochas em blocos (M16.1) | Aceito |
| [0075](0075-escala-mcd-cenario.md) | Escala MCD: postes jumbo e banca-estrutura (M16.2) | Aceito |
| [0076](0076-alinhamento-voxel.md) | Alinhamento voxel: rotações só em 90° (M16.3) | Aceito |
| [0077](0077-sweep-voxel-final.md) | Sweep voxel final: últimos sólidos viram blocos (M16.4) | Aceito |
| [0078](0078-telhados-degraus-casas-maiores.md) | Telhados em degraus, casas maiores e partículas cúbicas (M17) | Aceito |
| [0079](0079-arestas-no-grid.md) | Arestas das construções nas linhas do grid (M18.1) | Aceito |
| [0080](0080-vilas-vivas.md) | Vilas vivas: casas com anexos, ruas e praças (M18.2) | Aceito |
| [0081](0081-personagens-variados.md) | Personagens com trama visível e variedade (M18.3) | Aceito |
| [0082](0082-proporcao-heroi-porta.md) | Proporção herói/porta: portas 2.5u, pé-direito 3u (M19.1) | Aceito |
| [0083](0083-portas-ligadas-as-ruas.md) | Toda porta liga numa rua (M19.2) | Aceito |
| [0084](0084-vilas-com-conteudo.md) | Vilas com conteúdo: assinaturas e props de rua (M19.3) | Aceito |
| [0085](0085-validador-de-pegadas.md) | Validador de sobreposição de pegadas (M20.1) | Aceito |
| [0087](0087-armadura-anatomica.md) | Armadura anatômica em 4 peças (E1) | Aceito |
| [0088](0088-modificadores-e-familias.md) | Modificadores de raridade + famílias de arma (E1) | Aceito |
| [0089](0089-consumiveis.md) | Consumíveis: poções de efeito instantâneo (E1) | Aceito |
| [0090](0090-ui-mcd-icones-paperdoll.md) | UI MCD 2.0: ícones, paperdoll e grade 5×10 (E2) | Aceito |
| [0091](0091-hotbar-pocoes.md) | Cinto de poções + cooldown visual (E2) | Aceito |
| [0092](0092-combo-por-timing.md) | Combate: combo por timing + game feel (E3) | Aceito |
| [0093](0093-especializacao-skill-tree.md) | Especialização & árvore de talentos (E4) | Aceito |
| [0094](0094-interiores-das-casas.md) | Interiores acessíveis das casas (E5.1) | Aceito |
| [0095](0095-rixa-das-familias.md) | Camada social: rixa das famílias (E5.2) | Aceito |
| [0096](0096-side-quests-triggers.md) | Side quests & eventos de mid-game (E6) | Aceito |
| [0097](0097-vilas-2-4-vivas.md) | Réplica: vilas 2–4 vivas (E7) | Aceito |
| [0098](0098-fauna-ambiente.md) | Mundo vivo: fauna ambiente por bioma (E8.1) | Aceito |
| [0099](0099-hazards-overworld.md) | Mundo vivo: perigos ambientais por bioma (E8.2) | Aceito |
| [0100](0100-novos-inimigos.md) | Mundo vivo: novos inimigos (E8.3) | Aceito |
| [0101](0101-bosses-de-bioma.md) | Mundo vivo: chefes de bioma (E8.4) | Aceito |
| [0102](0102-telemetria-primeira-hora.md) | Economia & primeira hora: telemetria do funil (E9) | Aceito |
| [0103](0103-modelos-rostos-silhuetas.md) | Polish de arte: rostos dos aldeões + silhuetas próprias | Aceito |
| [0104](0104-interiores-mobiliados-loja.md) | Polish: interiores mobiliados + loja com mais itens | Aceito |
| [0105](0105-brilho-interiores-rosto-player-wiki.md) | Interiores mais claros, rosto do Druida e wiki viva | Aceito |
| [0106](0106-santuario-do-lobo.md) | Santuário do Lobo: a primeira Forma Ancestral | Aceito |
| [0107](0107-rixas-vilas-2-4.md) | Rixa das famílias nas vilas 2–4 | Aceito |
| [0108](0108-reputacao-por-vila.md) | Reputação por vila (desconto por ajudar) | Aceito |
| [0109](0109-mundo-organico.md) | Mundo orgânico (biomas não-circulares) | Aceito |
| [0110](0110-progressao-aberta-level-scaling.md) | Progressão aberta: level-scaling + marcos nas regiões | Aceito |
| [0111](0111-clareira-em-torno-da-arvore.md) | Clareira em torno da Carvalho-Mãe (2 anéis + via em anel) | Aceito |
| [0112](0112-wiki-ilustrada.md) | Wiki ilustrada (capturas do jogo) | Aceito |
| [0113](0113-colisores-cenario-banca.md) | Objetos de cenário sólidos + banca fora das ruas | Aceito |
| [0114](0114-descricoes-campanha.md) | Descrições da campanha no HUD | Aceito |
| [0086](0086-janelas.md) | Janelas com moldura à altura do olho (M20.2) | Aceito |

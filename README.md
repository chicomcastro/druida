# 🌿 Druida

> Um action-RPG / dungeon-crawler **de mundo aberto** inspirado amplamente em **Minecraft Dungeons**, com uma grande virada de conceito: **um jogo por classe**. Este primeiro jogo é sobre o **Druida** — natureza, magia elemental e transformação em animais.

Web (JavaScript + Three.js), visual **isométrico 2.5D voxel**, **coop local same-screen**.

---

## 🎯 O conceito

O Minecraft Dungeons é um dungeon-crawler linear baseado em missões. **Druida** mantém praticamente todas as mecânicas (combate hack-and-slash top-down, loot, encantamentos, artefatos, coop), mas troca a estrutura de missões por um **mundo aberto contíguo e explorável**, com a campanha/história acontecendo *dentro* desse mundo.

A aposta de design maior: **cada jogo da série gira em torno de uma única classe por vez.** Isso permite mergulhar fundo na fantasia daquela classe em vez de espalhar o orçamento entre várias. O primeiro é o **Druida**.

## 📚 Documentação

| Documento | Conteúdo |
|-----------|----------|
| [`docs/game-design.md`](docs/game-design.md) | Pilares, classe Druida, mundo aberto, combate, loot, progressão, coop |
| [`docs/technical-architecture.md`](docs/technical-architecture.md) | Stack, estrutura de pastas, sistemas (ECS), pipeline de assets, performance |
| [`docs/backlog.md`](docs/backlog.md) | Épicos, milestones (M0–M10) e tarefas acionáveis |

## 🚀 Começando

```bash
npm install
npm run dev      # abre o jogo no navegador
npm test         # roda a suíte de testes (Vitest)
npm run build    # build de produção
```

### 🎮 Controles (P1 teclado/mouse)

| Ação | Tecla |
|------|-------|
| Mover | `WASD` / setas |
| Mirar | Mouse |
| Atacar / conjurar | Clique esq. / `J` / `Espaço` |
| Esquivar (i-frames) | `Shift` |
| Artefatos | `U` `I` `O` (ou `1` `2` `3`) |
| Trocar de forma | `5`–`9` (Druida/Lobo/Urso/Corvo/Sapo) |
| Interagir | `E` / `F` · Inventário `B` · Pausar `Esc` |

**Coop:** jogadores 2–4 entram apertando qualquer botão num gamepad
(same-screen, câmera de grupo com zoom dinâmico).

## 🧱 Stack

- **Build:** Vite
- **Render:** Three.js (câmera ortográfica isométrica)
- **Linguagem:** JavaScript (migração para TypeScript recomendada — ver `docs/technical-architecture.md`)
- **Arquitetura:** ECS (Entity-Component-System) data-driven
- **Input:** Keyboard + Gamepad API (multi-jogador local)

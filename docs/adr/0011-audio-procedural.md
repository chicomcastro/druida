# ADR 0011 — Áudio procedural (Web Audio)

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
Queríamos feedback sonoro (combate, UI, ambiente) sem depender de arquivos de
áudio nem inflar o repositório/bundle durante o protótipo.

## Decisão
`AudioManager` sintetiza SFX em tempo real via **Web Audio API**: osciladores
curtos para ataque/conjurar/pickup/level-up/troca de forma/chefe e ruído para
impacto, além de um **drone ambiente** cujo tom muda por bioma. Tudo
event-driven (escuta os eventos do jogo).

O `AudioContext` só inicia após o primeiro gesto do usuário (política dos
navegadores); `resume()` é disparado no primeiro clique/tecla.

Samples reais (pipeline de assets) ficam como evolução — a interface por
eventos não muda ao trocar a implementação.

## Consequências
- Zero assets de áudio, zero peso extra; som imediato.
- Qualidade "chiptune"/sintetizada, não orquestral — aceitável no protótipo.

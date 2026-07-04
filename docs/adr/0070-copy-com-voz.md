# ADR 0070 — Copy com voz de mundo e dicas por dispositivo (M15.4)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Playtest 3: "os textos estão muito quadrados e meio técnicos, pouco
divertidos". O tutorial falava como manual ("Use artefatos com U/I/O") e —
pior — mostrava teclas de TECLADO para quem joga no touch.

## Decisão
- **Voz de mundo**: a floresta ensina, não um manual. Todos os textos do
  onboarding, fast-travel e POIs reescritos com a fantasia do Druida
  ("Suas raízes falharam!", "O vento te levou", "Devolva este chão à
  floresta"). A informação de controle continua presente, mas embrulhada
  na ficção.
- **Dicas por dispositivo**: cada hint do Tutorial tem versão touch (ícones
  dos botões: ⚔️ 💨 ✋ 🐾 🗺️ ⏸) e teclado (teclas). `isTouchDevice()` decide.
- **Objetivos device-neutros**: os passos da campanha não citam mais teclas
  ("Fale com a Guardiã" — o prompt de interação perto do NPC já mostra o
  gesto certo).
- Rodapé de atalhos do desktop encurtado e no vocabulário do jogo
  ("T voltar ao Carvalho").

## Consequências
- O jogo fala como o mundo dele em todos os textos de sistema; vilas e
  diálogos já tinham voz (ADR 0041) — agora não há mais quebra de tom.
- Textos das TELAS (inventário/mercador) serão revistos junto do redesign
  de slots (M15.6).

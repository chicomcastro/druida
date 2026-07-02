# ADR 0046 — Música procedural por bioma com intensidade de combate

**Status:** Aceito · **Data:** 2026-07-02

## Contexto
O áudio era só SFX curtos + um drone de senoide constante por bioma (ADR
0011). Som é o multiplicador de encanto mais barato de um jogo, e o drone não
carregava identidade nem reagia ao que acontece em tela.

## Decisão
`core/audio/MusicDirector.ts` — trilha 100% sintetizada (Web Audio, sem
assets, coerente com o ADR 0011), substituindo o drone:

- **Três camadas** agendadas com *lookahead scheduler* (agenda ~300ms à
  frente, acorda a cada 120ms — imune a jank do main thread): **PAD** (acorde
  fundamental+quinta+oitava com ataque lento e leve desafinação), **BAIXO**
  (fundamental por compasso) e **LEAD** (plucks esparsos numa escala do
  bioma), sobre uma progressão cíclica de 4 compassos.
- **Identidade por bioma** (`MOODS`): Clareira pentatônica maior e quente;
  Pântano menor e lenta; Bosque dórico e esparso; Picos cristalinos e
  espaçados; Coração frígio e tenso. **Chefe vivo** (não mini-chefe) troca o
  humor para o modo boss (rápido/grave), amostrado a cada compasso.
- **Intensidade de combate**: inimigos num raio de 20 do grupo (amostrado por
  compasso) elevam a densidade do lead e ligam um tick de percussão nos
  tempos fortes — a música "esquenta" junto da briga e assenta sozinha.
- **Região purificada** (ADR 0044) toca a variação maior/mais brilhante do
  bioma — o mundo curado também *soa* curado.
- **Controle próprio**: botão "🎵 Música" no menu de pausa (independente do
  mute de SFX), via ganho dedicado ligado ao master.

## Consequências
- Identidade sonora por região sem nenhum asset e ~0 custo de bundle; a
  camada fica em `core/audio/**` (fora da métrica de cobertura, coberta pelo
  e2e — ADR 0031).
- O humor é amostrado por compasso: transições de bioma/combate/chefe são
  musicais (na barra), não abruptas.
- Melodias são aleatórias dentro da escala — sem motivos memoráveis; leitmotifs
  e samples reais ficam como evolução natural (backlog M9).

# Processo de PRs encadeados nesta sessão (lição aprendida)

Os merges são por SQUASH: o commit na main tem SHA diferente do commit da
branch. Depois de CADA merge, antes de commitar o próximo item, SEMPRE:

    git fetch origin main
    git checkout -B claude/3d-world-themed-cities-sgwx8t origin/main

Commitar em cima do commit pré-squash deixa o PR seguinte "dirty" (conflito)
e o CI de pull_request nem dispara (sem merge ref). Já aconteceu 2x (#63, #65).

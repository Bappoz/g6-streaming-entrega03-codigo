# Atalhos para os scripts do package.json (fonte canônica: `npm run`).

default:
    @just --list

install:
    npm ci

format:
    npm run format

lint:
    npm run lint

typecheck:
    npm run typecheck

test:
    npm run test

coverage:
    npm run coverage

# format:check → lint → typecheck → test (mesma sequência da CI)
check:
    npm run check

demo padrao:
    npm run demo:{{padrao}}

bench:
    npm run bench

bench-relatorio:
    cd benchmark && uv run python gerar_relatorio.py

# G6 Streaming — Entrega 03 · Código dos padrões GoF (FGA0208, UnB)

## Stack
TypeScript 7 (strict, ESM) · Node 22+ · Vitest 5 · Biome 2 · tsx · benchmark em Python 3.12 (uv + matplotlib)

## Comandos
```bash
npm run check        # format:check → lint → typecheck → test (gate; igual à CI)
npm run format       # corrige formatação
npm run coverage     # testes + cobertura
npm run demo:builder | demo:factory-method
npm run bench        # node --expose-gc; saída em benchmark/resultados/
```
`just --list` espelha os scripts. Rodar `npm run check` antes de concluir qualquer mudança.

## Arquitetura
- `src/criacionais/<padrao>/` — implementação, `*.test.ts` e `demo.ts` de cada padrão
- `bench/` — cenários TS (padrão × instanciação manual)
- `benchmark/` — Python: orquestra execuções, gráficos e relatório Markdown
- `docs/adr/` — decisões (template em `0000-template.md`)
Documentação da entrega mora em outro repo (`2026.2-T01-_G6_ProjetoStreamingVideo_Entrega_03`).

## Convenções (não-negociáveis)
- Nomes de classe seguem o diagrama de classes da Entrega 02 (`StreamConfig`, `UserContent`, `LiveStream`, `RecordedVideo`, `Clip`).
- Toda classe declara em docstring PT-BR o participante GoF que representa.
- Padrão implementado à mão — nenhuma lib que o substitua.
- Não citar nome de plataforma real em código, arquivo ou commit.
- Commits: Conventional Commits; nada direto na `main`.

## Armadilhas
- `module: Preserve` + `moduleResolution: Bundler`: imports relativos sem extensão; não trocar para NodeNext.
- `exactOptionalPropertyTypes` ligado: opcional ausente ≠ `undefined` explícito (relevante no Builder).
- `vitest.config.ts` tem `passWithNoTests` só enquanto não há testes.

## Evitar
- Métrica de benchmark sem execução real; número entra no relatório com máquina, versão do Node e N.
- Framework, DI container ou camada HTTP: o escopo é o padrão rodando em demo de terminal.

## Estado
Fonte da verdade = git (`git log --oneline -5`, branch atual).

# Cenários de benchmark (TypeScript)

**Estado:** a implementar. Ponto de entrada esperado: `bench/run.ts` (`npm run bench`).

Cada cenário cria **N** instâncias de duas formas — com o padrão e por instanciação manual — e mede:

- tempo de execução (`performance.now()`);
- memória alocada (`process.memoryUsage().heapUsed`, com `global.gc()` antes de cada medição — por isso o script roda com `--expose-gc`).

A saída vai para `benchmark/resultados/<cenario>.json`, consumida pelo projeto Python em [`../benchmark`](../benchmark).

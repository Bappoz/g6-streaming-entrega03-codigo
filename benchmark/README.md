# Relatório de benchmark (Python)

**Estado:** a implementar. Ponto de entrada esperado: `gerar_relatorio.py`.

Orquestra `npm run bench` para vários valores de N, lê `resultados/*.json` e gera os gráficos e o relatório Markdown em `relatorio/`.

```bash
uv sync                           # cria o ambiente com matplotlib
uv run python gerar_relatorio.py  # executa o benchmark e gera o relatório
uv run ruff check . && uv run ruff format .
```

Todo número publicado registra: máquina, versão do Node, N, quantidade de repetições e data da execução.

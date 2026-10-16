# Benchmark do Builder — análise, limitações e conclusão

**Autor:** Heitor Macedo Ricardo · **Data:** 15/10/2026 · **Escopo:** leitura dos números do cenário `builder` e investigação do resultado preliminar que contrariava a decisão D6 do ADR-001. Medidor e cenário: Lucas Andrade Zanetti (`bench/`). Gráficos e orquestração em Python: Pedro Druck Montalvão Reis (pendente). Cenário do Factory Method: Matheus Lemes Amaral (pendente).

## Pergunta

Quanto custa, em tempo e memória, montar um `StreamConfig` pelo Builder em comparação com a instanciação manual? E, em particular, reaproveitar o builder com `reset()` (decisão D6) economiza alguma coisa em relação a criar um builder novo por configuração?

## Ambiente

| Item | Valor |
| --- | --- |
| Máquina | Intel Core i5-1135G7 (11ª geração, 4 núcleos / 8 threads), notebook |
| Sistema | Linux 7.2.3 (Arch) |
| Node | v26.8.2, com `--expose-gc` (coleta forçada disponível) |
| Data | 15/10/2026, à tarde |
| Carga por medição | 10 rodadas × 100.000 iterações, 10.000 iterações de aquecimento descartadas |

## Método

1. **Execução de referência** — `npm run bench -- --scenario builder` (os três braços em sequência, no mesmo processo), três vezes.
2. **Reprodução do preliminar** — a configuração do PR #1 (`--iterations 20000 --rounds 3`), oito vezes.
3. **Comparação pareada** — `bench/isolado.ts` mede **um braço por processo**. Foram 30 pares `builder-novo` × `builder-reutilizado`, cada par em ordem sorteada, e comparada a diferença **dentro** de cada par. Isso remove o efeito de ordem (estado de JIT e heap deixado pelo braço anterior) e reduz o efeito de deriva térmica da CPU, que afeta igualmente os dois membros de um par.
4. **Custo do padrão** — 15 pares `builder-novo` × `manual`, também em processos separados e ordem sorteada.

A mediana de cada processo é a mediana das suas 10 rodadas. O intervalo de confiança da diferença foi obtido por bootstrap (10.000 reamostragens da mediana das 30 diferenças).

Dados brutos versionados: [`d6-pareado.csv`](d6-pareado.csv) (passo 3) e [`manual-vs-builder.csv`](manual-vs-builder.csv) (passo 4).

```bash
# um braço, um processo — repetir alternando a ordem dos braços
node --expose-gc --import tsx bench/isolado.ts builder builder-novo
node --expose-gc --import tsx bench/isolado.ts builder builder-reutilizado
```

## Resultados

### 1. D6 — builder reaproveitado × builder novo

| Braço | Mediana (ms / 100 mil) | Intervalo interquartil |
| --- | --- | --- |
| `builder-novo` | 37,79 | 33,72 – 42,37 |
| `builder-reutilizado` | 36,42 | 34,37 – 38,72 |

| Diferença pareada (reutilizado − novo) | Valor |
| --- | --- |
| Mediana | −1,00 ms (−2,6%) |
| IC 95% (bootstrap) | −3,55 a +1,80 ms |
| Pares em que o reutilizado foi mais lento | 13 de 30 |

**Leitura:** o intervalo de confiança contém o zero, e o reutilizado perde em quase metade dos pares. **Não há diferença mensurável** entre os dois braços nesta máquina.

### 2. Por que o preliminar mostrou o contrário

O PR #1 registrou o reutilizado quase duas vezes mais lento (11,05 ms contra 5,81 ms, melhor de 3 rodadas de 20 mil). Repetindo essa mesma configuração oito vezes, o vencedor **trocou de lado** entre as execuções:

| Execução | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `builder-novo` (ms) | 8,89 | 8,73 | 8,92 | 6,92 | 7,03 | 10,09 | 12,31 | 11,23 |
| `builder-reutilizado` (ms) | 6,34 | 8,16 | 9,29 | 13,52 | 9,49 | 6,81 | 7,31 | 7,98 |

Com rodadas de 5 a 13 ms, uma interrupção do sistema operacional ou uma coleta de lixo no meio da rodada pesa tanto quanto a diferença procurada, e três rodadas não bastam para separar isso do efeito real. **O resultado preliminar era ruído de amostra curta**, não um efeito do `reset()`.

Uma hipótese testada e descartada: que o motor já eliminasse a alocação do builder novo por *escape analysis*, tornando-o tão barato quanto o reaproveitado. Desligar essa otimização (`--no-turbo-escape`) não mudou o tempo de nenhum dos braços. A razão de os dois custarem o mesmo **não foi verificada**; o que se pode afirmar é só que, medido, custam o mesmo.

### 3. Custo do padrão em relação à instanciação manual

| Braço | Mediana (ms / 100 mil) | Por instância |
| --- | --- | --- |
| `manual` (literal congelado, sem validação) | 10,34 | ≈ 103 ns |
| `builder-novo` (mesma sessão) | 39,83 | ≈ 398 ns |

O Builder custou cerca de **3,9×** a montagem manual, algo como **0,3 µs a mais por configuração**.

**Ressalva obrigatória:** o braço `manual` não executa nenhuma regra (R1–R5). A diferença é custo do padrão **mais** custo da validação, e este benchmark não separa as duas parcelas.

### 4. Memória

A variação de `heapUsed` por rodada ficou em torno de 1,5 MB para os dois braços do Builder e **1,7 MB para o manual**, que aloca menos objetos por iteração. Uma medida em que o braço que aloca menos aparece maior não está medindo alocação: as coletas de lixo que acontecem **durante** a rodada liberam memória antes da leitura final. Por isso **nenhuma conclusão sobre memória é tirada destes números** (ver limitações).

## Conclusões

1. **Custo do padrão:** montar um `StreamConfig` pelo Builder custa na ordem de 0,4 µs, cerca de 4× a montagem manual sem validação. Uma configuração de transmissão é criada uma vez por transmissão, então esse custo é irrelevante para o sistema; o que o padrão troca é essa fração de microssegundo por um ponto único de validação e um produto imutável.
2. **D6 não se sustenta como otimização.** Reaproveitar o builder não economizou tempo mensurável. A decisão continua válida pelo motivo de **design** — o Director recebe um builder e o reusa, o que permite injetar outro ConcreteBuilder —, mas a justificativa de desempenho deve sair do ADR-001 (coluna "Efeito medido no benchmark" de D6).
3. **O `reset()` continua necessário.** Não por desempenho, e sim por correção: como `build()` não limpa o estado, sem `reset()` um preset herdaria campos do uso anterior (há teste para isso no Director).

## Limitações

- **Uma máquina, um Node, um dia.** Os números são desta configuração; outra CPU ou outra versão do V8 pode mudar os valores absolutos. A **razão** entre braços tende a ser mais estável que o valor em ms, mas isso também não foi verificado em outra máquina.
- **Notebook sem controle de frequência da CPU.** A dispersão entre processos (intervalo interquartil de até ±12%) vem em boa parte disso. O pareamento reduz o efeito, mas não o elimina.
- **Uma só carga.** O planejamento previa N = 1 mil, 10 mil, 100 mil e 1 milhão; aqui só 100 mil por rodada. A variação com N fica para a orquestração em Python.
- **Memória sem medida válida.** `heapUsed` antes e depois da rodada não mede alocação. Uma medida útil precisaria contar bytes alocados (por exemplo, com uma rodada pequena o bastante para não disparar coleta, ou com rastreamento de alocações do V8); não foi feito.
- **Manual sem validação** (ver resultado 3).

## Recomendações para o medidor

- Não usar menos que os parâmetros padrão (10 rodadas × 100 mil) para comparar braços; com 3 × 20 mil o ruído é maior que o efeito.
- Para diferenças pequenas, comparar com `bench/isolado.ts` em pares de ordem sorteada, não pela "melhor rodada" de uma execução única.
- Reportar mediana e dispersão; a "melhor rodada" impressa por `run.ts` é útil para conferência rápida, não para conclusão.

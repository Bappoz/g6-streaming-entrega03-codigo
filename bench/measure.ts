/**
 * Medidor do benchmark: tempo e memória de um trecho repetido muitas vezes.
 *
 * O que ele mede, e por quê desta forma:
 *
 * - **Rodadas em vez de uma execução longa.** Uma única medição de N iterações
 *   devolve um número que não dá para checar. Várias rodadas independentes mostram a
 *   dispersão, e é a dispersão que diz se a diferença entre dois braços significa
 *   alguma coisa. O medidor guarda as amostras brutas e **não** calcula média aqui:
 *   a agregação e os gráficos são do script Python, e espalhar estatística pelos dois
 *   lados esconderia de onde cada número veio.
 * - **Aquecimento descartado.** As primeiras execuções pagam compilação do JIT e
 *   seriam atribuídas ao padrão por engano.
 * - **`gc()` antes de cada rodada.** Sem coleta forçada, o heap medido depende do que
 *   a rodada anterior deixou para trás. Por isso `npm run bench` roda com
 *   `--expose-gc`; se a flag faltar, o resultado registra `gcAvailable: false` e a
 *   medida de memória não deve ser usada — melhor um dado marcado como inválido do
 *   que um número bonito e sem sentido.
 * - **Checksum acumulado.** O motor pode eliminar código cujo resultado ninguém usa.
 *   Somar algo do objeto produzido mantém o trabalho vivo e, de quebra, prova que os
 *   dois braços produziram a mesma quantidade de objetos.
 */

/** Acesso à coleta de lixo, disponível apenas sob `node --expose-gc`. */
const forceGc = (globalThis as { gc?: () => void }).gc;

/** Um braço de comparação: um jeito de produzir o mesmo resultado. */
export interface Arm {
  /** Identificador curto, usado como chave no JSON e como rótulo no gráfico. */
  readonly name: string;
  /** O que esse braço faz; entra no relatório para o leitor saber o que foi comparado. */
  readonly description: string;
  /**
   * Produz um objeto. O valor devolvido entra no checksum, então precisa ser algo
   * derivado do que foi construído (um comprimento, um número do objeto).
   */
  readonly run: () => number;
}

/** Amostras de uma rodada. */
export interface Sample {
  /** Duração da rodada inteira, em milissegundos. */
  readonly durationMs: number;
  /** Variação do heap durante a rodada, em bytes. */
  readonly heapDeltaBytes: number;
}

export interface ArmResult {
  readonly name: string;
  readonly description: string;
  readonly samples: readonly Sample[];
  readonly checksum: number;
}

export interface MeasureOptions {
  /** Iterações por rodada. */
  readonly iterations: number;
  /** Rodadas medidas. */
  readonly rounds: number;
  /** Iterações descartadas antes de medir. */
  readonly warmupIterations: number;
}

export const DEFAULT_OPTIONS: MeasureOptions = {
  iterations: 100_000,
  rounds: 10,
  warmupIterations: 10_000,
};

/** Executa um braço e devolve as amostras de todas as rodadas. */
export function measureArm(arm: Arm, options: MeasureOptions): ArmResult {
  let checksum = 0;

  for (let i = 0; i < options.warmupIterations; i += 1) {
    checksum += arm.run();
  }

  const samples: Sample[] = [];
  for (let round = 0; round < options.rounds; round += 1) {
    forceGc?.();

    const heapBefore = process.memoryUsage().heapUsed;
    const startedAt = performance.now();

    for (let i = 0; i < options.iterations; i += 1) {
      checksum += arm.run();
    }

    const durationMs = performance.now() - startedAt;
    const heapDeltaBytes = process.memoryUsage().heapUsed - heapBefore;

    samples.push({ durationMs, heapDeltaBytes });
  }

  return { name: arm.name, description: arm.description, samples, checksum };
}

/** Um cenário é um conjunto de braços que produzem resultados equivalentes. */
export interface Scenario {
  readonly name: string;
  /** O que o cenário compara e qual pergunta ele responde. */
  readonly description: string;
  /**
   * Ressalvas que o relatório precisa repetir — por exemplo, braços que não fazem
   * exatamente o mesmo trabalho. Fica no JSON para a ressalva não se perder no caminho
   * entre a medição e o texto final.
   */
  readonly caveats: readonly string[];
  readonly arms: readonly Arm[];
}

export interface ScenarioResult {
  readonly scenario: string;
  readonly description: string;
  readonly caveats: readonly string[];
  readonly options: MeasureOptions;
  readonly environment: {
    readonly nodeVersion: string;
    readonly platform: string;
    readonly arch: string;
    readonly gcAvailable: boolean;
    readonly measuredAt: string;
  };
  readonly arms: readonly ArmResult[];
}

/** Roda todos os braços de um cenário e devolve o resultado pronto para serializar. */
export function runScenario(scenario: Scenario, options: MeasureOptions): ScenarioResult {
  return {
    scenario: scenario.name,
    description: scenario.description,
    caveats: scenario.caveats,
    options,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      gcAvailable: forceGc !== undefined,
      measuredAt: new Date().toISOString(),
    },
    arms: scenario.arms.map((arm) => measureArm(arm, options)),
  };
}

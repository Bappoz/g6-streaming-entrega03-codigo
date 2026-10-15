import type { ContentVisibility, LatencyMode, Resolution } from "./enums";
import type { StreamConfig } from "./stream-config";

/**
 * Builder — contrato de montagem de um `StreamConfig`.
 *
 * A interface existe separada da implementação por duas razões concretas, e não por
 * simetria com o diagrama:
 *
 * 1. O `StreamConfigDirector` depende deste contrato, não de uma classe. É isso que
 *    permite trocar o ConcreteBuilder (por um que registre log, ou por um dublê em
 *    teste) sem tocar nos presets.
 * 2. Ela trava os nomes dos métodos entre quem escreve o builder e quem escreve o
 *    director, que são pessoas diferentes nesta entrega.
 *
 * Todo método de configuração devolve o próprio builder, o que permite encadear as
 * chamadas. O retorno é tipado como `StreamConfigBuilder` e não como `this` de
 * propósito: o cliente deve enxergar o contrato, não a implementação concreta.
 */
export interface StreamConfigBuilder {
  /** Define o título da transmissão. Obrigatório — não há padrão (decisão D7). */
  withTitle(title: string): StreamConfigBuilder;

  /** Define a visibilidade do conteúdo. Padrão: `PUBLIC`. */
  withVisibility(visibility: ContentVisibility): StreamConfigBuilder;

  /** Define o modo de latência. Padrão: `STANDARD`. */
  withLatencyMode(latencyMode: LatencyMode): StreamConfigBuilder;

  /** Liga ou desliga a gravação automática. Padrão: ligada (decisão D3). */
  withRecording(enabled: boolean): StreamConfigBuilder;

  /**
   * Define o perfil de vídeo completo.
   *
   * Os três parâmetros entram juntos porque a regra R2 do ADR-001 exige que sejam
   * informados em bloco. Um método por campo (`withResolution`, `withFramesPerSecond`,
   * `withBitrate`) permitiria montar meio perfil e adiaria o erro para `build()`;
   * com um método só, o estado inconsistente não chega a existir.
   */
  withVideo(
    resolution: Resolution,
    framesPerSecond: number,
    bitrateBps: number,
  ): StreamConfigBuilder;

  /**
   * Devolve o builder ao estado inicial, com os padrões de fábrica (decisão D6).
   *
   * Serve ao Director, que monta vários presets em sequência e precisa garantir que o
   * preset seguinte não herde campo do anterior.
   */
  reset(): StreamConfigBuilder;

  /**
   * Valida o que foi montado e devolve a configuração imutável.
   *
   * **Não** limpa o estado: duas chamadas seguidas produzem configurações equivalentes.
   * Quem reaproveita o builder chama `reset()` entre as montagens.
   *
   * @throws {InvalidStreamConfigError} com **todas** as regras violadas (decisão D5).
   */
  build(): StreamConfig;
}

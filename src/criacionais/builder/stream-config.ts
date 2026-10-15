import type { ContentVisibility, LatencyMode, Resolution } from "./enums";
import type { VideoSettings } from "./video-settings";

/** Campos aceitos na criação de um `StreamConfig`, já validados pelo ConcreteBuilder. */
export interface StreamConfigFields {
  readonly title: string;
  readonly visibility: ContentVisibility;
  readonly latencyMode: LatencyMode;
  readonly recordAutomatically: boolean;
  /** Ausente quando a transmissão não define perfil de vídeo (R2 do ADR-001). */
  readonly video?: VideoSettings;
}

/**
 * Product — configuração de uma transmissão ao vivo, imutável.
 *
 * É o objeto que `LiveStreamService.createStream(userId, config)` recebe no diagrama
 * da Entrega 02. Aqui ele ganha os três campos de vídeo da decisão D1 do ADR-001
 * (`resolution`, `framesPerSecond`, `bitrateBps`), que no v3 viviam em `QualityVariant`.
 *
 * Duas garantias que justificam a classe existir em vez de um objeto literal:
 *
 * 1. **Construtor privado.** Não há como produzir um `StreamConfig` sem passar pelo
 *    ConcreteBuilder, que é onde as regras R1–R5 são verificadas.
 * 2. **Congelado no construtor.** `readonly` só vale em tempo de compilação; o
 *    `Object.freeze` impede que um cliente em JavaScript puro altere a configuração
 *    depois de validada — que seria a forma mais silenciosa de burlar a validação.
 *
 * Os campos de vídeo são expostos achatados (`resolution`, `framesPerSecond`,
 * `bitrateBps`), e não como um objeto aninhado, para o Product ficar idêntico ao
 * diagrama de classes. O agrupamento existe só na entrada (`StreamConfigFields.video`),
 * onde ele serve para garantir a regra R2.
 *
 * Tipados como `T | undefined` em vez de `campo?: T` de propósito: o projeto liga
 * `exactOptionalPropertyTypes`, e com ele "propriedade ausente" e "propriedade com
 * valor `undefined`" são tipos diferentes. A forma explícita é a que permite ler
 * `config.resolution` sem o leitor precisar saber dessa distinção.
 */
export class StreamConfig {
  readonly title: string;
  readonly visibility: ContentVisibility;
  readonly latencyMode: LatencyMode;
  readonly recordAutomatically: boolean;
  readonly resolution: Resolution | undefined;
  readonly framesPerSecond: number | undefined;
  readonly bitrateBps: number | undefined;

  private constructor(fields: StreamConfigFields) {
    this.title = fields.title;
    this.visibility = fields.visibility;
    this.latencyMode = fields.latencyMode;
    this.recordAutomatically = fields.recordAutomatically;
    this.resolution = fields.video?.resolution;
    this.framesPerSecond = fields.video?.framesPerSecond;
    this.bitrateBps = fields.video?.bitrateBps;
    Object.freeze(this);
  }

  /**
   * Ponto de entrada único de criação, chamado pelo ConcreteBuilder depois de validar.
   *
   * **Limite declarado:** TypeScript não tem visibilidade "de pacote" (o `friend` de
   * C++), então este método fica público e, em tese, alguém poderia chamá-lo direto e
   * pular a validação. A alternativa seria um token secreto compartilhado entre os
   * dois módulos, o que esconderia o padrão atrás de uma gambiarra sem impedir nada de
   * verdade — em JavaScript qualquer barreira dessas é contornável. Ficou o contrato
   * explícito: quem cria `StreamConfig` é o builder.
   */
  static fromBuilder(fields: StreamConfigFields): StreamConfig {
    return new StreamConfig(fields);
  }

  /** Indica se a configuração define perfil de vídeo (os três campos de D1). */
  get hasVideoProfile(): boolean {
    return this.resolution !== undefined;
  }
}

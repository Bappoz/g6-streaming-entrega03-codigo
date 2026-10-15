import { minimumBitrateBps } from "./bitrate-floor";
import { ContentVisibility, LatencyMode, Resolution } from "./enums";
import { InvalidStreamConfigError } from "./errors";
import { StreamConfig, type StreamConfigFields } from "./stream-config";
import type { StreamConfigBuilder } from "./stream-config-builder";
import type { VideoSettings } from "./video-settings";

/** Teto de taxa de quadros aceito, regra R3 do ADR-001 (evidência E11). */
const MAX_FRAMES_PER_SECOND = 60;

/** Modos de latência que a evidência E08 mostra incompatíveis com 2160p. */
const LOW_LATENCY_MODES: readonly LatencyMode[] = [LatencyMode.LOW, LatencyMode.ULTRA_LOW];

/**
 * ConcreteBuilder — monta `StreamConfig` passo a passo e valida em `build()`.
 *
 * **Por que a validação fica toda em `build()` e não em cada `with*()`** (decisão D4):
 * as regras R4 e R5 olham para pares de campos — latência × resolução, bitrate ×
 * resolução × taxa de quadros. Validar campo a campo não as enxerga, porque no momento
 * em que a resolução é definida o modo de latência ainda pode mudar. Validar na borda
 * de saída é o único ponto em que a configuração está completa. É também o que dá ao
 * padrão a propriedade que o justifica: existe **um** lugar onde a configuração é
 * julgada, em vez de uma checagem espalhada por cada chamador.
 *
 * O estado parcial fica em campos privados simples. Os três campos de vídeo moram
 * juntos em `video`, espelhando a garantia estrutural da regra R2 descrita em
 * `VideoSettings`.
 */
export class DefaultStreamConfigBuilder implements StreamConfigBuilder {
  // `title` nasce indefinido de propósito (decisão D7): um padrão como "Sem título"
  // produziria dado falso e faria R1 nunca disparar.
  private title: string | undefined;
  private visibility: ContentVisibility = ContentVisibility.PUBLIC;
  private latencyMode: LatencyMode = LatencyMode.STANDARD;
  // Padrão `true` (decisão D3): a regra de clipes do v3 rejeita clipe sem gravação
  // habilitada, então o padrão `false` tornaria a clipagem inviável por omissão.
  private recordAutomatically = true;
  private video: VideoSettings | undefined;

  withTitle(title: string): StreamConfigBuilder {
    this.title = title;
    return this;
  }

  withVisibility(visibility: ContentVisibility): StreamConfigBuilder {
    this.visibility = visibility;
    return this;
  }

  withLatencyMode(latencyMode: LatencyMode): StreamConfigBuilder {
    this.latencyMode = latencyMode;
    return this;
  }

  withRecording(enabled: boolean): StreamConfigBuilder {
    this.recordAutomatically = enabled;
    return this;
  }

  withVideo(
    resolution: Resolution,
    framesPerSecond: number,
    bitrateBps: number,
  ): StreamConfigBuilder {
    this.video = { resolution, framesPerSecond, bitrateBps };
    return this;
  }

  reset(): StreamConfigBuilder {
    this.title = undefined;
    this.visibility = ContentVisibility.PUBLIC;
    this.latencyMode = LatencyMode.STANDARD;
    this.recordAutomatically = true;
    this.video = undefined;
    return this;
  }

  build(): StreamConfig {
    const violations = this.validate();
    if (violations.length > 0) {
      throw new InvalidStreamConfigError(violations);
    }

    // `title` já passou por R1; o non-null é o que informa isso ao compilador.
    const fields: StreamConfigFields = {
      title: (this.title as string).trim(),
      visibility: this.visibility,
      latencyMode: this.latencyMode,
      recordAutomatically: this.recordAutomatically,
      // Spread condicional em vez de `video: this.video`: com
      // `exactOptionalPropertyTypes`, passar `undefined` explícito para uma
      // propriedade opcional é erro de tipo — "ausente" e "undefined" não são a
      // mesma coisa para o compilador.
      ...(this.video ? { video: this.video } : {}),
    };

    return StreamConfig.fromBuilder(fields);
  }

  /**
   * Aplica as regras R1, R3, R4 e R5 do ADR-001 e devolve todas as violações.
   *
   * R2 não aparece aqui: ela é garantida pelo formato de `withVideo`, que só aceita os
   * três campos de uma vez. Uma regra que o tipo impede de quebrar não precisa de
   * verificação em tempo de execução — teria de ser código morto para passar na
   * cobertura. A mudança de status de R2 está registrada no README do padrão.
   *
   * Cada mensagem começa pelo id da regra: é o que liga a falha vista no terminal à
   * linha correspondente do ADR.
   */
  private validate(): string[] {
    const violations: string[] = [];

    if (this.title === undefined || this.title.trim() === "") {
      violations.push("R1 título é obrigatório e não pode ser vazio");
    }

    if (this.video !== undefined) {
      const { resolution, framesPerSecond, bitrateBps } = this.video;

      if (!Number.isInteger(framesPerSecond) || framesPerSecond < 1) {
        // Decisão de projeto: nenhuma evidência fala do piso, mas taxa de quadros
        // fracionária ou não positiva não descreve transmissão nenhuma.
        violations.push(
          `R3 taxa de quadros deve ser inteira e maior que zero (recebido: ${framesPerSecond})`,
        );
      } else if (framesPerSecond > MAX_FRAMES_PER_SECOND) {
        violations.push(
          `R3 taxa de quadros não pode passar de ${MAX_FRAMES_PER_SECOND} (recebido: ${framesPerSecond})`,
        );
      }

      if (LOW_LATENCY_MODES.includes(this.latencyMode) && resolution === Resolution.R2160P) {
        violations.push(
          `R4 latência ${this.latencyMode} é incompatível com ${Resolution.R2160P}; use ${LatencyMode.STANDARD} ou reduza a resolução`,
        );
      }

      if (!Number.isFinite(bitrateBps) || bitrateBps <= 0) {
        violations.push(`R5 bitrate deve ser um número positivo (recebido: ${bitrateBps})`);
      } else if (Number.isInteger(framesPerSecond) && framesPerSecond >= 1) {
        // Só compara com o piso quando a taxa de quadros é válida: com fps inválido o
        // piso escolhido seria arbitrário e a mensagem, enganosa.
        const floor = minimumBitrateBps(resolution, framesPerSecond);
        if (bitrateBps < floor) {
          violations.push(
            `R5 bitrate ${bitrateBps} bps está abaixo do mínimo de ${floor} bps para ${resolution} a ${framesPerSecond} fps`,
          );
        }
      }
    }

    return violations;
  }
}

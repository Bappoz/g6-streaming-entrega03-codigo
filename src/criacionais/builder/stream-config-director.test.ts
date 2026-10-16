import { beforeEach, describe, expect, it } from "vitest";
import { minimumBitrateBps } from "./bitrate-floor";
import { DefaultStreamConfigBuilder } from "./default-stream-config-builder";
import { ContentVisibility, LatencyMode, Resolution } from "./enums";
import { InvalidStreamConfigError } from "./errors";
import type { StreamConfig } from "./stream-config";
import type { StreamConfigBuilder } from "./stream-config-builder";
import { StreamConfigDirector } from "./stream-config-director";

/**
 * Dublê do Builder que só registra a ordem das chamadas e delega ao builder real.
 *
 * Existe para testar o contrato Director → Builder (a sequência de passos), que não
 * aparece olhando só para o `StreamConfig` final — em especial, que `reset()` vem antes
 * de tudo e `build()` por último.
 */
class RecordingBuilder implements StreamConfigBuilder {
  readonly calls: string[] = [];
  private readonly real = new DefaultStreamConfigBuilder();

  withTitle(title: string): StreamConfigBuilder {
    this.calls.push("withTitle");
    this.real.withTitle(title);
    return this;
  }

  withVisibility(visibility: ContentVisibility): StreamConfigBuilder {
    this.calls.push("withVisibility");
    this.real.withVisibility(visibility);
    return this;
  }

  withLatencyMode(latencyMode: LatencyMode): StreamConfigBuilder {
    this.calls.push("withLatencyMode");
    this.real.withLatencyMode(latencyMode);
    return this;
  }

  withRecording(enabled: boolean): StreamConfigBuilder {
    this.calls.push("withRecording");
    this.real.withRecording(enabled);
    return this;
  }

  withVideo(
    resolution: Resolution,
    framesPerSecond: number,
    bitrateBps: number,
  ): StreamConfigBuilder {
    this.calls.push("withVideo");
    this.real.withVideo(resolution, framesPerSecond, bitrateBps);
    return this;
  }

  reset(): StreamConfigBuilder {
    this.calls.push("reset");
    this.real.reset();
    return this;
  }

  build(): StreamConfig {
    this.calls.push("build");
    return this.real.build();
  }
}

describe("StreamConfigDirector (Director)", () => {
  let builder: StreamConfigBuilder;
  let director: StreamConfigDirector;

  beforeEach(() => {
    builder = new DefaultStreamConfigBuilder();
    director = new StreamConfigDirector(builder);
  });

  describe("presets", () => {
    it("lowLatency monta 720p a 30 fps com latência LOW", () => {
      const config = director.lowLatency("Bate-papo com o público");

      expect(config.title).toBe("Bate-papo com o público");
      expect(config.latencyMode).toBe(LatencyMode.LOW);
      expect(config.resolution).toBe(Resolution.R720P);
      expect(config.framesPerSecond).toBe(30);
      expect(config.bitrateBps).toBe(4_500_000);
    });

    it("highQuality monta 2160p a 60 fps com latência STANDARD", () => {
      const config = director.highQuality("Show ao vivo");

      expect(config.latencyMode).toBe(LatencyMode.STANDARD);
      expect(config.resolution).toBe(Resolution.R2160P);
      expect(config.framesPerSecond).toBe(60);
      expect(config.bitrateBps).toBe(20_000_000);
    });

    it("mobile monta 480p a 30 fps com latência STANDARD", () => {
      const config = director.mobile("Direto da rua");

      expect(config.latencyMode).toBe(LatencyMode.STANDARD);
      expect(config.resolution).toBe(Resolution.R480P);
      expect(config.framesPerSecond).toBe(30);
      expect(config.bitrateBps).toBe(1_000_000);
    });

    it.each([
      ["lowLatency", (d: StreamConfigDirector) => d.lowLatency("t")],
      ["highQuality", (d: StreamConfigDirector) => d.highQuality("t")],
      ["mobile", (d: StreamConfigDirector) => d.mobile("t")],
    ])("%s mantém os padrões do builder para visibilidade e gravação", (_, preset) => {
      const config = preset(director);

      expect(config.visibility).toBe(ContentVisibility.PUBLIC);
      // Decisão D3: o preset não desliga a gravação, senão a clipagem fica inviável.
      expect(config.recordAutomatically).toBe(true);
    });

    it.each([
      ["lowLatency", (d: StreamConfigDirector) => d.lowLatency("t")],
      ["highQuality", (d: StreamConfigDirector) => d.highQuality("t")],
      ["mobile", (d: StreamConfigDirector) => d.mobile("t")],
    ])("%s fica acima do piso de bitrate da regra R5", (_, preset) => {
      const config = preset(director);
      const { resolution, framesPerSecond, bitrateBps } = config;

      // Os presets definem perfil de vídeo; o guard só informa isso ao compilador.
      if (resolution === undefined || framesPerSecond === undefined || bitrateBps === undefined) {
        throw new Error("preset sem perfil de vídeo");
      }
      expect(bitrateBps).toBeGreaterThan(minimumBitrateBps(resolution, framesPerSecond));
    });
  });

  describe("reaproveitamento do builder (decisão D6)", () => {
    it("ignora o que foi definido no builder antes do preset", () => {
      builder
        .withVisibility(ContentVisibility.PRIVATE)
        .withRecording(false)
        .withLatencyMode(LatencyMode.ULTRA_LOW);

      const config = director.highQuality("Show ao vivo");

      expect(config.visibility).toBe(ContentVisibility.PUBLIC);
      expect(config.recordAutomatically).toBe(true);
      // Sem reset(), ULTRA_LOW sobreviveria e R4 rejeitaria o 4K.
      expect(config.latencyMode).toBe(LatencyMode.STANDARD);
    });

    it("produz presets independentes em sequência com o mesmo builder", () => {
      const baixa = director.lowLatency("Primeira");
      const alta = director.highQuality("Segunda");
      const movel = director.mobile("Terceira");

      expect(baixa.resolution).toBe(Resolution.R720P);
      expect(alta.resolution).toBe(Resolution.R2160P);
      expect(movel.resolution).toBe(Resolution.R480P);
      expect(baixa.latencyMode).toBe(LatencyMode.LOW);
      expect(alta.latencyMode).toBe(LatencyMode.STANDARD);
      expect(baixa.title).toBe("Primeira");
    });

    it("não altera configurações já entregues ao montar a seguinte", () => {
      const primeira = director.lowLatency("Primeira");
      director.highQuality("Segunda");

      expect(primeira.title).toBe("Primeira");
      expect(primeira.resolution).toBe(Resolution.R720P);
    });
  });

  describe("contrato com o Builder", () => {
    it("chama reset() primeiro e build() por último", () => {
      const gravador = new RecordingBuilder();

      new StreamConfigDirector(gravador).mobile("Direto da rua");

      expect(gravador.calls).toEqual([
        "reset",
        "withTitle",
        "withLatencyMode",
        "withVideo",
        "build",
      ]);
    });

    it("funciona com qualquer implementação da interface StreamConfigBuilder", () => {
      const config = new StreamConfigDirector(new RecordingBuilder()).highQuality("Show");

      expect(config.resolution).toBe(Resolution.R2160P);
    });
  });

  describe("validação", () => {
    it("repassa a violação R1 quando o título é vazio, sem validar por conta própria", () => {
      const erro = (() => {
        try {
          director.lowLatency("   ");
        } catch (e) {
          return e;
        }
        throw new Error("esperava InvalidStreamConfigError, mas o preset foi aceito");
      })();

      expect(erro).toBeInstanceOf(InvalidStreamConfigError);
      expect((erro as InvalidStreamConfigError).violations).toEqual([
        "R1 título é obrigatório e não pode ser vazio",
      ]);
    });

    it("volta a funcionar depois de um preset rejeitado", () => {
      expect(() => director.mobile("")).toThrow(InvalidStreamConfigError);

      expect(director.mobile("Agora com título").title).toBe("Agora com título");
    });
  });
});

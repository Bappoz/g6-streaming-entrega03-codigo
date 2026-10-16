import { beforeEach, describe, expect, it } from "vitest";
import { DefaultStreamConfigBuilder } from "./default-stream-config-builder";
import { ContentVisibility, LatencyMode, Resolution } from "./enums";
import { InvalidStreamConfigError } from "./errors";
import type { StreamConfigBuilder } from "./stream-config-builder";

/** Captura o erro de `build()` para inspecionar as violações acumuladas. */
function violacoesDe(builder: StreamConfigBuilder): readonly string[] {
  try {
    builder.build();
  } catch (erro) {
    if (erro instanceof InvalidStreamConfigError) {
      return erro.violations;
    }
    throw erro;
  }
  throw new Error("esperava InvalidStreamConfigError, mas build() devolveu uma configuração");
}

describe("DefaultStreamConfigBuilder (ConcreteBuilder)", () => {
  let builder: StreamConfigBuilder;

  beforeEach(() => {
    builder = new DefaultStreamConfigBuilder();
  });

  describe("montagem", () => {
    it("monta uma configuração só com o título, aplicando os padrões", () => {
      const config = builder.withTitle("Treino de sexta").build();

      expect(config.title).toBe("Treino de sexta");
      expect(config.visibility).toBe(ContentVisibility.PUBLIC);
      expect(config.latencyMode).toBe(LatencyMode.STANDARD);
      // Decisão D3: gravação ligada por padrão, senão a clipagem fica inviável por omissão.
      expect(config.recordAutomatically).toBe(true);
      expect(config.hasVideoProfile).toBe(false);
    });

    it("permite encadear as chamadas em qualquer ordem", () => {
      const config = builder
        .withVideo(Resolution.R720P, 30, 3_000_000)
        .withRecording(false)
        .withTitle("Bate-papo")
        .withVisibility(ContentVisibility.UNLISTED)
        .withLatencyMode(LatencyMode.LOW)
        .build();

      expect(config.title).toBe("Bate-papo");
      expect(config.visibility).toBe(ContentVisibility.UNLISTED);
      expect(config.latencyMode).toBe(LatencyMode.LOW);
      expect(config.recordAutomatically).toBe(false);
      expect(config.resolution).toBe(Resolution.R720P);
    });

    it("mantém a última chamada quando o mesmo campo é definido duas vezes", () => {
      const config = builder.withTitle("Primeiro").withTitle("Segundo").build();

      expect(config.title).toBe("Segundo");
    });

    it("remove espaços nas pontas do título", () => {
      expect(builder.withTitle("  Live de domingo  ").build().title).toBe("Live de domingo");
    });
  });

  describe("reuso do builder (decisão D6)", () => {
    it("build() não limpa o estado: a segunda chamada repete a configuração", () => {
      builder.withTitle("Live").withLatencyMode(LatencyMode.LOW);

      const primeira = builder.build();
      const segunda = builder.build();

      expect(segunda).not.toBe(primeira);
      expect(segunda.title).toBe(primeira.title);
      expect(segunda.latencyMode).toBe(primeira.latencyMode);
    });

    it("reset() devolve os padrões e descarta o perfil de vídeo", () => {
      builder
        .withTitle("Antiga")
        .withVisibility(ContentVisibility.PRIVATE)
        .withLatencyMode(LatencyMode.ULTRA_LOW)
        .withRecording(false)
        .withVideo(Resolution.R1080P, 60, 6_000_000);

      const config = builder.reset().withTitle("Nova").build();

      expect(config.title).toBe("Nova");
      expect(config.visibility).toBe(ContentVisibility.PUBLIC);
      expect(config.latencyMode).toBe(LatencyMode.STANDARD);
      expect(config.recordAutomatically).toBe(true);
      expect(config.hasVideoProfile).toBe(false);
    });

    it("configuração já construída não é afetada por um reset posterior", () => {
      const config = builder.withTitle("Live").build();

      builder.reset();

      expect(config.title).toBe("Live");
    });
  });

  describe("R1 — título obrigatório", () => {
    it("recusa configuração sem título (decisão D7: não há padrão)", () => {
      expect(violacoesDe(builder)).toEqual([expect.stringContaining("R1")]);
    });

    it("recusa título só com espaços", () => {
      expect(violacoesDe(builder.withTitle("   "))).toEqual([expect.stringContaining("R1")]);
    });

    it("lança InvalidStreamConfigError, não um Error genérico", () => {
      expect(() => builder.build()).toThrow(InvalidStreamConfigError);
    });
  });

  describe("R3 — teto de taxa de quadros (E11)", () => {
    it("aceita 60 quadros, que é o limite das fontes", () => {
      const config = builder.withTitle("Live").withVideo(Resolution.R1080P, 60, 6_000_000).build();

      expect(config.framesPerSecond).toBe(60);
    });

    it("recusa 61 quadros", () => {
      const violacoes = violacoesDe(
        builder.withTitle("Live").withVideo(Resolution.R1080P, 61, 50_000_000),
      );

      expect(violacoes).toContainEqual(expect.stringContaining("R3"));
    });

    it("recusa taxa de quadros fracionária ou não positiva", () => {
      expect(
        violacoesDe(builder.withTitle("Live").withVideo(Resolution.R720P, 29.97, 3_000_000)),
      ).toContainEqual(expect.stringContaining("R3"));
      expect(
        violacoesDe(
          new DefaultStreamConfigBuilder()
            .withTitle("Live")
            .withVideo(Resolution.R720P, 0, 3_000_000),
        ),
      ).toContainEqual(expect.stringContaining("R3"));
    });

    it("não compara bitrate com o piso quando a taxa de quadros é inválida", () => {
      const violacoes = violacoesDe(
        builder.withTitle("Live").withVideo(Resolution.R2160P, 0, 1_000),
      );

      expect(violacoes).toContainEqual(expect.stringContaining("R3"));
      expect(violacoes.filter((v) => v.startsWith("R5 bitrate 1000"))).toHaveLength(0);
    });
  });

  describe("R4 — latência baixa × 2160p (E08, E09)", () => {
    it.each([LatencyMode.LOW, LatencyMode.ULTRA_LOW])("recusa %s com 2160p", (latencia) => {
      const violacoes = violacoesDe(
        new DefaultStreamConfigBuilder()
          .withTitle("Live")
          .withLatencyMode(latencia)
          .withVideo(Resolution.R2160P, 60, 14_000_000),
      );

      expect(violacoes).toContainEqual(expect.stringContaining("R4"));
    });

    it("aceita 2160p com latência padrão", () => {
      const config = builder
        .withTitle("Live")
        .withLatencyMode(LatencyMode.STANDARD)
        .withVideo(Resolution.R2160P, 60, 14_000_000)
        .build();

      expect(config.resolution).toBe(Resolution.R2160P);
    });

    it("aceita latência baixa em resolução menor", () => {
      const config = builder
        .withTitle("Live")
        .withLatencyMode(LatencyMode.ULTRA_LOW)
        .withVideo(Resolution.R1080P, 60, 6_000_000)
        .build();

      expect(config.latencyMode).toBe(LatencyMode.ULTRA_LOW);
    });

    it("não dispara R4 quando não há perfil de vídeo", () => {
      const config = builder.withTitle("Live").withLatencyMode(LatencyMode.ULTRA_LOW).build();

      expect(config.hasVideoProfile).toBe(false);
    });
  });

  describe("R5 — piso de bitrate (E10, E12)", () => {
    it("aceita bitrate exatamente no piso", () => {
      const config = builder.withTitle("Live").withVideo(Resolution.R1080P, 30, 5_000_000).build();

      expect(config.bitrateBps).toBe(5_000_000);
    });

    it("recusa bitrate abaixo do piso da combinação resolução × fps", () => {
      const violacoes = violacoesDe(
        builder.withTitle("Live").withVideo(Resolution.R1080P, 60, 5_000_000),
      );

      expect(violacoes).toContainEqual(expect.stringContaining("R5"));
    });

    it("mensagem diz o mínimo esperado e o valor recebido", () => {
      const [violacao] = violacoesDe(
        builder.withTitle("Live").withVideo(Resolution.R2160P, 30, 1_000_000),
      );

      expect(violacao).toContain("1000000");
      expect(violacao).toContain("11000000");
    });

    it("recusa bitrate não positivo", () => {
      expect(
        violacoesDe(builder.withTitle("Live").withVideo(Resolution.R720P, 30, 0)),
      ).toContainEqual(expect.stringContaining("R5"));
    });
  });

  describe("acúmulo de violações (decisão D5)", () => {
    it("relata todas as regras quebradas de uma vez, não só a primeira", () => {
      const violacoes = violacoesDe(
        builder.withLatencyMode(LatencyMode.ULTRA_LOW).withVideo(Resolution.R2160P, 120, 1_000),
      );

      expect(violacoes).toHaveLength(4);
      expect(violacoes.map((v) => v.slice(0, 2)).sort()).toEqual(["R1", "R3", "R4", "R5"]);
    });
  });
});

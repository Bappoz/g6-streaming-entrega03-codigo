import { describe, expect, it } from "vitest";
import { ContentVisibility, LatencyMode, Resolution } from "./enums";
import { StreamConfig } from "./stream-config";

const camposMinimos = {
  title: "Transmissão de teste",
  visibility: ContentVisibility.PUBLIC,
  latencyMode: LatencyMode.STANDARD,
  recordAutomatically: true,
};

describe("StreamConfig (Product)", () => {
  it("expõe os campos de vídeo achatados, como no diagrama de classes", () => {
    const config = StreamConfig.fromBuilder({
      ...camposMinimos,
      video: { resolution: Resolution.R1080P, framesPerSecond: 60, bitrateBps: 6_000_000 },
    });

    expect(config.resolution).toBe(Resolution.R1080P);
    expect(config.framesPerSecond).toBe(60);
    expect(config.bitrateBps).toBe(6_000_000);
  });

  it("deixa os três campos de vídeo indefinidos quando não há perfil (R2)", () => {
    const config = StreamConfig.fromBuilder(camposMinimos);

    expect(config.resolution).toBeUndefined();
    expect(config.framesPerSecond).toBeUndefined();
    expect(config.bitrateBps).toBeUndefined();
    expect(config.hasVideoProfile).toBe(false);
  });

  it("é congelado: alteração posterior não muda a configuração validada", () => {
    const config = StreamConfig.fromBuilder(camposMinimos);

    // Simula um cliente em JavaScript puro, onde `readonly` não existe em runtime.
    expect(() => {
      (config as { title: string }).title = "outro";
    }).toThrow(TypeError);
    expect(config.title).toBe("Transmissão de teste");
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("não compartilha estado com o objeto de campos recebido", () => {
    const video = { resolution: Resolution.R720P, framesPerSecond: 30, bitrateBps: 3_000_000 };
    const config = StreamConfig.fromBuilder({ ...camposMinimos, video });

    video.framesPerSecond = 60;

    expect(config.framesPerSecond).toBe(30);
  });
});

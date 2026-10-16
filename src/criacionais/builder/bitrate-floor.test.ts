import { describe, expect, it } from "vitest";
import { BITRATE_FLOOR_BPS, minimumBitrateBps } from "./bitrate-floor";
import { Resolution } from "./enums";

describe("minimumBitrateBps (base da regra R5)", () => {
  it("usa a faixa de até 30 fps no limite dos 30 quadros", () => {
    expect(minimumBitrateBps(Resolution.R1080P, 30)).toBe(5_000_000);
  });

  it("muda de faixa a partir de 31 quadros, sem interpolar entre os degraus", () => {
    expect(minimumBitrateBps(Resolution.R1080P, 31)).toBe(6_000_000);
    expect(minimumBitrateBps(Resolution.R1080P, 60)).toBe(6_000_000);
  });

  it("exige mais bitrate quanto maior a resolução, que é a dependência que R5 verifica", () => {
    const pisos = [
      Resolution.R360P,
      Resolution.R480P,
      Resolution.R720P,
      Resolution.R1080P,
      Resolution.R1440P,
      Resolution.R2160P,
    ].map((resolucao) => minimumBitrateBps(resolucao, 30));

    const ordenado = [...pisos].sort((a, b) => a - b);
    expect(pisos).toEqual(ordenado);
  });

  it("não distingue faixa de quadros em 480p e 360p, onde as fontes não distinguem", () => {
    expect(minimumBitrateBps(Resolution.R480P, 30)).toBe(minimumBitrateBps(Resolution.R480P, 60));
    expect(minimumBitrateBps(Resolution.R360P, 30)).toBe(minimumBitrateBps(Resolution.R360P, 60));
  });

  it("cobre todas as resoluções do enum, para R5 nunca cair em piso indefinido", () => {
    for (const resolucao of Object.values(Resolution)) {
      expect(BITRATE_FLOOR_BPS[resolucao]).toBeDefined();
      expect(minimumBitrateBps(resolucao, 60)).toBeGreaterThan(0);
    }
  });
});

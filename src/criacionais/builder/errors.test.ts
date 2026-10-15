import { describe, expect, it } from "vitest";
import { InvalidStreamConfigError } from "./errors";

describe("InvalidStreamConfigError", () => {
  it("expõe todas as violações recebidas, não apenas a primeira (D5)", () => {
    const erro = new InvalidStreamConfigError(["R1 ...", "R3 ..."]);

    expect(erro.violations).toEqual(["R1 ...", "R3 ..."]);
  });

  it("lista as violações na mensagem, para o erro ser legível sem inspecionar o objeto", () => {
    const erro = new InvalidStreamConfigError(["R1 título vazio"]);

    expect(erro.message).toContain("R1 título vazio");
  });

  it("é capturável como Error e identificável pelo nome", () => {
    const erro = new InvalidStreamConfigError([]);

    expect(erro).toBeInstanceOf(Error);
    expect(erro.name).toBe("InvalidStreamConfigError");
  });

  it("congela a lista para o erro não ser alterado depois de lançado", () => {
    const violacoes = ["R1 ..."];
    const erro = new InvalidStreamConfigError(violacoes);

    violacoes.push("R3 ...");

    expect(erro.violations).toHaveLength(1);
    expect(Object.isFrozen(erro.violations)).toBe(true);
  });
});

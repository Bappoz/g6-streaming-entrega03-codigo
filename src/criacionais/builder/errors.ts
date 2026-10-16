/**
 * Erro lançado por `build()` quando a configuração montada viola alguma regra.
 *
 * Decisão D5 do ADR-001: o erro carrega **todas** as violações encontradas, não
 * apenas a primeira. Quem monta uma configuração de transmissão erra em mais de um
 * campo por vez (resolução alta com bitrate baixo e fps acima do teto, por exemplo);
 * falhar na primeira regra obrigaria a corrigir, rodar de novo e descobrir a
 * seguinte. Por isso `validate()` acumula e só então lança.
 */
export class InvalidStreamConfigError extends Error {
  /** Mensagens de violação, uma por regra quebrada, prefixadas pelo id da regra no ADR-001 (R1–R5). */
  readonly violations: readonly string[];

  constructor(violations: readonly string[]) {
    super(`Configuração de transmissão inválida:\n- ${violations.join("\n- ")}`);
    // `name` explícito: subclasses de Error perdem o nome útil em stack trace e em log.
    this.name = "InvalidStreamConfigError";
    this.violations = Object.freeze([...violations]);
  }
}

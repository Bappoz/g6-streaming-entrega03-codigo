import { Resolution } from "./enums";

/**
 * Piso de bitrate por resolução e faixa de taxa de quadros — base da regra R5.
 *
 * **De onde vêm os números.** São as faixas mínimas recomendadas publicadas por
 * plataformas de transmissão ao vivo, arquivadas como evidências E10 e E12 do
 * ADR-001. O ponto que sustenta a regra não é o valor em si, e sim a dependência
 * que as duas fontes mostram: o bitrate mínimo aceitável sobe junto com a
 * resolução **e** com a taxa de quadros. É essa interdependência que um construtor
 * simples não tem onde verificar.
 *
 * **Limite declarado.** Os valores são de referência, não normativos para o sistema
 * modelado. Por isso a tabela é um dado exportado e não números soltos dentro do
 * `if` da validação: trocar a política de qualidade é editar esta tabela, sem tocar
 * no ConcreteBuilder.
 *
 * Duas faixas de taxa de quadros, como nas fontes: até 30 fps e de 31 a 60 fps.
 * Em 480p e 360p as fontes não distinguem as faixas, e a tabela repete o valor em
 * vez de inventar um degrau que a evidência não mostra.
 */
export interface BitrateFloor {
  /** Piso para transmissões de até 30 quadros por segundo, em bits por segundo. */
  readonly upTo30Fps: number;
  /** Piso para transmissões de 31 a 60 quadros por segundo, em bits por segundo. */
  readonly upTo60Fps: number;
}

const MBPS = 1_000_000;

export const BITRATE_FLOOR_BPS: Readonly<Record<Resolution, BitrateFloor>> = Object.freeze({
  [Resolution.R360P]: { upTo30Fps: 0.4 * MBPS, upTo60Fps: 0.4 * MBPS },
  [Resolution.R480P]: { upTo30Fps: 0.4 * MBPS, upTo60Fps: 0.4 * MBPS },
  [Resolution.R720P]: { upTo30Fps: 3 * MBPS, upTo60Fps: 3 * MBPS },
  [Resolution.R1080P]: { upTo30Fps: 5 * MBPS, upTo60Fps: 6 * MBPS },
  [Resolution.R1440P]: { upTo30Fps: 7 * MBPS, upTo60Fps: 8 * MBPS },
  [Resolution.R2160P]: { upTo30Fps: 11 * MBPS, upTo60Fps: 14 * MBPS },
});

/** Taxa de quadros a partir da qual se usa a faixa mais exigente da tabela. */
export const HIGH_FRAME_RATE_THRESHOLD = 30;

/**
 * Piso de bitrate, em bits por segundo, para a combinação resolução × taxa de quadros.
 *
 * Trata a taxa de quadros por faixa, e não por interpolação: as fontes publicam dois
 * degraus, e interpolar produziria um número que nenhuma evidência sustenta.
 */
export function minimumBitrateBps(resolution: Resolution, framesPerSecond: number): number {
  const floor = BITRATE_FLOOR_BPS[resolution];
  return framesPerSecond > HIGH_FRAME_RATE_THRESHOLD ? floor.upTo60Fps : floor.upTo30Fps;
}

import type { LatencyMode } from "../builder";
import { LiveStreamStatus } from "./enums";
import { UserContent, type UserContentFields } from "./user-content";

/** Campos de uma `LiveStream`, além dos comuns a todo conteúdo. */
export interface LiveStreamFields extends UserContentFields {
  readonly channelId: string;
  readonly latencyMode: LatencyMode;
  readonly recordAutomatically: boolean;
}

/**
 * ConcreteProduct — transmissão ao vivo (`LiveStream` do diagrama v3).
 *
 * Nasce em `CREATED`, vai a `LIVE` com `markLive()` e termina em `ENDED` ou `FAILED`.
 * As transições seguem a máquina M4 da Entrega 02; uma chamada fora de ordem lança erro
 * em vez de ser ignorada, porque um `finish()` silencioso numa live que nunca entrou no
 * ar esconderia um defeito do chamador.
 *
 * Mídia pronta (regra 8 do v3) significa estar no ar: uma live criada e ainda não
 * iniciada não tem o que exibir, e uma encerrada passa a ser exibida pela gravação.
 */
export class LiveStream extends UserContent {
  readonly channelId: string;
  readonly latencyMode: LatencyMode;
  readonly recordAutomatically: boolean;
  private currentStatus = LiveStreamStatus.CREATED;
  private started: Date | undefined;
  private ended: Date | undefined;
  private failure: string | undefined;

  constructor(fields: LiveStreamFields) {
    super(fields);
    this.channelId = fields.channelId;
    this.latencyMode = fields.latencyMode;
    this.recordAutomatically = fields.recordAutomatically;
  }

  get status(): LiveStreamStatus {
    return this.currentStatus;
  }

  get startedAt(): Date | undefined {
    return this.started;
  }

  get endedAt(): Date | undefined {
    return this.ended;
  }

  /** Motivo da falha, quando `status` é `FAILED`. */
  get failureReason(): string | undefined {
    return this.failure;
  }

  markLive(at: Date = new Date()): void {
    this.requireStatus("markLive", LiveStreamStatus.CREATED);
    this.currentStatus = LiveStreamStatus.LIVE;
    this.started = at;
  }

  finish(at: Date = new Date()): void {
    this.requireStatus("finish", LiveStreamStatus.LIVE);
    this.currentStatus = LiveStreamStatus.ENDED;
    this.ended = at;
  }

  fail(reason: string): void {
    this.requireStatus("fail", LiveStreamStatus.CREATED, LiveStreamStatus.LIVE);
    this.currentStatus = LiveStreamStatus.FAILED;
    this.failure = reason;
  }

  override isMediaReady(): boolean {
    return this.currentStatus === LiveStreamStatus.LIVE;
  }

  private requireStatus(operation: string, ...allowed: readonly LiveStreamStatus[]): void {
    if (!allowed.includes(this.currentStatus)) {
      throw new Error(
        `${operation}() não é permitido em ${this.currentStatus}; esperado: ${allowed.join(" ou ")}`,
      );
    }
  }
}

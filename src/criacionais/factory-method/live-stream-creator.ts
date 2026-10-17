import type { StreamConfig } from "../builder";
import { LiveStream } from "./live-stream";
import { UserContentCreator } from "./user-content-creator";

/** Entrada de `LiveStreamService.createStream(userId, config)` no diagrama v3, mais o canal. */
export interface LiveStreamInput {
  readonly ownerId: string;
  readonly channelId: string;
  /** Configuração já validada pelo Builder (ADR-001). */
  readonly config: StreamConfig;
}

/**
 * ConcreteCreator — cria `LiveStream`.
 *
 * Ocupa o lugar de `LiveStreamService.createStream(userId, config: StreamConfig)` do
 * diagrama v3. É o ponto em que os dois padrões da subequipe se encontram: o Builder
 * entrega um `StreamConfig` válido e imutável, e este criador o transforma em conteúdo.
 * Nenhuma regra da configuração é verificada de novo aqui — essa é a garantia que o
 * `build()` do Builder já deu.
 *
 * A live nasce em `CREATED`; por isso `submit` a registra e modera, mas só a publica
 * depois de `markLive()`, quando a mídia passa a existir (regra F6).
 *
 * **O que não é copiado.** O perfil de vídeo do `StreamConfig` (`resolution`,
 * `framesPerSecond` e `bitrateBps`, decisão D1 do ADR-001) fica fora da live. A
 * `LiveStream` do v3 não tem esses atributos, e na Entrega 02 o perfil é configurado no
 * encoder do cliente (evidências E06 e E07 do ADR-001). O Builder valida o perfil para
 * essa configuração; o conteúdo registra só o que o modelo atribui à live. Guardá-lo
 * aqui seria uma segunda revisão do v3, além da D1.
 */
export class LiveStreamCreator extends UserContentCreator<LiveStreamInput, LiveStream> {
  protected override createContent(input: LiveStreamInput): LiveStream {
    const { config } = input;
    return new LiveStream({
      id: this.nextId(),
      ownerId: input.ownerId,
      channelId: input.channelId,
      title: config.title,
      visibility: config.visibility,
      latencyMode: config.latencyMode,
      recordAutomatically: config.recordAutomatically,
      createdAt: this.currentTime(),
    });
  }
}

import { LatencyMode, Resolution } from "./enums";
import type { StreamConfig } from "./stream-config";
import type { StreamConfigBuilder } from "./stream-config-builder";
import type { VideoSettings } from "./video-settings";

/**
 * Receita de um preset: o que o Director fixa além do título.
 *
 * Visibilidade e gravação ficam de fora de propósito: são escolhas do criador, não do
 * perfil técnico da transmissão, e o preset herda os padrões do builder (`PUBLIC` e
 * gravação ligada, decisão D3).
 */
interface Preset {
  readonly latencyMode: LatencyMode;
  readonly video: VideoSettings;
}

const MBPS = 1_000_000;

/**
 * Valores dos presets. Cada um respeita as regras do ADR-001 com folga, para que uma
 * revisão da tabela de pisos (`bitrate-floor.ts`) não derrube um preset por poucos kbps.
 *
 * - **Baixa latência:** 720p a 30 fps com `LOW`. 2160p está fora por R4; 720p é a
 *   maior resolução cujo piso (3 Mbps) cabe com folga numa rede doméstica comum.
 * - **Alta qualidade:** 2160p a 60 fps com `STANDARD`, a única latência que R4 aceita
 *   em 4K. 20 Mbps fica acima do piso de 14 Mbps da faixa 31–60 fps.
 * - **Móvel:** 480p a 30 fps com latência `STANDARD`. Em rede móvel a estabilidade
 *   importa mais que a latência, e o bitrate baixo é o que mantém a transmissão no ar.
 */
const PRESETS = {
  lowLatency: {
    latencyMode: LatencyMode.LOW,
    video: { resolution: Resolution.R720P, framesPerSecond: 30, bitrateBps: 4.5 * MBPS },
  },
  highQuality: {
    latencyMode: LatencyMode.STANDARD,
    video: { resolution: Resolution.R2160P, framesPerSecond: 60, bitrateBps: 20 * MBPS },
  },
  mobile: {
    latencyMode: LatencyMode.STANDARD,
    video: { resolution: Resolution.R480P, framesPerSecond: 30, bitrateBps: 1 * MBPS },
  },
} as const satisfies Record<string, Preset>;

/**
 * Director — conhece as receitas de configuração prontas e as executa sobre um builder.
 *
 * O Director depende da **interface** `StreamConfigBuilder`, não do
 * `DefaultStreamConfigBuilder`: é o que permite trocar o ConcreteBuilder (ou usar um
 * dublê em teste) sem tocar nos presets.
 *
 * O builder é recebido no construtor e reaproveitado entre os presets (decisão D6).
 * Como `build()` não limpa o estado, cada preset começa com `reset()`: sem isso, um
 * campo definido por quem usou o builder antes — ou pelo preset anterior — vazaria
 * para a configuração seguinte.
 *
 * O título é o único dado que vem do cliente. A validação continua toda no `build()`
 * do ConcreteBuilder (decisão D4): um título vazio sai daqui como
 * `InvalidStreamConfigError` com a violação R1, sem checagem duplicada no Director.
 */
export class StreamConfigDirector {
  constructor(private readonly builder: StreamConfigBuilder) {}

  /** Transmissão interativa (bate-papo, jogo com o público): prioriza o atraso baixo. */
  lowLatency(title: string): StreamConfig {
    return this.make(title, PRESETS.lowLatency);
  }

  /** Transmissão em 4K a 60 fps: prioriza a imagem e aceita a latência padrão. */
  highQuality(title: string): StreamConfig {
    return this.make(title, PRESETS.highQuality);
  }

  /** Transmissão a partir do celular: bitrate baixo para sobreviver à rede móvel. */
  mobile(title: string): StreamConfig {
    return this.make(title, PRESETS.mobile);
  }

  private make(title: string, preset: Preset): StreamConfig {
    const { resolution, framesPerSecond, bitrateBps } = preset.video;
    return this.builder
      .reset()
      .withTitle(title)
      .withLatencyMode(preset.latencyMode)
      .withVideo(resolution, framesPerSecond, bitrateBps)
      .build();
  }
}

/**
 * API pública do padrão Builder.
 *
 * O Director e a demonstração importam daqui, e não dos arquivos internos: assim a
 * organização dos módulos pode mudar sem quebrar o código de quem consome o padrão.
 */
export { BITRATE_FLOOR_BPS, minimumBitrateBps } from "./bitrate-floor";
export { DefaultStreamConfigBuilder } from "./default-stream-config-builder";
export { ContentVisibility, LatencyMode, Resolution } from "./enums";
export { InvalidStreamConfigError } from "./errors";
export { StreamConfig } from "./stream-config";
export type { StreamConfigBuilder } from "./stream-config-builder";
export { StreamConfigDirector } from "./stream-config-director";
export type { VideoSettings } from "./video-settings";

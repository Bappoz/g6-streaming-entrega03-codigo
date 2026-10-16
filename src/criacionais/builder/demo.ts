/**
 * Client — demonstração do Builder no terminal (`npm run demo:builder`).
 *
 * Faz o papel de quem chama `LiveStreamService.createStream(userId, config)` na
 * Entrega 02: precisa de um `StreamConfig` válido e não quer saber como ele é montado.
 * A demo percorre os três usos do padrão, na ordem do roteiro do vídeo:
 *
 * 1. presets prontos pelo Director;
 * 2. configuração sob medida direto no builder;
 * 3. configuração inválida rejeitada no `build()`, com todas as violações de uma vez.
 */
import {
  ContentVisibility,
  DefaultStreamConfigBuilder,
  InvalidStreamConfigError,
  LatencyMode,
  Resolution,
  type StreamConfig,
  StreamConfigDirector,
} from "./index";

function describeConfig(config: StreamConfig): string {
  const video = config.hasVideoProfile
    ? `${config.resolution} · ${config.framesPerSecond} fps · ${(config.bitrateBps ?? 0) / 1_000_000} Mbps`
    : "sem perfil de vídeo";
  return [
    `  título:       ${config.title}`,
    `  vídeo:        ${video}`,
    `  latência:     ${config.latencyMode}`,
    `  visibilidade: ${config.visibility}`,
    `  gravação:     ${config.recordAutomatically ? "ligada" : "desligada"}`,
    `  imutável:     ${Object.isFrozen(config) ? "sim" : "não"}`,
  ].join("\n");
}

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

const builder = new DefaultStreamConfigBuilder();
const director = new StreamConfigDirector(builder);

section("1. Presets do Director (mesmo builder, reaproveitado com reset)");
console.log("\nlowLatency:");
console.log(describeConfig(director.lowLatency("Bate-papo com o público")));
console.log("\nhighQuality:");
console.log(describeConfig(director.highQuality("Show ao vivo em 4K")));
console.log("\nmobile:");
console.log(describeConfig(director.mobile("Direto da rua")));

section("2. Configuração sob medida, passo a passo no builder");
const custom = builder
  .reset()
  .withTitle("Aula fechada para a turma")
  .withVisibility(ContentVisibility.UNLISTED)
  .withVideo(Resolution.R1080P, 30, 6_000_000)
  .withRecording(false)
  .build();
console.log(describeConfig(custom));

section("3. Configuração inválida rejeitada no build()");
console.log("\nTítulo vazio + 4K com latência ULTRA_LOW + 75 fps + 2 Mbps (abaixo do piso de 4K):");
try {
  builder
    .reset()
    .withTitle("")
    .withLatencyMode(LatencyMode.ULTRA_LOW)
    .withVideo(Resolution.R2160P, 75, 2_000_000)
    .build();
  console.log("  (inesperado) a configuração foi aceita");
} catch (erro) {
  if (!(erro instanceof InvalidStreamConfigError)) {
    throw erro;
  }
  console.log(`  ${erro.name}: ${erro.violations.length} violações`);
  for (const violation of erro.violations) {
    console.log(`  - ${violation}`);
  }
}

console.log("\nPreset com título vazio também passa pela mesma validação:");
try {
  director.highQuality("   ");
} catch (erro) {
  if (!(erro instanceof InvalidStreamConfigError)) {
    throw erro;
  }
  console.log(`  - ${erro.violations.join("\n  - ")}`);
}

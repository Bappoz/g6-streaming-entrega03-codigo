import {
  ContentVisibility,
  DefaultStreamConfigBuilder,
  LatencyMode,
  Resolution,
  type StreamConfigBuilder,
} from "../../src/criacionais/builder";
import type { Scenario } from "../measure";

/**
 * Cenário do Builder: quanto custa montar `StreamConfig` pelo padrão.
 *
 * Três braços, escolhidos para separar dois custos que costumam ser confundidos:
 *
 * - `builder-novo` — o caminho normal do cliente: um builder por configuração.
 * - `builder-reutilizado` — um único builder com `reset()` entre as montagens, que é o
 *   uso previsto no Director. A diferença entre os dois braços é o que a decisão D6 do
 *   ADR-001 promete; medir isso é o que transforma a promessa em dado.
 * - `manual` — literal congelado, sem validação, equivalente à alternativa B do ADR.
 *
 * **Ressalva que não pode sumir do relatório:** o braço manual não valida nada. A
 * diferença medida é "custo do padrão **mais** custo da validação", não só o custo do
 * padrão. Quem quiser separar as duas parcelas precisa de um quarto braço com
 * validação inline — que não foi incluído porque reescreveria as regras R1–R5 em um
 * segundo lugar, exatamente o que o padrão existe para evitar.
 */

const TITLE = "Transmissão de referência";
const FPS = 60;
const BITRATE_BPS = 6_000_000;

/** Um builder só, reaproveitado entre as iterações do braço correspondente. */
const sharedBuilder: StreamConfigBuilder = new DefaultStreamConfigBuilder();

export const builderScenario: Scenario = {
  name: "builder",
  description:
    "Montagem de StreamConfig pelo Builder (instância nova e instância reutilizada) contra literal congelado sem validação.",
  caveats: [
    "O braço 'manual' não executa as regras R1-R5; a diferença medida inclui o custo da validação, não apenas o do padrão.",
    "Os três braços produzem objetos congelados com os mesmos campos, mas só os braços do Builder garantem que a combinação é válida.",
    "Medida de memória só é válida quando environment.gcAvailable é true (node --expose-gc).",
  ],
  arms: [
    {
      name: "builder-novo",
      description: "Um DefaultStreamConfigBuilder por configuração, com validação em build().",
      run: () => {
        const config = new DefaultStreamConfigBuilder()
          .withTitle(TITLE)
          .withVisibility(ContentVisibility.PUBLIC)
          .withLatencyMode(LatencyMode.STANDARD)
          .withRecording(true)
          .withVideo(Resolution.R1080P, FPS, BITRATE_BPS)
          .build();
        return config.framesPerSecond ?? 0;
      },
    },
    {
      name: "builder-reutilizado",
      description: "Um único builder reaproveitado via reset(), como o Director faz (D6).",
      run: () => {
        const config = sharedBuilder
          .reset()
          .withTitle(TITLE)
          .withVisibility(ContentVisibility.PUBLIC)
          .withLatencyMode(LatencyMode.STANDARD)
          .withRecording(true)
          .withVideo(Resolution.R1080P, FPS, BITRATE_BPS)
          .build();
        return config.framesPerSecond ?? 0;
      },
    },
    {
      name: "manual",
      description: "Literal congelado com os mesmos campos, sem nenhuma validação.",
      run: () => {
        const config = Object.freeze({
          title: TITLE,
          visibility: ContentVisibility.PUBLIC,
          latencyMode: LatencyMode.STANDARD,
          recordAutomatically: true,
          resolution: Resolution.R1080P,
          framesPerSecond: FPS,
          bitrateBps: BITRATE_BPS,
        });
        return config.framesPerSecond;
      },
    },
  ],
};

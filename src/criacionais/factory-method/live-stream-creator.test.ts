import { describe, expect, it } from "vitest";
import {
  ContentVisibility,
  DefaultStreamConfigBuilder,
  LatencyMode,
  Resolution,
  StreamConfigDirector,
} from "../builder";
import { LiveStreamStatus, ModerationResult } from "./enums";
import { BlocklistPolicyService, InMemoryContentRepository } from "./in-memory";
import { LiveStream } from "./live-stream";
import { LiveStreamCreator } from "./live-stream-creator";
import type { PolicyService } from "./ports";
import { UserContentCreator } from "./user-content-creator";

function setup(blockedTerms: readonly string[] = []) {
  const repository = new InMemoryContentRepository();
  const policy = new BlocklistPolicyService(repository, blockedTerms);
  const creator = new LiveStreamCreator({ repository, policy, newId: () => "live-1" });
  return { repository, creator };
}

describe("LiveStreamCreator (ConcreteCreator)", () => {
  it("é um UserContentCreator cujo método-fábrica instancia LiveStream", () => {
    const { creator } = setup();
    const config = new StreamConfigDirector(new DefaultStreamConfigBuilder()).lowLatency("Live");

    const live = creator.submit({ ownerId: "criadora", channelId: "canal-1", config });

    expect(creator).toBeInstanceOf(UserContentCreator);
    expect(live).toBeInstanceOf(LiveStream);
  });

  it("copia para a live a configuração montada pelo Builder, sem revalidar", () => {
    const { creator } = setup();
    const config = new DefaultStreamConfigBuilder()
      .withTitle("Aula fechada")
      .withVisibility(ContentVisibility.UNLISTED)
      .withLatencyMode(LatencyMode.ULTRA_LOW)
      .withRecording(false)
      .withVideo(Resolution.R720P, 30, 4_000_000)
      .build();

    const live = creator.submit({ ownerId: "criadora", channelId: "canal-1", config });

    expect(live.id).toBe("live-1");
    expect(live.ownerId).toBe("criadora");
    expect(live.channelId).toBe("canal-1");
    expect(live.title).toBe("Aula fechada");
    expect(live.visibility).toBe(ContentVisibility.UNLISTED);
    expect(live.latencyMode).toBe(LatencyMode.ULTRA_LOW);
    expect(live.recordAutomatically).toBe(false);
  });

  it("registra a live em CREATED, aprovada mas ainda não publicada", () => {
    const { creator, repository } = setup();
    const config = new StreamConfigDirector(new DefaultStreamConfigBuilder()).mobile("Da rua");

    const live = creator.submit({ ownerId: "criadora", channelId: "canal-1", config });

    expect(live.status).toBe(LiveStreamStatus.CREATED);
    expect(live.moderationStatus).toBe(ModerationResult.APPROVED);
    expect(live.isPublished()).toBe(false);
    expect(repository.findContentById("live-1")).toBe(live);
  });

  it("cria outra live ao repetir o submit depois de a moderação falhar", () => {
    const repository = new InMemoryContentRepository();
    let chamadas = 0;
    const policy: PolicyService = {
      moderate: () => {
        chamadas += 1;
        if (chamadas === 1) {
          throw new Error("serviço de moderação indisponível");
        }
        return ModerationResult.APPROVED;
      },
    };
    let sequence = 0;
    const creator = new LiveStreamCreator({
      repository,
      policy,
      newId: () => `live-${++sequence}`,
    });
    const config = new StreamConfigDirector(new DefaultStreamConfigBuilder()).mobile("Da rua");
    const input = { ownerId: "criadora", channelId: "canal-1", config };

    expect(() => creator.submit(input)).toThrow("serviço de moderação");
    const segunda = creator.submit(input);

    expect(segunda.id).toBe("live-2");
    expect(segunda.moderationStatus).toBe(ModerationResult.APPROVED);
    expect(repository.findContentById("live-1")?.moderationStatus).toBe(ModerationResult.PENDING);
    expect(repository.size).toBe(2);
  });

  it("deixa a live recusada pela moderação registrada e fora do ar", () => {
    const { creator } = setup(["proibido"]);
    const config = new StreamConfigDirector(new DefaultStreamConfigBuilder()).mobile(
      "Conteúdo proibido",
    );

    const live = creator.submit({ ownerId: "criadora", channelId: "canal-1", config });

    expect(live.moderationStatus).toBe(ModerationResult.REJECTED);
    live.markLive();
    expect(() => live.publish()).toThrow(/^F6 /);
  });
});

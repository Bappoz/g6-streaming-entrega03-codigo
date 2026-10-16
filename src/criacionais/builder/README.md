# Builder — configuração de transmissão

**Estado:** todos os participantes implementados e testados; `npm run demo:builder` roda a demonstração.

Modelagem e decisão completas no repositório de documentação: [Modelagem — Builder](https://github.com/UnBArqDsw2026-2-Turma01/2026.2-T01-_G6_ProjetoStreamingVideo_Entrega_03/blob/main/docs/Base/Relat%C3%B3rios/1.1.1.SubEquipe_01/1.1.1.1.ModelagemBuilder.md) · [ADR-001](https://github.com/UnBArqDsw2026-2-Turma01/2026.2-T01-_G6_ProjetoStreamingVideo_Entrega_03/blob/main/docs/Base/Relat%C3%B3rios/1.1.1.SubEquipe_01/ADR/ADR-001-builder-stream-config.md).

**Problema.** Na Entrega 02, `LiveStreamService` recebe um `StreamConfig` para iniciar a transmissão. Com a decisão D1 do ADR-001, essa configuração passa a ter sete parâmetros, vários opcionais e interdependentes (resolução, taxa de quadros, bitrate, latência, gravação, visibilidade). Um construtor com todos eles é ilegível e aceita combinações inválidas.

## Participantes

| Participante GoF | Elemento | Arquivo | Responsável |
| --- | --- | --- | --- |
| Product | `StreamConfig` (imutável) | `stream-config.ts` | Lucas |
| Builder | `StreamConfigBuilder` | `stream-config-builder.ts` | Lucas |
| ConcreteBuilder | `DefaultStreamConfigBuilder` | `default-stream-config-builder.ts` | Lucas |
| Director | `StreamConfigDirector` | `stream-config-director.ts` | Heitor |
| Client | `demo.ts` | `demo.ts` | Heitor |

Apoio: `enums.ts` (vocabulário de domínio), `video-settings.ts` (perfil de vídeo), `bitrate-floor.ts` (tabela da regra R5), `errors.ts` (`InvalidStreamConfigError`), `index.ts` (API pública do padrão).

## Como a estrutura dos arquivos foi decidida

- **Um arquivo por participante.** O diagrama de classes é a planta deste pacote; quem lê o modelo acha o arquivo pelo nome da classe.
- **Tudo dentro da pasta do padrão, nada em um `src/dominio/` compartilhado.** A pasta de cada padrão é o escopo de uma dupla. Um módulo comum criado agora seria editado em paralelo pelas duas duplas. Quando o Factory Method precisar de `ContentVisibility`, a promoção é um refactor de uma linha, feito com as duas duplas de acordo.
- **`index.ts` como fronteira.** Director e demonstração importam daqui; a organização interna pode mudar sem quebrar quem consome.
- **Testes ao lado do código** (`*.test.ts`), como pede o `CONTRIBUTING.md`.

## Director e presets

`StreamConfigDirector` recebe um `StreamConfigBuilder` (a interface, não a classe concreta) e o reaproveita entre presets (D6). Como `build()` não limpa o estado, todo preset começa com `reset()`; sem isso, um campo definido antes vazaria para a configuração seguinte — um `ULTRA_LOW` esquecido, por exemplo, faria R4 rejeitar o preset 4K.

| Preset | Resolução · fps · bitrate | Latência | Por quê |
| --- | --- | --- | --- |
| `lowLatency` | 720p · 30 · 4,5 Mbps | `LOW` | 2160p está fora por R4; 720p é a maior resolução com piso (3 Mbps) que cabe numa rede doméstica comum |
| `highQuality` | 2160p · 60 · 20 Mbps | `STANDARD` | Única latência que R4 aceita em 4K; acima do piso de 14 Mbps |
| `mobile` | 480p · 30 · 1 Mbps | `STANDARD` | Em rede móvel, estabilidade vale mais que latência |

Todos os bitrates ficam com folga acima do piso de R5, para que uma revisão de `bitrate-floor.ts` não derrube um preset por poucos kbps. Visibilidade e gravação não fazem parte do preset: são escolhas do criador, e ficam nos padrões do builder.

O Director não valida nada por conta própria: o título vem do cliente e passa pelo mesmo `build()`, então um título vazio sai como `InvalidStreamConfigError` com R1.

## Regras de validação

Todas verificadas em `build()` (decisão D4), que acumula **todas** as violações em `InvalidStreamConfigError.violations` (decisão D5). Cada mensagem começa pelo id da regra, que é o elo entre a falha no terminal e a linha do ADR.

| Id | Regra | Onde vive |
| --- | --- | --- |
| R1 | Título não vazio | `validate()` |
| R2 | Resolução, fps e bitrate informados juntos | **garantida pelo tipo** — ver abaixo |
| R3 | Taxa de quadros inteira, positiva e ≤ 60 | `validate()` |
| R4 | Latência `LOW`/`ULTRA_LOW` incompatível com `R2160P` | `validate()` |
| R5 | Bitrate ≥ piso da faixa resolução × fps | `validate()` + `bitrate-floor.ts` |

### Mudança de status da R2 (achado da implementação)

No ADR-001, R2 é uma verificação de tempo de execução: `build()` conferiria se os três campos de vídeo foram informados em bloco. Na implementação ela deixou de ser necessária: `withVideo(resolution, framesPerSecond, bitrateBps)` recebe os três de uma vez, e `VideoSettings` os mantém juntos, então o estado "meio perfil" não chega a existir. Uma regra que o tipo impede de quebrar não tem como ser verificada em runtime sem virar código morto.

**Isso é uma divergência entre o ADR e o código e precisa de uma das duas correções:** registrar R2 no ADR como garantia estrutural, ou mudar a API para métodos por campo e aceitar a verificação tardia. A primeira opção parece melhor — falhar no tipo é mais cedo que falhar no `build()` —, mas a escolha é da subequipe.

### Limite declarado

`StreamConfig.fromBuilder` é público porque TypeScript não tem visibilidade de pacote. Em tese é possível criar um `StreamConfig` sem passar pela validação. A alternativa seria um token secreto compartilhado entre os módulos, que esconderia o padrão atrás de uma gambiarra sem impedir nada de fato em JavaScript.

## Executar

```bash
npm run check        # format:check → lint → typecheck → test
npm run coverage     # testes + cobertura
npm run demo:builder # presets, configuração sob medida e configuração inválida rejeitada
```

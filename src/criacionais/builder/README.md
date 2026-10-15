# Builder — configuração de transmissão

**Estado:** Product, interface e ConcreteBuilder implementados e testados. Director e `demo.ts` pendentes (escopo do Heitor).

Modelagem e decisão completas no repositório de documentação: [Modelagem — Builder](https://github.com/UnBArqDsw2026-2-Turma01/2026.2-T01-_G6_ProjetoStreamingVideo_Entrega_03/blob/main/docs/Base/Relat%C3%B3rios/1.1.1.SubEquipe_01/1.1.1.1.ModelagemBuilder.md) · [ADR-001](https://github.com/UnBArqDsw2026-2-Turma01/2026.2-T01-_G6_ProjetoStreamingVideo_Entrega_03/blob/main/docs/Base/Relat%C3%B3rios/1.1.1.SubEquipe_01/ADR/ADR-001-builder-stream-config.md).

**Problema.** Na Entrega 02, `LiveStreamService` recebe um `StreamConfig` para iniciar a transmissão. Com a decisão D1 do ADR-001, essa configuração passa a ter sete parâmetros, vários opcionais e interdependentes (resolução, taxa de quadros, bitrate, latência, gravação, visibilidade). Um construtor com todos eles é ilegível e aceita combinações inválidas.

## Participantes

| Participante GoF | Elemento | Arquivo | Responsável |
| --- | --- | --- | --- |
| Product | `StreamConfig` (imutável) | `stream-config.ts` | Lucas |
| Builder | `StreamConfigBuilder` | `stream-config-builder.ts` | Lucas |
| ConcreteBuilder | `DefaultStreamConfigBuilder` | `default-stream-config-builder.ts` | Lucas |
| Director | `StreamConfigDirector` | a implementar | Heitor |
| Client | `demo.ts` | a implementar | Heitor |

Apoio: `enums.ts` (vocabulário de domínio), `video-settings.ts` (perfil de vídeo), `bitrate-floor.ts` (tabela da regra R5), `errors.ts` (`InvalidStreamConfigError`), `index.ts` (API pública do padrão).

## Como a estrutura dos arquivos foi decidida

- **Um arquivo por participante.** O diagrama de classes é a planta deste pacote; quem lê o modelo acha o arquivo pelo nome da classe.
- **Tudo dentro da pasta do padrão, nada em um `src/dominio/` compartilhado.** A pasta de cada padrão é o escopo de uma dupla. Um módulo comum criado agora seria editado em paralelo pelas duas duplas. Quando o Factory Method precisar de `ContentVisibility`, a promoção é um refactor de uma linha, feito com as duas duplas de acordo.
- **`index.ts` como fronteira.** Director e demonstração importam daqui; a organização interna pode mudar sem quebrar quem consome.
- **Testes ao lado do código** (`*.test.ts`), como pede o `CONTRIBUTING.md`.

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
npm run demo:builder # pendente: depende do demo.ts (Heitor)
```

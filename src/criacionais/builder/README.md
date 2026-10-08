# Builder — configuração de transmissão

**Estado:** a implementar.

**Problema.** Na Entrega 02, `LiveStreamService` recebe um `StreamConfig` para iniciar a transmissão. A configuração tem muitos parâmetros, vários opcionais e interdependentes (resolução, taxa de quadros, bitrate, latência, gravação, visibilidade). Um construtor com todos eles é ilegível e permite combinações inválidas.

**Participantes previstos**

| Participante GoF | Elemento |
| --- | --- |
| Product | `StreamConfig` (imutável) |
| Builder | interface `StreamConfigBuilder` |
| ConcreteBuilder | implementação com validação em `build()` |
| Director | `StreamConfigDirector` (presets de transmissão) |
| Client | `demo.ts` |

Arquivos esperados: implementação, `*.test.ts` e `demo.ts` (executado por `npm run demo:builder`).

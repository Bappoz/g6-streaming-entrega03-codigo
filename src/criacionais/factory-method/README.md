# Factory Method — criação de conteúdo do usuário

**Estado:** a implementar.

**Problema.** Na Entrega 02, `LiveStream`, `RecordedVideo` e `Clip` herdam de `UserContent` (decisão DE03) e nascem em pontos distintos do fluxo `LiveStream → RecordedVideo → ClipRequest → Clip`. O código que publica conteúdo não deve conhecer a classe concreta que está sendo criada.

**Participantes previstos**

| Participante GoF | Elemento |
| --- | --- |
| Product | `UserContent` (abstrata) |
| ConcreteProduct | `LiveStream`, `RecordedVideo`, `Clip` |
| Creator | criador abstrato com o método-fábrica e a operação que o utiliza |
| ConcreteCreator | um criador por tipo de conteúdo |
| Client | `demo.ts` |

Arquivos esperados: implementação, `*.test.ts` e `demo.ts` (executado por `npm run demo:factory-method`).

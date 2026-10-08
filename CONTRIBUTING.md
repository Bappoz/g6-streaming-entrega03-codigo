# Como contribuir

1. Atualize a `main` e crie uma branch: `feat/builder-stream-config`, `test/factory-method`, `docs/adr-001`.
2. Implemente dentro da pasta do padrão (`src/criacionais/<padrao>/`). Teste ao lado do código: `arquivo.test.ts`.
3. Rode `npm run check` antes de abrir o PR — a CI roda a mesma sequência e bloqueia o merge se falhar.
4. Commits pequenos em [Conventional Commits](https://www.conventionalcommits.org/pt-br/): `feat(builder): validar bitrate por resolução`.
5. Abra o PR preenchendo o template. **Quem revisa é alguém da outra dupla**; nada entra direto na `main`.

## Convenções de código

- Identificadores em inglês, seguindo os nomes do diagrama de classes da Entrega 02 (`StreamConfig`, `UserContent`, `LiveStream`...). Docstrings e comentários em PT-BR.
- Cada classe indica, em docstring, o **participante GoF** que representa (ex.: `/** ConcreteBuilder — ... */`). É isso que liga o código ao modelo UML.
- Sem biblioteca que implemente o padrão por nós: o padrão é o objeto de estudo.
- Não citar o nome de plataformas reais em código, arquivos ou commits; use "plataforma de streaming".

## IA Generativa

O uso é permitido e **deve ser registrado**. Ao usar IA em um PR, anote para o seu relato individual: ferramenta, o que foi pedido, o que foi aproveitado ou descartado e como o resultado foi validado (teste, revisão, leitura do GoF).

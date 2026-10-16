/**
 * Vocabulário de domínio usado pelo Builder de configuração de transmissão.
 *
 * Os três tipos aparecem como `enumeration` no diagrama de classes da Entrega 02
 * (`LatencyMode` e `ContentVisibility`) e no diagrama do Builder (`Resolution`).
 * Foram declarados como `enum` do TypeScript — e não como união de literais de
 * string — para manter a correspondência 1:1 com a notação UML: cada constante do
 * modelo vira uma constante nomeada no código, que é o elo que o professor
 * consegue conferir lendo os dois artefatos lado a lado.
 *
 * Ficam dentro da pasta do Builder, e não em um `src/dominio/` compartilhado,
 * porque a pasta de cada padrão é o escopo de uma dupla: um módulo comum criado
 * agora seria editado por duas pessoas em paralelo. Quando o Factory Method
 * precisar de `ContentVisibility`, a promoção para um módulo compartilhado é um
 * refactor de uma linha — e aí com as duas duplas de acordo.
 */

/** Modo de latência da transmissão ao vivo (diagrama v3 da Entrega 02). */
export enum LatencyMode {
  STANDARD = "STANDARD",
  LOW = "LOW",
  ULTRA_LOW = "ULTRA_LOW",
}

/** Visibilidade do conteúdo publicado (diagrama v3 da Entrega 02). */
export enum ContentVisibility {
  PUBLIC = "PUBLIC",
  UNLISTED = "UNLISTED",
  PRIVATE = "PRIVATE",
}

/**
 * Resolução vertical do vídeo.
 *
 * Decisão D2 do ADR-001: no v3 a resolução era `string` dentro de `QualityVariant`,
 * o que deixava passar `"4k"`, `"2160"` e `"3840x2160"` como valores diferentes para
 * a mesma coisa. A regra R4 compara a resolução com 2160p, então o tipo precisa ser
 * fechado — caso contrário a validação dependeria de o cliente escrever a string certa.
 */
export enum Resolution {
  R360P = "R360P",
  R480P = "R480P",
  R720P = "R720P",
  R1080P = "R1080P",
  R1440P = "R1440P",
  R2160P = "R2160P",
}

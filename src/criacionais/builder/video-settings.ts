import type { Resolution } from "./enums";

/**
 * Perfil de vídeo da transmissão: resolução, taxa de quadros e bitrate.
 *
 * Os três andam **juntos** — essa é a regra R2 do ADR-001. Em vez de deixar três
 * campos opcionais independentes e checar em `validate()` se foram preenchidos em
 * bloco, eles foram agrupados em um único tipo: assim "nenhum ou todos" deixa de ser
 * uma regra que pode falhar em tempo de execução e passa a ser garantida pelo tipo.
 *
 * O efeito disso na modelagem está registrado no README do padrão: R2 saiu da lista
 * de verificações de `validate()` e virou propriedade estrutural da API.
 */
export interface VideoSettings {
  readonly resolution: Resolution;
  readonly framesPerSecond: number;
  readonly bitrateBps: number;
}

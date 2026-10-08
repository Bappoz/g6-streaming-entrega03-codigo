import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // O repositório nasce sem implementação; remover quando o primeiro teste entrar.
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/demo.ts"],
      reporter: ["text", "html", "json-summary"],
    },
  },
});

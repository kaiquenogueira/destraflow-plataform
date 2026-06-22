import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Clients Prisma gerados + relatório de cobertura — não lintar.
    "src/generated/**",
    "coverage/**",
  ]),
  // Guardrails estruturais (warn): sinalizam módulos rasos sem quebrar o build.
  // Suba para "error" e endureça os limites conforme a refatoração dos sprints.
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts"],
    rules: {
      complexity: ["warn", 14],
      "max-lines": ["warn", { max: 320, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 100, skipBlankLines: true, skipComments: true }],
      "max-depth": ["warn", 4],
      "max-params": ["warn", 5],
    },
  },
  // Correção crítica (error): promises não-aguardadas engolem erros silenciosamente
  // nos caminhos de worker/campanhas/Evolution. Requer lint type-aware.
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Sprint 08: 7 sites corrigidos com `void` (fire-and-forget explícito); regra em error.
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  // NOTA: `no-restricted-imports` proibindo `@/lib/prisma` fora de src/lib/tenant.ts
  // NÃO é aplicado ainda — worker.ts/campaigns.ts usam o client CRM central de forma
  // legítima (quota de IA). Ativar após a migração feature-slice (ver docs/HARNESS-ENGINEERING.md §4).
  //
  // Sprint 08 — ratchet warn→error: a dívida de lint pré-existente (lint vinha vermelho
  // quando o gate foi ligado) foi quitada site-a-site e estas regras voltaram para "error".
  // `any` permanece "off" em testes (mocks): tipar ~94 mocks = alto custo/baixo valor (P2).
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts", "__mocks__/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "react/no-unescaped-entities": "error",
      "react-hooks/error-boundaries": "error",
    },
  },
  // `any` em mocks de teste é tolerado (ver Sprint 08 P2).
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;

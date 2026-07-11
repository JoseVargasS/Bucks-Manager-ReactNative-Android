/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "mjs"],
  testMatch: ["**/tests/**/*.test.{ts,tsx,mjs}"],
  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: {
        module: "esnext",
        target: "es2022",
        jsx: "react-jsx",
        baseUrl: ".",
        paths: { "@/*": ["src/*"] },
        types: ["jest", "node"],
        allowImportingTsExtensions: true,
        noEmit: true,
        verbatimModuleSyntax: false,
      },
      diagnostics: false,
    }],
    "^.+\\.mjs$": ["babel-jest", { presets: [["@babel/preset-env", { targets: { node: "current" } }]] }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

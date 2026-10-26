import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

const config: Config = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    // next-auth est un module ES : auth.ts (importé en « @/auth » ou en relatif) et next-auth sont remplacés par des doublures
    "(^|/)auth$": "<rootDir>/test-utils/auth.mock.ts",
    "^next-auth$": "<rootDir>/test-utils/next-auth.mock.ts",
    "^@/(.*)$": "<rootDir>/$1",
  },
  coverageReporters: ["html", "text", "text-summary", "cobertura"],
  testMatch: ["**/*.test.ts", "**/__tests__/**"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);

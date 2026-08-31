import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@payload-config$': '<rootDir>/payload.config.ts',
    // Исходники контент-завода — ESM и импортируют соседей с расширением .js.
    // Jest грузит те же файлы как .ts, поэтому расширение снимаем.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/node_modules_old/', '<rootDir>/_files/'],
  watchPathIgnorePatterns: ['<rootDir>/node_modules_old/', '<rootDir>/_files/'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/_files/',
    '<rootDir>/.claude/worktrees/',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/next-cache.ts'],
  forceExit: true,
}

export default config

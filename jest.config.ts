import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/node_modules_old/'],
  watchPathIgnorePatterns: ['<rootDir>/node_modules_old/'],
}

export default config

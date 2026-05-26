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
  },
  modulePathIgnorePatterns: ['<rootDir>/node_modules_old/', '<rootDir>/_files/'],
  watchPathIgnorePatterns: ['<rootDir>/node_modules_old/', '<rootDir>/_files/'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/_files/'],
  forceExit: true,
}

export default config

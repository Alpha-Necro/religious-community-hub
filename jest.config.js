module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts',
    '**/src/__tests__/**/*.test.ts',
    '**/src/?(*.)+(spec|test).ts'
  ],
  moduleDirectories: ['node_modules', 'src', 'server/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@server/(.*)$': '<rootDir>/server/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  coveragePathIgnorePatterns: ['node_modules', 'src/test'],
  testPathIgnorePatterns: ['node_modules', 'src/test'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    'server/src/**/*.ts',
    '!**/__mocks__/**',
    '!**/test/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

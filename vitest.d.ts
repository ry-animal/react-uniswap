/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';

declare module 'vitest' {
  export interface Assertion<T = any> extends jest.Matchers<void, T> {}
  export interface AsymmetricMatchersContaining extends jest.AsymmetricMatchers {}
}

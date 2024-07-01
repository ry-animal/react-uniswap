import { describe, test, expect } from 'vitest';
import { cn, formatBalance } from './utils';

describe('cn function', () => {
  test('merges class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  test('handles conditional classes', () => {
    expect(cn('class1', { class2: true, class3: false })).toBe('class1 class2');
  });
});

describe('formatBalance function', () => {
  test('formats whole numbers correctly', () => {
    expect(formatBalance(1000)).toBe('1,000');
  });

  test('formats numbers with decimals correctly', () => {
    expect(formatBalance(1000.1234)).toBe('1,000.1234');
  });

  test('rounds to 4 decimal places', () => {
    expect(formatBalance(1000.12345)).toBe('1,000.1235');
  });

  test('removes trailing zeros', () => {
    expect(formatBalance(1000.1)).toBe('1,000.1');
  });

  test('handles zero correctly', () => {
    expect(formatBalance(0)).toBe('0');
  });

  test('handles string input', () => {
    expect(formatBalance('1000.1')).toBe('1,000.1');
  });

  test('handles null input', () => {
    expect(formatBalance(null)).toBe('0');
  });

  test('handles undefined input', () => {
    expect(formatBalance(undefined)).toBe('0');
  });

  test('handles NaN input', () => {
    expect(formatBalance(NaN)).toBe('0');
  });

  test('handles very large numbers', () => {
    expect(formatBalance(1000000000.1234)).toBe('1,000,000,000.1234');
  });
});

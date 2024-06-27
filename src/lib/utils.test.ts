import { describe, it, expect } from 'vitest';
import { formatBalance } from './utils';

describe('formatBalance', () => {
  it('formats whole numbers with commas', () => {
    expect(formatBalance('10000')).toBe('10,000');
    expect(formatBalance(1000000)).toBe('1,000,000');
  });

  it('rounds to 4 decimal places', () => {
    expect(formatBalance('10000.100684')).toBe('10,000.1007');
    expect(formatBalance(10000.100684)).toBe('10,000.1007');
    expect(formatBalance('0.123456')).toBe('0.1235');
    expect(formatBalance(0.123456)).toBe('0.1235');
  });

  it('keeps significant decimal places up to 4', () => {
    expect(formatBalance('10000.1')).toBe('10,000.1');
    expect(formatBalance(10000.12)).toBe('10,000.12');
    expect(formatBalance('10000.123')).toBe('10,000.123');
    expect(formatBalance(10000.1234)).toBe('10,000.1234');
  });

  it('handles small numbers', () => {
    expect(formatBalance('0.000123')).toBe('0.0001');
    expect(formatBalance(0.000123)).toBe('0.0001');
    expect(formatBalance('0.00012345')).toBe('0.0001');
  });

  it('handles numbers close to rounding thresholds', () => {
    expect(formatBalance('0.00005')).toBe('0.0001');
    expect(formatBalance(0.00004)).toBe('0');
    expect(formatBalance('1.99995')).toBe('2');
  });

  it('handles edge cases', () => {
    expect(formatBalance(null)).toBe('0');
    expect(formatBalance(undefined)).toBe('0');
    expect(formatBalance('not a number')).toBe('0');
  });

  it('formats large numbers with commas and 4 decimal places', () => {
    expect(formatBalance('1234567.89')).toBe('1,234,567.89');
    expect(formatBalance(9876543.21)).toBe('9,876,543.21');
    expect(formatBalance('1000000.000001')).toBe('1,000,000');
  });
});

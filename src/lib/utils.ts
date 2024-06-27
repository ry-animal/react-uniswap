import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBalance(balance: string | number | null | undefined): string {
  if (balance === null || balance === undefined || isNaN(Number(balance))) {
    return '0';
  }

  const num = Number(balance);

  const rounded = Math.round(num * 10000) / 10000;

  let result = rounded.toFixed(4);

  result = result.replace(/\.?0+$/, '');

  if (result.indexOf('.') === -1) {
    result = result.replace(/\.0+$/, '');
  }

  const parts = result.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return parts.join('.');
}

import { Token } from '@uniswap/sdk-core';
import { ethers } from 'ethers';
import {
  MAINNET_CHAIN_ID,
  SEPOLIA_CHAIN_ID,
  DEFAULT_NATIVE_ADDRESS,
  MAINNET_ETH,
  MAINNET_USDC,
  SEPOLIA_ETH,
  SEPOLIA_USDC,
  UNISWAP_V2_ADDRESSES,
  WRAPPED_NATIVE_TOKEN,
  createToken,
  tokenList,
} from './constants';
import { describe, test, expect } from 'vitest';

describe('Constants', () => {
  test('Chain IDs are correct', () => {
    expect(MAINNET_CHAIN_ID).toBe(1);
    expect(SEPOLIA_CHAIN_ID).toBe(11155111);
  });

  test('DEFAULT_NATIVE_ADDRESS is zero address', () => {
    expect(DEFAULT_NATIVE_ADDRESS).toBe(ethers.constants.AddressZero);
  });

  test('UNISWAP_V2_ADDRESSES are defined for mainnet and sepolia', () => {
    expect(UNISWAP_V2_ADDRESSES.mainnet).toBeDefined();
    expect(UNISWAP_V2_ADDRESSES.sepolia).toBeDefined();
    expect(UNISWAP_V2_ADDRESSES.mainnet.factory).toBeTruthy();
    expect(UNISWAP_V2_ADDRESSES.mainnet.router).toBeTruthy();
    expect(UNISWAP_V2_ADDRESSES.sepolia.factory).toBeTruthy();
    expect(UNISWAP_V2_ADDRESSES.sepolia.router).toBeTruthy();
  });

  test('WRAPPED_NATIVE_TOKEN addresses are defined for mainnet and sepolia', () => {
    expect(WRAPPED_NATIVE_TOKEN[MAINNET_CHAIN_ID]).toBeTruthy();
    expect(WRAPPED_NATIVE_TOKEN[SEPOLIA_CHAIN_ID]).toBeTruthy();
  });
});

describe('createToken function', () => {
  test('creates a token with correct properties for MAINNET_ETH', () => {
    const token = createToken(MAINNET_ETH);
    expect(token).toBeInstanceOf(Token);
    expect(token.chainId).toBe(MAINNET_ETH.chainId);
    expect(token.address).toBe(MAINNET_ETH.address);
    expect(token.decimals).toBe(MAINNET_ETH.decimals);
    expect(token.symbol).toBe(MAINNET_ETH.symbol);
    expect(token.name).toBe(MAINNET_ETH.name);
    expect(token.logoURI).toBe(MAINNET_ETH.logoURI);
  });

  test('creates a token with correct properties for MAINNET_USDC', () => {
    const token = createToken(MAINNET_USDC);
    expect(token).toBeInstanceOf(Token);
    expect(token.chainId).toBe(MAINNET_USDC.chainId);
    expect(token.address).toBe(MAINNET_USDC.address);
    expect(token.decimals).toBe(MAINNET_USDC.decimals);
    expect(token.symbol).toBe(MAINNET_USDC.symbol);
    expect(token.name).toBe(MAINNET_USDC.name);
    expect(token.logoURI).toBe(MAINNET_USDC.logoURI);
  });
});

describe('tokenList', () => {
  test('contains the expected tokens', () => {
    expect(tokenList).toContainEqual(MAINNET_ETH);
    expect(tokenList).toContainEqual(MAINNET_USDC);
    expect(tokenList).toContainEqual(SEPOLIA_ETH);
    expect(tokenList).toContainEqual(SEPOLIA_USDC);
  });

  test('all tokens in the list are valid', () => {
    tokenList.forEach((token) => {
      expect(token.name).toBeTruthy();
      expect(token.symbol).toBeTruthy();
      expect(token.address).toBeTruthy();
      expect(token.chainId).toBeDefined();
      expect(token.decimals).toBeDefined();
      expect(token.logoURI).toBeTruthy();
    });
  });
});

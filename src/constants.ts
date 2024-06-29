import { Token, CurrencyAmount } from '@uniswap/sdk-core';
import { ethers } from 'ethers';

export interface ExtendedToken extends Token {
  logoURI: string;
}

export type CustomToken = {
  name: string;
  symbol: string;
  address: string;
  chainId: number;
  decimals: number;
  logoURI: string;
};

export const MAINNET_CHAIN_ID = 1;
export const SEPOLIA_CHAIN_ID = 11155111;

export const DEFAULT_NATIVE_ADDRESS = ethers.constants.AddressZero;

const INFURA_API_KEY = '11c2e756461a4c9aae945e4a2fe66a4d';

export const MAINNET_ETH: CustomToken = {
  name: 'Ethereum',
  symbol: 'ETH',
  address: DEFAULT_NATIVE_ADDRESS,
  chainId: MAINNET_CHAIN_ID,
  decimals: 18,
  logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
};

export const MAINNET_USDC: CustomToken = {
  name: 'USD Coin',
  symbol: 'USDC',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: MAINNET_CHAIN_ID,
  decimals: 6,
  logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=032',
};

export const SEPOLIA_ETH: CustomToken = {
  name: 'Ethereum',
  symbol: 'ETH',
  address: DEFAULT_NATIVE_ADDRESS,
  chainId: SEPOLIA_CHAIN_ID,
  decimals: 18,
  logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
};

export const SEPOLIA_USDC: CustomToken = {
  name: 'USD Coin',
  symbol: 'USDC',
  address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
  chainId: SEPOLIA_CHAIN_ID,
  decimals: 6,
  logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=032',
};

export const MAINNET_RPC_URL = `https://mainnet.infura.io/v3/${INFURA_API_KEY}`;
export const SEPOLIA_RPC_URL = `https://sepolia.infura.io/v3/${INFURA_API_KEY}`;

export const UNISWAP_V2_ADDRESSES = {
  mainnet: {
    factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  },
  sepolia: {
    factory: '0xB7f907f7A9eBC822a80BD25E224be42Ce0A698A0',
    router: '0x425141165d3DE9FEC831896C016617a52363b687',
  },
};

export const WRAPPED_NATIVE_TOKEN = {
  [MAINNET_CHAIN_ID]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  [SEPOLIA_CHAIN_ID]: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
};

export const tokenList: CustomToken[] = [MAINNET_ETH, MAINNET_USDC, SEPOLIA_ETH, SEPOLIA_USDC];

export function createToken(token: CustomToken): ExtendedToken {
  const baseToken = new Token(token.chainId, token.address, token.decimals, token.symbol, token.name);
  return Object.assign(baseToken, { logoURI: token.logoURI });
}

export const MAINNET_ETH_TOKEN = createToken(MAINNET_ETH);
export const MAINNET_USDC_TOKEN = createToken(MAINNET_USDC);
export const SEPOLIA_ETH_TOKEN = createToken(SEPOLIA_ETH);
export const SEPOLIA_USDC_TOKEN = createToken(SEPOLIA_USDC);

export const MAINNET_SPOT_PRICE_STABLECOIN_AMOUNT = CurrencyAmount.fromRawAmount(MAINNET_USDC_TOKEN, 100_000e6);
export const SEPOLIA_SPOT_PRICE_STABLECOIN_AMOUNT = CurrencyAmount.fromRawAmount(SEPOLIA_USDC_TOKEN, 10_000e6);

export const MAX_INPUT_LENGTH = 25;
export const DEFAULT_MS_BEFORE_WARNING = 600000;
export const DEFAULT_RETRY_OPTIONS = { n: 10, minWait: 250, maxWait: 1000 };

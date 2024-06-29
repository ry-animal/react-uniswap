export type Token = {
  name: string;
  symbol: string;
  address: string;
  chainId: number;
  decimals: number;
  logoURI: string;
};

export const addresses = {
  mainnetUniswapV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  sepoliaUniswapV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  mainnetUniswapV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  sepoliaUniswapV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  quickNodeSepolia:
    'https://virulent-wiser-arrow.ethereum-sepolia.quiknode.pro/8fa662b94129000a65aaa56c5409ab9c11a3af75/',
  quickNodeMainnet: 'https://eth.llamarpc.com/',
};

export const tokenList: Token[] = [
  {
    name: 'USDC',
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: 1,
    decimals: 6,
    logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=032',
  },
  {
    name: 'ETH',
    symbol: 'ETH',
    address: '',
    chainId: 1,
    decimals: 18,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  },
  {
    name: 'USDC',
    symbol: 'USDC',
    address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
    chainId: 11155111,
    decimals: 6,
    logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=032',
  },
  {
    name: 'ETH',
    symbol: 'ETH',
    address: '',
    chainId: 11155111,
    decimals: 18,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  },
];

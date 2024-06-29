import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ethers } from 'ethers';
import { Token, Fetcher, Route, Trade, TokenAmount, TradeType, Percent, WETH, ChainId } from '@uniswap/sdk';
import { useAccount, useBalance } from 'wagmi';
import { sepolia } from 'viem/chains';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { CoinsIcon } from 'lucide-react';
import { formatBalance } from '../lib/utils';
import { addresses, tokenList } from '../constants';
import router from '../abis/router.json';

const UNISWAP_ROUTER_ADDRESS = addresses.uniswapV2Router;
const UNISWAP_ROUTER_ABI = router;

interface CustomTokenProps {
  logoURI?: string;
}

type ExtendedToken = Token & CustomTokenProps;

type TokenListItem = {
  chainId: number;
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  logoURI?: string;
};

const createExtendedToken = (
  chainId: number,
  address: string,
  decimals: number,
  symbol: string,
  name: string,
  logoURI?: string,
): ExtendedToken => {
  return Object.assign(new Token(chainId, address, decimals, symbol, name), { logoURI });
};

const toExtendedToken = (token: TokenListItem): ExtendedToken | null => {
  if (token.symbol === 'ETH') {
    return createExtendedToken(
      token.chainId,
      getWETHAddress(token.chainId),
      token.decimals,
      token.symbol,
      token.name,
      token.logoURI,
    );
  }

  if (!ethers.utils.isAddress(token.address)) {
    console.error(`Invalid address for token:`, token);
    return null;
  }

  return createExtendedToken(token.chainId, token.address, token.decimals, token.symbol, token.name, token.logoURI);
};

const getWETHAddress = (chainId: number): string => {
  switch (chainId) {
    case ChainId.MAINNET:
      return WETH[ChainId.MAINNET].address;
    case 11155111: // Sepolia testnet
      return '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'; // WETH address on Sepolia
    default:
      throw new Error(`WETH address not available for chain ID ${chainId}`);
  }
};

const useWeb3Provider = () => {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    const initProvider = async () => {
      if (typeof window.ethereum !== 'undefined') {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(web3Provider);
        setSigner(web3Provider.getSigner());
      }
    };
    initProvider();
  }, []);

  return { provider, signer };
};

const SwapCard: React.FC = () => {
  const MAX_INPUT_LENGTH = 25;
  const account = useAccount();
  const { provider, signer } = useWeb3Provider();

  const filteredTokens = useMemo(() => {
    const chainId = account?.chainId ?? sepolia.id;
    return tokenList
      .filter((token) => token.chainId === chainId)
      .map(toExtendedToken)
      .filter((token): token is ExtendedToken => token !== null);
  }, [account.chainId]);

  const [tokenPair, setTokenPair] = useState<[ExtendedToken | null, ExtendedToken | null]>(() => {
    const validTokens = filteredTokens.slice(0, 2);
    return validTokens.length === 2 ? [validTokens[0], validTokens[1]] : [null, null];
  });

  const [inputValues, setInputValues] = useState<[string, string]>(['', '']);
  const [slippage, setSlippage] = useState<number>(0.5);

  const balance = useBalance({
    address: account.address,
    token: tokenPair[0]?.address as `0x${string}`,
    chainId: tokenPair[0]?.chainId,
  });

  const maxBalance = balance.data?.formatted ? Number(balance.data.formatted) : 0;

  const calculateConversion = useCallback(
    async (value: string): Promise<string> => {
      if (!provider || !tokenPair[0] || !tokenPair[1] || !value || value === '0') return '0';

      try {
        const inputToken =
          tokenPair[0].symbol === 'ETH'
            ? new Token(tokenPair[0].chainId, getWETHAddress(tokenPair[0].chainId), 18, 'WETH', 'Wrapped Ether')
            : tokenPair[0];
        const outputToken =
          tokenPair[1].symbol === 'ETH'
            ? new Token(tokenPair[1].chainId, getWETHAddress(tokenPair[1].chainId), 18, 'WETH', 'Wrapped Ether')
            : tokenPair[1];

        const pair = await Fetcher.fetchPairData(inputToken, outputToken, provider);
        const route = new Route([pair], inputToken);
        const amountIn = ethers.utils.parseUnits(value, inputToken.decimals);

        const trade = new Trade(route, new TokenAmount(inputToken, amountIn.toString()), TradeType.EXACT_INPUT);

        return trade.outputAmount.toSignificant(6);
      } catch (error) {
        console.error('Error calculating conversion:', error);
        return '0';
      }
    },
    [provider, tokenPair],
  );

  const handleInputChange = useCallback(
    async (value: string) => {
      let newValue = value;
      if (value.length > MAX_INPUT_LENGTH) {
        newValue = value.slice(0, MAX_INPUT_LENGTH);
      }
      const numValue = Number(newValue);
      if (numValue > maxBalance) {
        newValue = maxBalance.toString();
      }
      setInputValues((prev) => [newValue, prev[1]]);

      if (tokenPair[0] && tokenPair[1]) {
        const convertedValue = await calculateConversion(newValue);
        setInputValues([newValue, convertedValue]);
      }
    },
    [maxBalance, tokenPair, calculateConversion],
  );

  const handleMaxClick = () => {
    const maxValue = maxBalance.toString();
    handleInputChange(maxValue);
  };

  const setToken = (index: 0 | 1, newToken: ExtendedToken) => {
    setTokenPair((prevPair) => {
      const newPair = [...prevPair] as [ExtendedToken | null, ExtendedToken | null];
      if (newToken.address === prevPair[1 - index]?.address) {
        newPair[0] = prevPair[1];
        newPair[1] = prevPair[0];
      } else {
        newPair[index] = newToken;
      }
      return newPair;
    });
  };

  const handleSwap = async () => {
    if (!provider || !signer || !tokenPair[0] || !tokenPair[1]) return;

    try {
      const inputToken =
        tokenPair[0].symbol === 'ETH'
          ? new Token(tokenPair[0].chainId, getWETHAddress(tokenPair[0].chainId), 18, 'WETH', 'Wrapped Ether')
          : tokenPair[0];
      const outputToken =
        tokenPair[1].symbol === 'ETH'
          ? new Token(tokenPair[1].chainId, getWETHAddress(tokenPair[1].chainId), 18, 'WETH', 'Wrapped Ether')
          : tokenPair[1];

      const pair = await Fetcher.fetchPairData(inputToken, outputToken, provider);
      const route = new Route([pair], inputToken);
      const amountIn = ethers.utils.parseUnits(inputValues[0], inputToken.decimals);

      const trade = new Trade(route, new TokenAmount(inputToken, amountIn.toString()), TradeType.EXACT_INPUT);

      const slippageNumerator = Math.floor(slippage * 100).toString();
      const slippageDenominator = '10000';
      const slippageTolerance = new Percent(slippageNumerator, slippageDenominator);

      const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw.toString();
      const path = [inputToken.address, outputToken.address];
      const to = await signer.getAddress();
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const uniswapRouter = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, UNISWAP_ROUTER_ABI, signer);

      let tx;
      if (tokenPair[0].symbol === 'ETH') {
        tx = await uniswapRouter.swapExactETHForTokens(amountOutMin, path, to, deadline, { value: amountIn });
      } else if (tokenPair[1].symbol === 'ETH') {
        tx = await uniswapRouter.swapExactTokensForETH(amountIn, amountOutMin, path, to, deadline);
      } else {
        tx = await uniswapRouter.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline);
      }

      await tx.wait();
      console.log('Swap successful!');
    } catch (error) {
      console.error('Swap failed:', error);
    }
  };

  useEffect(() => {
    const updateConversion = async () => {
      if (tokenPair[0] && tokenPair[1] && inputValues[0]) {
        const convertedValue = await calculateConversion(inputValues[0]);
        setInputValues((prev) => {
          if (prev[1] !== convertedValue) {
            return [prev[0], convertedValue];
          }
          return prev;
        });
      } else {
        setInputValues((prev) => {
          if (prev[0] !== '' || prev[1] !== '') {
            return ['', ''];
          }
          return prev;
        });
      }
    };

    updateConversion();
  }, [tokenPair, calculateConversion, inputValues[0]]);

  if (filteredTokens.length < 2) {
    return <div>Loading tokens... (Found {filteredTokens.length} tokens)</div>;
  }

  return (
    <Card className="w-full md:w-1/2 bg-black bg-opacity-25 border-black/80">
      <CardContent className="p-8">
        <div className="flex flex-col gap-8">
          {[0, 1].map((index) => (
            <div key={index} className="flex flex-col gap-2">
              <Label htmlFor={`token-input-${index}`}>
                {index === 0
                  ? `Available: ${balance.data?.formatted ? formatBalance(Number(balance.data.formatted)) : '0'} ${tokenPair[0]?.symbol || ''}`
                  : `${tokenPair[1]?.symbol || ''} to receive:`}
              </Label>
              <div className="flex gap-4">
                <div className="flex flex-col gap-4 w-full">
                  <div className="flex gap-4">
                    <Input
                      id={`token-input-${index}`}
                      type="number"
                      value={inputValues[index]}
                      onChange={(e) => (index === 0 ? handleInputChange(e.target.value) : undefined)}
                      readOnly={index === 1}
                      className="appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none flex-grow bg-black bg-opacity-10"
                    />
                    {index === 0 && (
                      <Button onClick={handleMaxClick} className="whitespace-nowrap bg-syntax/75 hover:bg-syntax">
                        Max
                      </Button>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <span className="flex items-center gap-2 justify-center">
                      {tokenPair[index]?.logoURI && (
                        <img src={tokenPair[index]?.logoURI} alt="token" className="size-4" />
                      )}
                      <CoinsIcon />
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Token List</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {filteredTokens.map((token) => (
                      <DropdownMenuItem
                        key={token.address}
                        className="flex gap-2 items-center text-center"
                        onClick={() => setToken(index as 0 | 1, token)}
                      >
                        {token.logoURI && <img src={token.logoURI} alt="token" className="size-4" />}
                        {token.name}
                        {tokenPair[index]?.address === token.address && '  ✓'}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 mt-8">
          <Label htmlFor="slippage">Slippage tolerance: </Label>
          <Input
            type="number"
            placeholder="Slippage (%)"
            value={slippage}
            onChange={(e) => setSlippage(parseFloat(e.target.value))}
            className="appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none flex-grow bg-black bg-opacity-10"
          />
        </div>
        <Button
          className="mt-8 w-full text-center justify-center font-chakra text-xl bg-syntax/75 hover:bg-syntax"
          onClick={handleSwap}
        >
          Swap
        </Button>
      </CardContent>
    </Card>
  );
};

export default SwapCard;

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ethers, Contract } from 'ethers';
import { ChainId, Token, WETH, Fetcher, Route, Trade, TokenAmount, TradeType, Percent } from '@uniswap/sdk';
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
import { addresses, tokenList, Token as CustomToken } from '../constants';
import router from '../abis/router.json';
import IUniswapV2Factory from '@uniswap/v2-core/build/IUniswapV2Factory.json';
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json';

const UNISWAP_ROUTER_ABI = router;

type ExtendedChainId = ChainId | 11155111;

type WETHAddresses = {
  [key in ExtendedChainId]: string;
};

const WETH_ADDRESSES: WETHAddresses = {
  ...WETH,
  [11155111]: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
};

type ExtendedToken = Token & {
  logoURI?: string;
  chainId: ExtendedChainId;
};

const createExtendedToken = (token: CustomToken): ExtendedToken => {
  return Object.assign(
    new Token(token.chainId, token.address || ethers.constants.AddressZero, token.decimals, token.symbol, token.name),
    { logoURI: token.logoURI },
  );
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

const useTokenBalance = (token: ExtendedToken | null) => {
  const account = useAccount();
  return useBalance({
    address: account.address,
    token: token?.symbol === 'ETH' ? undefined : (token?.address as `0x${string}`),
    chainId: token?.chainId,
  });
};

const getTokenAddress = (token: ExtendedToken, chainId: ExtendedChainId): string => {
  if (token.symbol === 'ETH') {
    return WETH_ADDRESSES[chainId] || token.address;
  }
  return token.address;
};

const SwapCard: React.FC = () => {
  const MAX_INPUT_LENGTH = 25;
  const account = useAccount();
  const { provider, signer } = useWeb3Provider();

  const filteredTokens = useMemo(() => {
    const chainId = account.chainId ?? sepolia.id;
    return tokenList.filter((token) => token.chainId === chainId).map(createExtendedToken);
  }, [account.chainId]);

  const [tokenPair, setTokenPair] = useState<[ExtendedToken | null, ExtendedToken | null]>(() => {
    const validTokens = filteredTokens.slice(0, 2);
    return validTokens.length === 2 ? [validTokens[0], validTokens[1]] : [null, null];
  });

  const [inputValues, setInputValues] = useState<[string, string]>(['', '']);
  const [slippage, setSlippage] = useState<number>(0.5);

  const tokenBalance = useTokenBalance(tokenPair[0]);

  const maxBalance = tokenBalance.data?.formatted ? Number(tokenBalance.data.formatted) : 0;

  const calculateConversion = useCallback(
    async (value: string): Promise<string> => {
      if (!provider || !tokenPair[0] || !tokenPair[1] || !value || value === '0') return '0';

      try {
        const inputToken = tokenPair[0];
        const outputToken = tokenPair[1];

        const chainId = (account.chainId ?? 11155111) as ExtendedChainId;
        const customProvider = new ethers.providers.JsonRpcProvider(
          chainId === ChainId.MAINNET ? addresses.quickNodeMainnet : addresses.quickNodeSepolia,
        );

        console.log(`Calculating conversion for ${inputToken.symbol} to ${outputToken.symbol} on chain ${chainId}`);

        const inputTokenAddress = getTokenAddress(inputToken, chainId);
        const outputTokenAddress = getTokenAddress(outputToken, chainId);

        console.log(`Input token address: ${inputTokenAddress}`);
        console.log(`Output token address: ${outputTokenAddress}`);

        const factoryAddress =
          chainId === ChainId.MAINNET ? addresses.mainnetUniswapV2Factory : addresses.sepoliaUniswapV2Factory;
        console.log(`Using factory address: ${factoryAddress}`);

        const factory = new Contract(factoryAddress, IUniswapV2Factory.abi, customProvider);

        const pairAddress = await factory.getPair(inputTokenAddress, outputTokenAddress);
        console.log(`Pair address: ${pairAddress}`);

        if (pairAddress === ethers.constants.AddressZero) {
          console.log('No liquidity pair found');
          return '0';
        }

        const pair = new Contract(pairAddress, IUniswapV2Pair.abi, customProvider);
        const reserves = await pair.getReserves();
        console.log(`Reserves: ${reserves[0].toString()}, ${reserves[1].toString()}`);

        const [reserve0, reserve1] =
          inputTokenAddress.toLowerCase() < outputTokenAddress.toLowerCase()
            ? [reserves[0], reserves[1]]
            : [reserves[1], reserves[0]];

        const amountIn = ethers.utils.parseUnits(value, inputToken.decimals);
        const amountInWithFee = amountIn.mul(997);
        const numerator = amountInWithFee.mul(reserve1);
        const denominator = reserve0.mul(1000).add(amountInWithFee);
        const amountOut = numerator.div(denominator);

        const formattedAmountOut = ethers.utils.formatUnits(amountOut, outputToken.decimals);
        console.log(`Calculated output amount: ${formattedAmountOut}`);

        return formattedAmountOut;
      } catch (error) {
        console.error('Error calculating conversion:', error);
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
        }
        return '0';
      }
    },
    [provider, tokenPair, account.chainId],
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
    setInputValues(['', '']);
  };

  const handleSwap = async () => {
    if (!provider || !signer || !tokenPair[0] || !tokenPair[1]) return;

    try {
      const inputToken = tokenPair[0];
      const outputToken = tokenPair[1];

      const chainId = (account.chainId ?? 11155111) as ExtendedChainId;
      const customProvider = new ethers.providers.JsonRpcProvider(
        chainId === ChainId.MAINNET ? addresses.quickNodeMainnet : addresses.quickNodeSepolia,
      );

      const inputTokenAddress = getTokenAddress(inputToken, chainId);
      const outputTokenAddress = getTokenAddress(outputToken, chainId);

      const pair = await Fetcher.fetchPairData(
        new Token(account.chainId ?? ChainId.MAINNET, inputTokenAddress, inputToken.decimals),
        new Token(account.chainId ?? ChainId.MAINNET, outputTokenAddress, outputToken.decimals),
        customProvider,
      );
      const route = new Route([pair], inputToken);
      const amountIn = ethers.utils.parseUnits(inputValues[0], inputToken.decimals);

      const trade = new Trade(route, new TokenAmount(inputToken, amountIn.toString()), TradeType.EXACT_INPUT);

      const slippageNumerator = Math.floor(slippage * 100).toString();
      const slippageDenominator = '10000';
      const slippageTolerance = new Percent(slippageNumerator, slippageDenominator);

      const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw.toString();
      const path = [inputTokenAddress, outputTokenAddress];
      const to = await signer.getAddress();
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const routerAddress =
        chainId === ChainId.MAINNET ? addresses.mainnetUniswapV2Router : addresses.sepoliaUniswapV2Router;
      const uniswapRouter = new ethers.Contract(routerAddress, UNISWAP_ROUTER_ABI, signer);

      let tx;
      if (inputToken.symbol === 'ETH') {
        tx = await uniswapRouter.swapExactETHForTokens(amountOutMin, path, to, deadline, { value: amountIn });
      } else if (outputToken.symbol === 'ETH') {
        tx = await uniswapRouter.swapExactTokensForETH(amountIn, amountOutMin, path, to, deadline);
      } else {
        tx = await uniswapRouter.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline);
      }

      await tx.wait();
      console.log('Swap successful!');
      setInputValues(['', '']);
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

  useEffect(() => {
    setInputValues(['', '']);
    setTokenPair(() => {
      const validTokens = filteredTokens.slice(0, 2);
      return validTokens.length === 2 ? [validTokens[0], validTokens[1]] : [null, null];
    });
  }, [account.address, account.chainId, filteredTokens]);

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
                  ? `Available: ${tokenBalance.data?.formatted ? formatBalance(Number(tokenBalance.data.formatted)) : '0'} ${tokenPair[0]?.symbol || ''}`
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

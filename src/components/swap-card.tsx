import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ethers } from 'ethers';
import { CurrencyAmount, TradeType } from '@uniswap/sdk-core';
import { Pair, Route, Trade } from '@uniswap/v2-sdk';
import { useAccount, useBalance } from 'wagmi';
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
import {
  SEPOLIA_CHAIN_ID,
  MAINNET_CHAIN_ID,
  SEPOLIA_RPC_URL,
  MAINNET_RPC_URL,
  UNISWAP_V2_ADDRESSES,
  createToken,
  tokenList,
  ExtendedToken,
  DEFAULT_NATIVE_ADDRESS,
} from '../constants';
import factoryAbi from '../abis/factory.json';
import pairAbi from '../abis/pair.json';
import routerAbi from '../abis/router.json';

const MAX_INPUT_LENGTH = 25;

const SwapCard: React.FC = () => {
  const { address, chainId } = useAccount();
  const networkChainId = chainId ?? SEPOLIA_CHAIN_ID;

  const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  const filteredTokens = useMemo(() => {
    return tokenList.filter((token) => token.chainId === networkChainId).map(createToken);
  }, [networkChainId]);

  const [tokenPair, setTokenPair] = useState<[ExtendedToken | null, ExtendedToken | null]>(() => {
    const validTokens = filteredTokens.slice(0, 2);
    return validTokens.length === 2 ? [validTokens[0], validTokens[1]] : [null, null];
  });

  const [inputValues, setInputValues] = useState<[string, string]>(['', '']);
  const [slippage, setSlippage] = useState<number>(0.5);

  const tokenBalance = useBalance({
    address,
    token: tokenPair[0]?.address === DEFAULT_NATIVE_ADDRESS ? undefined : (tokenPair[0]?.address as `0x${string}`),
    chainId: networkChainId,
  });

  const maxBalance = tokenBalance.data?.formatted ? Number(tokenBalance.data.formatted) : 0;

  useEffect(() => {
    const initProvider = async () => {
      const rpcUrl = networkChainId === MAINNET_CHAIN_ID ? MAINNET_RPC_URL : SEPOLIA_RPC_URL;
      const web3Provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      setProvider(web3Provider);
      setSigner(web3Provider.getSigner());
    };
    initProvider();
  }, [networkChainId]);

  const calculateConversion = useCallback(
    async (value: string): Promise<string> => {
      if (!provider || !tokenPair[0] || !tokenPair[1] || !value || value === '0') return '0';

      try {
        const factoryAddress =
          UNISWAP_V2_ADDRESSES[networkChainId === MAINNET_CHAIN_ID ? 'mainnet' : 'sepolia'].factory;
        const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);

        const pairAddress = await factory.getPair(tokenPair[0].address, tokenPair[1].address);
        if (pairAddress === ethers.constants.AddressZero) {
          console.log('No liquidity pair found');
          return '0';
        }

        const pair = new ethers.Contract(pairAddress, pairAbi, provider);
        const reserves = await pair.getReserves();

        const [reserve0, reserve1] = tokenPair[0].sortsBefore(tokenPair[1])
          ? [reserves[0], reserves[1]]
          : [reserves[1], reserves[0]];

        const inputAmount = CurrencyAmount.fromRawAmount(
          tokenPair[0],
          ethers.utils.parseUnits(value, tokenPair[0].decimals).toString(),
        );

        const pair0 = new Pair(
          CurrencyAmount.fromRawAmount(tokenPair[0], reserve0.toString()),
          CurrencyAmount.fromRawAmount(tokenPair[1], reserve1.toString()),
        );

        const route = new Route([pair0], tokenPair[0], tokenPair[1]);
        const trade = new Trade(route, inputAmount, TradeType.EXACT_INPUT);

        const outputAmount = trade.outputAmount;
        return ethers.utils.formatUnits(outputAmount.quotient.toString(), tokenPair[1].decimals);
      } catch (error) {
        console.error('Error calculating conversion:', error);
        return '0';
      }
    },
    [provider, tokenPair, networkChainId],
  );

  const handleInputChange = useCallback(
    async (value: string) => {
      let newValue = value.slice(0, MAX_INPUT_LENGTH);
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
      const routerAddress = UNISWAP_V2_ADDRESSES[networkChainId === MAINNET_CHAIN_ID ? 'mainnet' : 'sepolia'].router;
      const uniswapRouter = new ethers.Contract(routerAddress, routerAbi, signer);

      const inputAmount = ethers.utils.parseUnits(inputValues[0], tokenPair[0].decimals);
      const path = [tokenPair[0].address, tokenPair[1].address];
      const to = await signer.getAddress();
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const amountOutMin = ethers.utils
        .parseUnits(inputValues[1], tokenPair[1].decimals)
        .mul(100 - Math.floor(slippage * 100))
        .div(100);

      let tx;
      if (tokenPair[0].address === DEFAULT_NATIVE_ADDRESS) {
        tx = await uniswapRouter.swapExactETHForTokens(amountOutMin, path, to, deadline, {
          value: inputAmount,
        });
      } else if (tokenPair[1].address === DEFAULT_NATIVE_ADDRESS) {
        tx = await uniswapRouter.swapExactTokensForETH(inputAmount, amountOutMin, path, to, deadline);
      } else {
        tx = await uniswapRouter.swapExactTokensForTokens(inputAmount, amountOutMin, path, to, deadline);
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
  }, [address, networkChainId, filteredTokens]);

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
                  ? `Available: ${
                      tokenBalance.data?.formatted ? formatBalance(Number(tokenBalance.data.formatted)) : '0'
                    } ${tokenPair[0]?.symbol || ''}`
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

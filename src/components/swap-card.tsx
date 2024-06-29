import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ethers } from 'ethers';
import { CurrencyAmount, TradeType, Percent, Token } from '@uniswap/sdk-core';
import { Pair, Route, Trade } from '@uniswap/v2-sdk';
import { useAccount, useBalance, useWalletClient } from 'wagmi';
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
  WRAPPED_NATIVE_TOKEN,
} from '../constants';

const MAX_INPUT_LENGTH = 25;

const SwapCard: React.FC = () => {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const networkChainId = chainId ?? SEPOLIA_CHAIN_ID;

  const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider | null>(null);

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
    };
    initProvider();
  }, [networkChainId]);

  const getWETHAddress = (chainId: number): string => {
    switch (chainId) {
      case MAINNET_CHAIN_ID:
        return WRAPPED_NATIVE_TOKEN[MAINNET_CHAIN_ID];
      case SEPOLIA_CHAIN_ID:
        return WRAPPED_NATIVE_TOKEN[SEPOLIA_CHAIN_ID];
      default:
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
  };

  const calculateTrade = useCallback(
    async (
      inputAmount: string,
    ): Promise<{ trade: Trade<Token, Token, TradeType.EXACT_INPUT>; formattedOutput: string } | null> => {
      if (!provider || !tokenPair[0] || !tokenPair[1] || !inputAmount) return null;

      try {
        const wethAddress = getWETHAddress(networkChainId);
        const weth = new Token(networkChainId, wethAddress, 18, 'WETH', 'Wrapped Ether');
        const token0 = tokenPair[0].address === DEFAULT_NATIVE_ADDRESS ? weth : tokenPair[0];
        const token1 = tokenPair[1].address === DEFAULT_NATIVE_ADDRESS ? weth : tokenPair[1];

        const pairAddress = Pair.getAddress(token0, token1);
        const pairContract = new ethers.Contract(
          pairAddress,
          [
            'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
          ],
          provider,
        );
        const reserves = await pairContract.getReserves();

        const pair = new Pair(
          CurrencyAmount.fromRawAmount(token0, reserves[0].toString()),
          CurrencyAmount.fromRawAmount(token1, reserves[1].toString()),
        );

        const route = new Route([pair], token0, token1);
        const amount = CurrencyAmount.fromRawAmount(
          token0,
          ethers.utils.parseUnits(inputAmount, token0.decimals).toString(),
        );

        const trade = Trade.exactIn(route, amount);
        const formattedOutput = ethers.utils.formatUnits(
          trade.outputAmount.quotient.toString(),
          trade.outputAmount.currency.decimals,
        );

        return { trade, formattedOutput };
      } catch (error) {
        console.error('Error calculating trade:', error);
        return null;
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

      if (tokenPair[0] && tokenPair[1] && newValue !== '') {
        const result = await calculateTrade(newValue);
        if (result) {
          setInputValues([newValue, result.formattedOutput]);
        }
      } else {
        setInputValues([newValue, '']);
      }
    },
    [maxBalance, tokenPair, calculateTrade],
  );

  const handleMaxClick = () => {
    handleInputChange(maxBalance.toString());
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
    if (!tokenPair[0] || !tokenPair[1] || !inputValues[0]) return;

    try {
      if (!walletClient) throw new Error('Wallet client not found');

      const ethersProvider = new ethers.providers.Web3Provider(walletClient.transport);
      const ethersSigner = ethersProvider.getSigner();

      const result = await calculateTrade(inputValues[0]);
      if (!result) throw new Error('Failed to calculate trade');

      const { trade } = result;

      const routerAddress = UNISWAP_V2_ADDRESSES[networkChainId === MAINNET_CHAIN_ID ? 'mainnet' : 'sepolia'].router;
      const routerAbi = [
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
        'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
        'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      ];
      const router = new ethers.Contract(routerAddress, routerAbi, ethersSigner);

      const slippageTolerance = new Percent(Math.floor(slippage * 100), '10000');
      const amountOutMin = trade.minimumAmountOut(slippageTolerance);
      const path = trade.route.path.map((token) => token.address);
      const to = await ethersSigner.getAddress();
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      let tx;
      if (trade.inputAmount.currency.isNative) {
        tx = await router.swapExactETHForTokens(amountOutMin.quotient.toString(), path, to, deadline, {
          value: trade.inputAmount.quotient.toString(),
        });
      } else if (trade.outputAmount.currency.isNative) {
        tx = await router.swapExactTokensForETH(
          trade.inputAmount.quotient.toString(),
          amountOutMin.quotient.toString(),
          path,
          to,
          deadline,
        );
      } else {
        tx = await router.swapExactTokensForTokens(
          trade.inputAmount.quotient.toString(),
          amountOutMin.quotient.toString(),
          path,
          to,
          deadline,
        );
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
        const result = await calculateTrade(inputValues[0]);
        if (result) {
          setInputValues((prev) => [prev[0], result.formattedOutput]);
        }
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
  }, [tokenPair, calculateTrade, inputValues[0]]);

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
                      value={
                        index === 0
                          ? inputValues[index]
                          : Number(inputValues[index]).toFixed(tokenPair[1]?.decimals || 6)
                      }
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

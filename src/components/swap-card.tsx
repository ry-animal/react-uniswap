import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ethers } from 'ethers';
import JSBI from 'jsbi';
import { Token, Percent } from '@uniswap/sdk-core';
import { Pair } from '@uniswap/v2-sdk';
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
import { CoinsIcon, GlassWater } from 'lucide-react';
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
  MAX_INPUT_LENGTH,
  MAINNET_ETH,
} from '../constants';
import { useToast } from './ui/use-toast';

const SwapCard: React.FC = () => {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { toast } = useToast();

  const [feeData, setFeeData] = useState<{
    gasPrice: string;
  } | null>(null);
  const [ethPrice, setEthPrice] = useState<number | null>(null);

  const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState<string>('0');

  const networkChainId = chainId ?? SEPOLIA_CHAIN_ID;

  const filteredTokens = useMemo(() => {
    return tokenList.filter((token) => token.chainId === networkChainId).map(createToken);
  }, [networkChainId]);

  const findUSDCToken = (tokens: ExtendedToken[]): ExtendedToken | undefined => {
    return tokens.find((token) => token.symbol === 'USDC');
  };

  const [tokenPair, setTokenPair] = useState<[ExtendedToken | null, ExtendedToken | null]>(() => {
    const usdcToken = findUSDCToken(filteredTokens);
    const otherToken = filteredTokens.find((token) => token.address === DEFAULT_NATIVE_ADDRESS);

    if (usdcToken && otherToken) {
      return [usdcToken, otherToken];
    } else {
      const validTokens = filteredTokens.slice(0, 2);
      return validTokens.length === 2 ? [validTokens[0], validTokens[1]] : [null, null];
    }
  });

  const [inputValues, setInputValues] = useState<[string, string]>(['', '']);
  const [slippage, setSlippage] = useState<number>(0.5);

  const tokenBalance = useBalance({
    address,
    token: tokenPair[0]?.address === DEFAULT_NATIVE_ADDRESS ? undefined : (tokenPair[0]?.address as `0x${string}`),
    chainId: networkChainId,
  });

  useEffect(() => {
    if (tokenBalance.data?.formatted) {
      setCurrentBalance(tokenBalance.data.formatted);
    }
  }, [tokenBalance.data]);

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

  const checkAllowance = async (
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
  ) => {
    if (!provider) throw new Error('Provider not initialized');

    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function allowance(address owner, address spender) view returns (uint256)'],
      provider,
    );

    const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
    return allowance.gte(amount);
  };

  const calculateTrade = useCallback(
    async (inputAmount: string): Promise<{ formattedOutput: string } | null> => {
      if (!provider || !tokenPair[0] || !tokenPair[1] || !inputAmount) return null;

      try {
        setError(null);
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

        let reserves;
        try {
          reserves = await pairContract.getReserves();
        } catch (error) {
          setError(`No liquidity pair found for ${token0.symbol}/${token1.symbol} on ${networkChainId === MAINNET_CHAIN_ID ? 'Mainnet' : 'Sepolia'}. 
                    This pair may not exist or have liquidity on this network.`);
          return null;
        }

        if (reserves[0].isZero() && reserves[1].isZero()) {
          setError(`Liquidity pair exists for ${token0.symbol}/${token1.symbol}, but it has no liquidity. 
                    You may need to add liquidity to this pair before swapping.`);
          return null;
        }

        const [reserve0, reserve1] = token0.sortsBefore(token1)
          ? [reserves[0], reserves[1]]
          : [reserves[1], reserves[0]];

        const inputAmountWithFee = ethers.BigNumber.from(ethers.utils.parseUnits(inputAmount, token0.decimals)).mul(
          997,
        );
        const numerator = inputAmountWithFee.mul(reserve1);
        const denominator = reserve0.mul(1000).add(inputAmountWithFee);
        const outputAmount = numerator.div(denominator);

        const formattedOutput = ethers.utils.formatUnits(outputAmount, token1.decimals);

        return { formattedOutput };
      } catch (error) {
        console.error('Error calculating trade:', error);
        setError(`An error occurred while calculating the trade. 
                  This could be due to network issues or lack of liquidity. 
                  Please try again or try a different token pair.`);
        return null;
      }
    },
    [provider, tokenPair, networkChainId],
  );

  const handleInputChange = useCallback(
    async (value: string) => {
      let newValue = value.slice(0, MAX_INPUT_LENGTH);
      const numValue = Number(newValue);
      if (numValue > Number(currentBalance)) {
        newValue = currentBalance;
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
    [currentBalance, tokenPair, calculateTrade],
  );

  const handleMaxClick = useCallback(() => {
    handleInputChange(currentBalance);
  }, [handleInputChange, currentBalance]);

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
    setError(null);
    setCurrentBalance('0');
    updateBalance();
  };

  const updateBalance = useCallback(async () => {
    if (!address || !tokenPair[0] || !provider) return;

    try {
      let balance;
      if (tokenPair[0].address === DEFAULT_NATIVE_ADDRESS) {
        balance = await provider.getBalance(address);
      } else {
        const tokenContract = new ethers.Contract(
          tokenPair[0].address,
          ['function balanceOf(address account) view returns (uint256)'],
          provider,
        );
        balance = await tokenContract.balanceOf(address);
      }

      const formattedBalance = ethers.utils.formatUnits(balance, tokenPair[0].decimals);
      console.log('Updated balance:', formattedBalance);
      setCurrentBalance(formattedBalance);
    } catch (error) {
      console.error('Failed to update balance:', error);
      setCurrentBalance('0');
    }
  }, [address, tokenPair, provider]);

  const handleSwap = async () => {
    if (!tokenPair[0] || !tokenPair[1] || !inputValues[0] || isSwapping) return;

    setIsSwapping(true);
    setError(null);
    try {
      if (!walletClient) throw new Error('Wallet client not found');

      const ethersProvider = new ethers.providers.Web3Provider(walletClient.transport);
      const ethersSigner = ethersProvider.getSigner();

      const result = await calculateTrade(inputValues[0]);
      if (!result) throw new Error('Failed to calculate trade');

      const routerAddress = UNISWAP_V2_ADDRESSES[networkChainId === MAINNET_CHAIN_ID ? 'mainnet' : 'sepolia'].router;
      const routerAbi = [
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
        'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
        'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      ];
      const router = new ethers.Contract(routerAddress, routerAbi, ethersSigner);

      const slippageTolerance = new Percent(JSBI.BigInt(Math.floor(slippage * 10000)), JSBI.BigInt(10000));

      const amountIn = ethers.utils.parseUnits(inputValues[0], tokenPair[0].decimals);
      const amountOut = ethers.utils.parseUnits(result.formattedOutput, tokenPair[1].decimals);

      const slippageNumerator = slippageTolerance.numerator.toString();
      const slippageDenominator = slippageTolerance.denominator.toString();

      const slippageAmount = amountOut.mul(slippageNumerator).div(slippageDenominator);
      const amountOutMin = amountOut.sub(slippageAmount);
      const finalAmountOutMin = amountOutMin.lt(0) ? ethers.constants.Zero : amountOutMin;

      const wethAddress = getWETHAddress(networkChainId);
      let path;
      if (tokenPair[0].address === DEFAULT_NATIVE_ADDRESS) {
        path = [wethAddress, tokenPair[1].address];
      } else if (tokenPair[1].address === DEFAULT_NATIVE_ADDRESS) {
        path = [tokenPair[0].address, wethAddress];
      } else {
        path = [tokenPair[0].address, wethAddress, tokenPair[1].address];
      }

      console.log('Swap path:', path);

      const to = await ethersSigner.getAddress();
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      if (tokenPair[0].address !== DEFAULT_NATIVE_ADDRESS) {
        const tokenContract = new ethers.Contract(
          tokenPair[0].address,
          ['function approve(address spender, uint256 amount) external returns (bool)'],
          ethersSigner,
        );

        const hasAllowance = await checkAllowance(
          tokenPair[0].address,
          await ethersSigner.getAddress(),
          routerAddress,
          amountIn,
        );

        if (!hasAllowance) {
          console.log('Approving token spend...');
          try {
            const approveTx = await tokenContract.approve(routerAddress, amountIn.toString());
            await approveTx.wait();
            console.log('Approval successful');

            toast({
              title: 'Approval Successful',
              description: `Approved ${tokenPair[0].symbol} for swapping`,
              variant: 'default',
              className: 'bg-syntax/75',
            });
          } catch (approvalError) {
            console.error('Approval failed:', approvalError);

            toast({
              title: 'Approval Failed',
              description: approvalError instanceof Error ? approvalError.message : 'Unknown error',
              variant: 'destructive',
              className: 'bg-red-500/75',
            });

            throw new Error('Failed to approve token spend. Please try again.');
          }
        } else {
          console.log('Token already approved');
        }
      }

      let tx;
      if (tokenPair[0].address === DEFAULT_NATIVE_ADDRESS) {
        tx = await router.swapExactETHForTokens(finalAmountOutMin.toString(), path, to, deadline, {
          value: amountIn.toString(),
        });
      } else if (tokenPair[1].address === DEFAULT_NATIVE_ADDRESS) {
        tx = await router.swapExactTokensForETH(amountIn.toString(), finalAmountOutMin.toString(), path, to, deadline);
      } else {
        tx = await router.swapExactTokensForTokens(
          amountIn.toString(),
          finalAmountOutMin.toString(),
          path,
          to,
          deadline,
        );
      }

      console.log('Swap transaction sent:', tx.hash);
      await tx.wait();
      console.log('Swap successful!');
      setInputValues(['', '']);

      await updateBalance();

      toast({
        title: 'Swap Successful',
        description: `Swapped ${inputValues[0]} ${tokenPair[0].symbol} for ${result.formattedOutput} ${tokenPair[1].symbol}`,
        variant: 'default',
        className: 'bg-syntax/75',
      });
    } catch (error) {
      console.error('Swap failed:', error);
      setError(`Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);

      toast({
        title: 'Swap Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
        className: 'bg-red-500/75',
      });
    } finally {
      setIsSwapping(false);
    }
  };

  useEffect(() => {
    updateBalance();
  }, [tokenPair, updateBalance]);

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
      const usdcToken = findUSDCToken(filteredTokens);
      const otherToken = filteredTokens.find((token) => token.address === DEFAULT_NATIVE_ADDRESS);

      if (usdcToken && otherToken) {
        return [usdcToken, otherToken];
      } else {
        const validTokens = filteredTokens.slice(0, 2);
        return validTokens.length === 2 ? [validTokens[0], validTokens[1]] : [null, null];
      }
    });
    setError(null);
    setCurrentBalance('0');
    updateBalance();
  }, [address, networkChainId, filteredTokens, updateBalance]);

  const getFeeData = useCallback(async () => {
    if (!provider) return;
    try {
      const data = await provider.getFeeData();
      setFeeData({
        gasPrice: ethers.utils.formatUnits(data.gasPrice || 0, 'gwei'),
      });
    } catch (error) {
      console.error('Error fetching fee data:', error);
    }
  }, [provider]);

  const getEthPrice = useCallback(async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      setEthPrice(data.ethereum.usd);
    } catch (error) {
      console.error('Error fetching ETH price:', error);
    }
  }, []);

  useEffect(() => {
    getFeeData();
    getEthPrice();
    const interval = setInterval(() => {
      getFeeData();
      getEthPrice();
    }, 60000);
    return () => clearInterval(interval);
  }, [getFeeData, getEthPrice]);

  if (filteredTokens.length < 2) {
    return <div>Loading tokens... (Found {filteredTokens.length} tokens)</div>;
  }

  return (
    <Card className="w-full sm:w-3/4 bg-black bg-opacity-25 border-black/80">
      <div className="flex justify-between items-center text-xs text-gray-300 p-4">
        {ethPrice && (
          <div className="flex items-center gap-1">
            <img src={MAINNET_ETH.logoURI} alt="eth logo" className="size-4" />
            <div>ETH Price: ${ethPrice.toFixed(2)}</div>
          </div>
        )}
        {feeData && (
          <div className="flex items-center gap-1">
            <GlassWater className="size-4" />
            <div>Gas: {parseFloat(feeData.gasPrice).toFixed(2)} gwei</div>
          </div>
        )}
      </div>
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
          <Label htmlFor="slippage">Slippage tolerance %: </Label>
          <Input
            type="number"
            placeholder="Slippage (%)"
            value={slippage}
            onChange={(e) => setSlippage(parseFloat(e.target.value))}
            className="appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none flex-grow bg-black bg-opacity-10"
          />
        </div>
        {error && <div className="mt-4 text-red-500">{error}</div>}
        <Button
          className="mt-8 w-full text-center justify-center font-chakra text-xl bg-syntax/75 hover:bg-syntax"
          onClick={handleSwap}
          disabled={isSwapping || !!error}
        >
          {isSwapping ? 'Swapping...' : 'Swap'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SwapCard;

import { useAccount, useBalance } from 'wagmi';
import { Card, CardContent } from '../components/ui/card';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { CoinsIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { formatBalance } from '../lib/utils';
import { Token, tokenList } from '../constants';
import { sepolia } from 'viem/chains';

//import { Fetcher, Route, Trade, TokenAmount, TradeType } from '@uniswap/sdk';
// import { FACTORY_ADDRESS_MAP, INIT_CODE_HASH } from '@uniswap/v2-sdk';
// import { pack, keccak256 } from '@ethersproject/solidity';
// import { getCreate2Address } from '@ethersproject/address';

const SwapCard = () => {
  const MAX_INPUT_LENGTH = 25;
  const account = useAccount();

  const filteredTokens = useMemo(() => {
    const chainId = account?.chainId ?? sepolia.id;

    return tokenList.filter((token) => token.chainId === chainId);
  }, [account.chainId]);

  const [tokenPair, setTokenPair] = useState<[Token, Token]>([filteredTokens[0], filteredTokens[1]]);
  const [inputValues, setInputValues] = useState<[string, string]>(['', '']);

  const balance = useBalance({
    address: account.address,
    token: tokenPair[0]?.address as `0x${string}`,
    chainId: tokenPair[0]?.chainId,
  });

  const maxBalance = balance.data?.formatted ? Number(balance.data.formatted) : 0;

  const setToken = (index: 0 | 1, newToken: Token) => {
    setTokenPair((prevPair) => {
      const newPair = [...prevPair] as [Token, Token];
      if (newToken.address === prevPair[1 - index].address) {
        newPair[0] = prevPair[1];
        newPair[1] = prevPair[0];
      } else {
        newPair[index] = newToken;
      }
      return newPair;
    });
  };

  const handleInputChange = (value: string) => {
    let newValue = value;
    if (value.length > MAX_INPUT_LENGTH) {
      newValue = value.slice(0, MAX_INPUT_LENGTH);
    }
    const numValue = Number(newValue);
    if (numValue > maxBalance) {
      newValue = maxBalance.toString();
    }
    setInputValues([newValue, calculateConversion(newValue)]);
  };

  const calculateConversion = (value: string): string => {
    //get swap rate
    console.log(value);
    return value;
  };

  const handleMaxClick = () => {
    const maxValue = maxBalance.toString();
    setInputValues([maxValue, calculateConversion(maxValue)]);
  };

  useEffect(() => {
    setInputValues([inputValues[0], calculateConversion(inputValues[0])]);
  }, [tokenPair]);

  return (
    <Card className="w-full md:w-1/2 bg-black bg-opacity-25 border-black/80">
      <CardContent className="p-8">
        <div className="flex flex-col gap-8">
          {[0, 1].map((index) => (
            <div key={index} className="flex gap-4">
              <div className="flex flex-col gap-4 w-full">
                {index === 0 && (
                  <Label>
                    Available: {balance.data?.formatted ? formatBalance(Number(balance.data.formatted)) : '0'}{' '}
                    {tokenPair[0].symbol}
                  </Label>
                )}
                {index === 0 ? (
                  <div className="flex gap-4">
                    <Input
                      type="number"
                      value={inputValues[index]}
                      onChange={(e) => handleInputChange(e.target.value)}
                      className="appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none flex-grow bg-black bg-opacity-10"
                    />
                    <Button onClick={handleMaxClick} className="whitespace-nowrap bg-syntax/75 hover:bg-syntax">
                      Max
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md text-white cursor-default h-10 border items-center flex text-sm max-w-full">
                    <span className="ml-3">{inputValues[index]}</span>
                  </div>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <span className="flex items-center gap-2 justify-center">
                    {tokenPair[index].logoURI && (
                      <img
                        src={tokenPair[index].logoURI}
                        alt="token"
                        className={index === 0 ? 'mt-6 size-4' : 'size-4'}
                      />
                    )}
                    <CoinsIcon className={index === 0 ? 'mt-6' : ''} />
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
                      <img src={token.logoURI} alt="token" className="size-4" />
                      {token.name}
                      {tokenPair[index].address === token.address && '  ✓'}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
        <Button
          className="mt-6 w-full text-center justify-center font-chakra text-xl bg-syntax/75 hover:bg-syntax"
          onClick={() => {}}
        >
          Swap
        </Button>
      </CardContent>
    </Card>
  );
};

export default SwapCard;

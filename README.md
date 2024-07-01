# Swapper

## Description

Swapper is a simple tool for swapping tokens on the Ethereum blockchain. It is built using the Uniswap protocol. The user can swap tokens by providing the amount to swap and the desired token to receive. The tool will then execute the swap on the Ethereum blockchain.

## Hosted on Vercel

- [Swapper](https://spectralswap.vercel.app/)

## Tokens for testing

- USDC - [Aave](https://staging.aave.com/faucet/)
- ETH - [Infura](https://www.infura.io/faucet/sepolia), [LearnWeb3](https://learnweb3.io/faucets/sepolia/) or [Google Web3 Cloud](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

## Setup

- Run a docker daemon for `Makefile` to work
- `make build` to build and
- `make run` to run the app
- [Local Docker](http://localhost:8080) for app
- `make stop` to stop the app
- `make clean` to remove the app

## TODO

[] Refactor swap-card.tsx for modularity
[x] Toasts for success and error messages
[x] Start with USDC
[] Switch Sepolia to Goerli? because of liquidity pairs
[x] Check approvals before prompting for approval signature
[] Add gas indicator
[] Add current token prices
[] Add more tokens
[] Add more tests
[x] Add more error handling
[x] Add more documentation
[] Add more chains

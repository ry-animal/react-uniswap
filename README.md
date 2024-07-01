# Swapper

## Description

Swapper is a simple tool for swapping tokens on the Ethereum blockchain. It is built using the Uniswap protocol. The user can swap tokens by providing the amount to swap and the desired token to receive. The tool will then execute the swap on the Ethereum blockchain.

## Hosted on Vercel

- [Swapper](https://spectralswap.vercel.app/)

## Tokens for testing (No Liquidity Pairs on Sepolia right now)

- USDC - [Aave](https://staging.aave.com/faucet/)
- ETH - [Infura](https://www.infura.io/faucet/sepolia), [LearnWeb3](https://learnweb3.io/faucets/sepolia/) or [Google Web3 Cloud](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

## Tech Stack

- FE framework
- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)

- UI Kit
- [shadcn](https://ui.shadcn.com/)

- Web3
- [Ethers.js](https://docs.ethers.io/v5/)
- [Wagmi](https://wagmi.sh/)
- [Uniswap](https://uniswap.org/docs/v2/)
- [RainbowKit](https://www.rainbowkit.com/)

## Setup

### Local Dev

- `npm install` to install dependencies
- `npm run dev` to start the app

### Docker

- Run a docker daemon for `Makefile` to work
- `make build` to build and
- `make run` to run the app
- [Local Docker](http://localhost:8080) for app
- `make stop` to stop the app
- `make clean` to remove the app

## TODO

[x] Toasts for success and error messages
[x] Start with USDC
[x] Check approvals before prompting for approval signature
[x] Add gas indicator
[x] Add current token prices
[x] Add more tests
[x] Add more error handling
[x] Add more documentation
[] Deploy liquidity pool to Sepolia? because of no liquidity pairs?
[] Refactor swap-card.tsx for modularity / readability
[] Add more tokens
[] Add more chains

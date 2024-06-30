# Swapper

## Tokens for testing

- USDC - url[https://staging.aave.com/faucet/](Aave)
- ETH - url[https://www.infura.io/faucet/sepolia](Infura), url[https://learnweb3.io/faucets/sepolia/](LearnWeb3) or [https://cloud.google.com/application/web3/faucet/ethereum/sepolia](Google)

## Setup

- Run a docker daemon for `Makefile` to work
- `make build` to build and
- `make run` to run the app
- `make stop` to stop the app
- `make clean` to remove the app

## Description

Swapper is a simple tool for swapping tokens on the Ethereum blockchain. It is built using the Uniswap protocol. The user can swap tokens by providing the amount to swap and the desired token to receive. The tool will then execute the swap on the Ethereum blockchain.

## TODO

- Toasts for success and error messages
- Start with USDC
- Switch Sepolia to Goerli? because of liquidity pairs
- Check approvals before prompting for approval signature
- Add gas indicator
- Add current token prices
- Add more tokens
- Add more tests
- Add more error handling
- Add more documentation
- Add more chains

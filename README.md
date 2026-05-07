# agent-browser-wallet

Private research/build project for making browser automation agents dapp-capable by provisioning a real browser wallet extension profile.

## Focus

LLM agents often drive synthetic or isolated browser clients that do not include the user extensions a real crypto user depends on. That makes dapp testing awkward: the agent can click the web app, but it cannot naturally connect MetaMask, approve wallet prompts, sign messages, switch chains, or submit testnet transactions.

This repo focuses on a concrete first path: **Playwright/Chromium + pinned MetaMask extension + isolated burner Sepolia profile + reusable wallet automation helpers**.

The first target is a tiny fixture dapp. The later target is using the same harness against `wildcat-app-v2` on Sepolia.

## Current goals

- [High-level goals](docs/high-level-goals.md)

## Safety posture

- Use only burner/local/testnet wallets.
- Keep wallet material in local `.env` files that are ignored by Git.
- Never commit private keys, seed phrases, extension profile directories, or test artifacts containing secrets.
- Fail closed on unexpected chain, account, value, contract, or wallet prompt state.
- Treat the MetaMask profile as sensitive even when it only contains testnet funds.

# Research brief

## Problem statement

Browser automation agents can already operate websites through Playwright or Puppeteer, but wallet-gated dapps introduce an extra authority boundary: transaction signing. The core research question is how to let an agent complete wallet-dependent browser tests without handing it unconstrained EOA control.

## Target use cases

1. **Local dapp testing** — an agent runs Playwright/Puppeteer against local or forked-chain dapps and signs transactions using disposable funded accounts.
2. **Staging/testnet validation** — an agent performs limited actions against testnet deployments with strict policies and small balances.
3. **Human-supervised production workflows** — an agent prepares wallet actions, but a person or policy service approves final signatures.
4. **Research prototypes** — compare extension wallets, WalletConnect-style flows, CDP automation, signer services, and account-abstraction approaches.

## Non-goals for now

- Giving an autonomous agent direct access to high-value mainnet private keys.
- Bypassing wallet security prompts or tricking wallet UIs.
- Building production custody infrastructure before the threat model is complete.
- Optimizing for arbitrary wallets before we understand the safest primitives.

## Key research axes

- **Control plane:** how the agent asks for a wallet operation.
- **Signing plane:** where private keys live and which process can sign.
- **Policy plane:** which chains/contracts/functions/values are allowed.
- **Browser integration:** how Playwright/Puppeteer coordinates with wallet UI, dapp state, and signing outcomes.
- **Auditability:** how requests, simulations, approvals, signatures, tx hashes, and failures are recorded.

## Current documentation direction

The repo should keep expanding through Markdown research before code prototypes. The immediate documentation target is a practical comparison of pathways, risk levels, prototype architectures, and safety controls that a later coding agent can implement without guessing.

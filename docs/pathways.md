# Pathway candidates

This document is a starting map. GNHF should research and expand each pathway with implementation details, risks, and prototype steps.

## 1. Disposable local signer for devnet tests

Use Anvil/Hardhat/Ganache-generated EOAs in local browser tests. The agent may control these keys because they have no real-world value.

- **Best for:** local dapp testing and deterministic CI.
- **Browser integration:** dapp connects to a test wallet or injected provider; tests sign against local RPC.
- **Safety model:** keys are ephemeral, chain is local, balances are valueless.
- **Open questions:** best provider injection pattern; how to mimic real wallet UX enough for coverage.

## 2. Extension-wallet automation profile

Run Playwright/Puppeteer with a dedicated browser profile containing MetaMask/Rabby/etc. seeded with a low-value test account.

- **Best for:** realistic wallet UX and extension compatibility testing.
- **Browser integration:** automate extension popup flows explicitly.
- **Safety model:** isolated profile, low-value account, testnet/local only, reset between runs.
- **Open questions:** brittleness across wallet versions; secure seed storage; approval policy enforcement.

## 3. WalletConnect or remote-wallet bridge

The agent drives the dapp in a browser but wallet requests are routed through WalletConnect or a similar bridge to a policy-controlled signer.

- **Best for:** separating browser automation from signing authority.
- **Browser integration:** connect dapp via WalletConnect URI/session.
- **Safety model:** policy service can simulate, log, and deny before signing.
- **Open questions:** session management; supported dapps; latency; UX for human approvals.

## 4. Local policy signer service

Expose a local JSON-RPC or custom signing service that accepts structured signing requests from the browser/test harness and applies deterministic policy before using an EOA.

- **Best for:** controlled automation where the agent never sees the key.
- **Browser integration:** injected EIP-1193 provider or custom connector talks to service.
- **Safety model:** allowlists, value caps, call simulation, chain restrictions, audit log.
- **Open questions:** compatibility with real dapps; provider API completeness; secure IPC.

## 5. Human-in-the-loop approval queue

The agent prepares actions and transaction payloads; a user approves or rejects them in a separate UI/chat before signing.

- **Best for:** public-network workflows and high-risk operations.
- **Browser integration:** automation pauses at signing boundary until approval arrives.
- **Safety model:** explicit human confirmation with decoded transaction details.
- **Open questions:** approval UX; timeouts; preventing context confusion; replay protection.

## 6. Account abstraction / session keys

Use smart accounts, session keys, delegation frameworks, or scoped permissions so the agent controls only limited capabilities rather than an all-powerful EOA.

- **Best for:** repeatable bounded tasks where permissions can be encoded onchain/offchain.
- **Browser integration:** dapp support varies; may require custom connector.
- **Safety model:** capability scope, spend limits, expiration, target allowlists.
- **Open questions:** ecosystem maturity; gas sponsorship; compatibility with EOA-only dapps.

## Initial recommendation hypothesis

Start with pathway 1 for deterministic local tests, then pathway 4 for a policy signer service, and use pathway 5 for any public-network workflow. GNHF should validate or revise this recommendation.

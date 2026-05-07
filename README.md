# agent-browser-wallet

Private research project for controlled EOA wallet access by browser automation agents.

## Goal

Define practical, testable pathways for letting an AI agent drive browser workflows that require wallet actions — for example Playwright/Puppeteer tests against dapps — while keeping key material, signing authority, spend limits, and auditability under explicit control.

This is research-first. The repo starts with Markdown docs and should evolve toward small prototypes only after the threat model and candidate architectures are clear.

## Initial questions

- How can an agent request a wallet action without directly holding a raw private key?
- What is the safest way to support browser tests against wallet-gated dapps?
- Which approaches work with existing wallets such as MetaMask, Rabby, Frame, Anvil/Hardhat accounts, WalletConnect, or embedded signer services?
- How should approvals, policies, simulation, spending caps, chain allowlists, and session expiration work?
- What can be automated fully in local/devnet contexts, and what must stay human-approved on public networks?

## Docs

- [Research brief](docs/research-brief.md)
- [Pathway candidates](docs/pathways.md)
- [Architecture notes](docs/architecture.md)
- [Wallet-action policy model](docs/policy-model.md)
- [Threat model](docs/threat-model.md)
- [Experiment backlog](docs/experiments.md)

## Working principles

- Prefer least-authority designs over giving the agent a funded raw key.
- Separate browser-control authority from signing authority.
- Make wallet actions observable, replayable, and easy to deny.
- Treat public-network EOA control as high-risk until proven otherwise.
- Start with docs and local/devnet prototypes before any real-value workflow.

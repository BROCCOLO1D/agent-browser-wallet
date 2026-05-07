# Experiment backlog

## Phase 1 — docs and architecture

- Compare pathway candidates and rank by safety, compatibility, and prototype cost.
- Define a wallet-action request/approval schema.
- Define the minimum audit log fields.
- Decide which first prototype should be built.

## Phase 2 — local-only prototype

- Create a tiny dapp fixture with a connect button and simple transaction.
- Run Playwright against the fixture using a disposable local signer.
- Record transaction request, signature/tx hash, and final chain state.
- Reset state deterministically between test runs.

## Phase 3 — policy signer prototype

- Build a local signer service with an in-memory or encrypted dev key.
- Add chain/contract/function/value allowlists.
- Add transaction simulation before signing.
- Connect a browser test through an injected EIP-1193 provider or custom connector.

## Phase 4 — wallet extension evaluation

- Test MetaMask/Rabby automation with a dedicated browser profile.
- Measure brittleness of extension popup automation.
- Document setup, reset, and secret-handling requirements.

## Phase 5 — human approval path

- Prototype an approval queue where the agent proposes a wallet action.
- Decode transaction data for review.
- Require explicit approval before signing.
- Log rejection/timeout paths.

## Research deliverables requested from GNHF

- Expanded pathway comparison matrix.
- Recommended first prototype architecture.
- Security checklist for EOA control in browser automation.
- Open questions and references for Playwright/Puppeteer wallet automation.

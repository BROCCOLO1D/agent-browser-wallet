# Experiment backlog

This backlog turns the research direction into bite-sized docs and prototype work. Code should wait until the Markdown architecture and safety model are clear enough to implement without guessing.

## Phase 1 — docs and architecture

- [x] Compare pathway candidates and rank by safety, compatibility, and prototype cost.
- [x] Define a wallet-action request/approval schema.
- [x] Define the minimum audit log fields.
- [x] Decide which first prototype should be built.
- [ ] Add references to concrete libraries/tools after hands-on evaluation, e.g. Playwright extension loading, EIP-1193 provider shims, Anvil/Hardhat, WalletConnect, calldata decoding, and transaction simulation stacks.

## Recommended first prototype — local/devnet injected provider

**Goal:** prove an agent can complete a wallet-gated dapp test without holding a valuable key.

1. Create a tiny local dapp fixture with:
   - a connect-wallet button;
   - display of connected address and chain ID;
   - one fixture contract interaction such as `setMessage(string)` or `mintTestToken(address,uint256)`.
2. Start a local chain such as Anvil or Hardhat with deterministic state.
3. Deploy the fixture contract and fund one disposable account.
4. Inject an EIP-1193-compatible provider into the page from the Playwright/Puppeteer harness.
5. Route wallet requests to a small local signer component that:
   - refuses non-local chain IDs and public RPC URLs;
   - allowlists the fixture contract/function selector;
   - logs each request and result;
   - signs/broadcasts only the allowed local transaction.
6. Assert both browser-visible state and onchain state.
7. Reset the chain and discard any generated keys/artifacts after the test.

**Success criteria:** one deterministic browser test can connect, submit an allowlisted transaction, observe a receipt, write an audit record, and reset cleanly with no secret material committed.

## Phase 2 — policy signer prototype

**Goal:** evolve the local signer into a reusable deny-by-default policy boundary.

1. Translate the documented `WalletActionRequest` into TypeScript or JSON Schema.
2. Add a policy file with local chain, origin, contract, selector, and value caps.
3. Add request normalization for `eth_requestAccounts`, `eth_chainId`, `eth_sendTransaction`, `personal_sign`, and `eth_signTypedData_v4`.
4. Decode calldata and typed data before evaluation.
5. Run simulation before signing when the local RPC supports it.
6. Write append-only NDJSON audit entries for allowed, denied, and failed requests.
7. Add tests for wrong chain, unknown contract, unknown selector, nonzero value, unlimited approval, duplicate request ID, and expired session.

**Success criteria:** the signer service denies unsafe requests by default and signs exactly one allowlisted local fixture call.

## Phase 3 — WalletConnect bridge evaluation

**Goal:** determine whether WalletConnect is a practical transport for separating browser control from signer control.

1. Pick a local/test dapp flow that supports WalletConnect.
2. Capture the pairing URI/session from the browser flow.
3. Route JSON-RPC wallet requests through the same policy model.
4. Compare compatibility and complexity against the injected-provider approach.
5. Document session lifecycle, reconnection behavior, and audit requirements.

**Success criteria:** a local/testnet WalletConnect session can approve an allowlisted request and reject a disallowed one without exposing key material to the browser or agent.

## Phase 4 — wallet extension evaluation

**Goal:** measure real wallet UX compatibility while treating the extension profile as a sensitive signing container.

1. Test MetaMask and/or Rabby automation with a dedicated browser profile.
2. Pin extension versions and document install/setup commands.
3. Automate connection and one local/testnet transaction prompt.
4. Verify prompt contents before clicking approve where possible.
5. Reset/discard the profile and record which state files must never become CI artifacts.
6. Compare brittleness against policy-signer and WalletConnect paths.

**Success criteria:** extension automation can cover wallet UX, but the docs clearly identify why it is not the primary safety model for public-network signing.

## Phase 5 — human approval path

**Goal:** add an explicit approval boundary for public-network or high-risk requests.

1. Define an approval request format with decoded calldata, token effects, simulation summary, exact payload hash, expiry, and risk flags.
2. Prototype a queue or chat/UI approval surface outside the dapp page controlled by the agent.
3. Require approval for public-network value, approvals, permits, unknown selectors, failed simulation, or policy overrides.
4. Implement timeout, rejection, replay protection, and audit entries.
5. Test that automation cannot resume from fake in-page approval UI.

**Success criteria:** public-network signing is prepare-only unless a separate approval channel explicitly approves the exact payload.

## Open research questions

- Which provider-injection shape gives broadest dapp compatibility while staying small enough to audit?
- Which transaction simulation stack should be used first for local and forked EVM state?
- How should proxy contracts, multicalls, permits, and account-abstraction user operations be decoded safely?
- How can browser traces/videos be useful for debugging without leaking wallet state?
- What is the minimum viable human approval UI for a Telegram/Hermes-driven workflow?

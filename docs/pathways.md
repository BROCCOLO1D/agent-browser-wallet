# Pathway candidates

This document compares practical ways to let a browser automation agent complete wallet-dependent EVM dapp workflows without giving the agent unconstrained control over valuable EOA keys.

## Comparison matrix

| Pathway | Signing authority | Safety posture | Dapp/wallet realism | Compatibility with existing dapps | Implementation effort | Prototype suitability |
| --- | --- | --- | --- | --- | --- | --- |
| Disposable local/devnet signer | Test harness or local signer holds ephemeral Anvil/Hardhat EOAs | **High for local only.** Safe when keys, balances, contracts, and chain state are disposable; unsafe if reused on public networks. | Medium: exercises EIP-1193-style calls and transactions, but not real extension UX. | Medium-high if the dapp accepts an injected provider or local wallet connector. | Low-medium. Requires provider injection, local RPC lifecycle, deterministic funding/reset. | **Best first prototype** for CI and deterministic tests. |
| Browser extension wallet automation profile | Extension wallet stores a seed/key in an isolated browser profile; Playwright/Puppeteer clicks extension UI | Medium for local/testnet, low for public networks. Seed/profile handling and UI automation are brittle risk points. | **High.** Exercises real wallet prompts, account switching, chain switching, popups, and dapp connection UX. | High for dapps that expect MetaMask/Rabby-style injected providers. | Medium-high. Requires extension installation, persistent profile management, popup selectors, reset/rotation. | Good second-track evaluation, not the safest first signer primitive. |
| WalletConnect bridge to policy signer | Dapp talks WalletConnect; policy signer owns key and decides whether to sign | High if bridge enforces policy before signing and keeps keys out of browser/agent process. | Medium-high for dapps supporting WalletConnect; less representative for extension-only flows. | Medium. Good for WalletConnect-capable dapps, poor for flows requiring injected wallet features. | Medium-high. Requires session pairing, JSON-RPC routing, policy engine, approval UX. | Strong candidate after local signer, especially for browser/signer separation. |
| Local policy signer service with injected provider | Local service owns key; browser receives an injected EIP-1193 provider that forwards requests to the service | High for local/testnet when policy is strict; can support public-network prepare/review but should not autonomously sign value. | Medium. Exercises dapp transaction flow but not extension wallet UI. | Medium. Depends on provider API completeness and dapp assumptions about wallet identity/events. | Medium. Requires provider shim, request schema, allowlists, simulation, audit log. | **Best first policy prototype** after disposable local signer. |
| Human-in-the-loop approval queue | Agent prepares request; human or hardware-backed wallet approves in a separate channel | Highest for public-network actions when decoded details and simulation are clear. | Variable. Can wrap extension, WalletConnect, or signer-service flows. | Medium-high depending on underlying transport. | Medium. Needs queue, transaction decoding, timeout/replay protection, auditable approvals. | Required control for public networks; not ideal for fully automated CI. |
| Account abstraction / session keys | Agent receives scoped session key or delegated capability for a smart account | Potentially high if scopes are enforced onchain or by a trusted module; lower if dapp compatibility is weak. | Low-medium. Many dapps still assume plain EOA or common injected wallets. | Low-medium today; best where the target app already supports smart accounts or custom connectors. | High. Requires account stack, permission encoding, bundler/paymaster considerations, custom test fixtures. | Research/backlog path, not first prototype unless target dapp already uses AA. |

## 1. Disposable local/devnet signer for CI/tests

Use Anvil/Hardhat/Ganache-generated EOAs in local browser tests. The agent may control these keys only because they have no real-world value and are recreated per run.

- **Best for:** deterministic local dapp testing, CI smoke tests, forked-state rehearsals that never broadcast to public RPC.
- **Browser integration:** inject an EIP-1193 provider into the page, use a tiny test wallet connector, or configure the dapp to use a local wallet adapter.
- **Signer boundary:** the agent can request actions, but the signer should still be a small test harness component so the later policy-service design has the same shape.
- **Safety model:** ephemeral key material, local chain ID allowlist, deterministic funding, no persistent approvals, no public RPC endpoints.
- **Verification target:** prove a Playwright test can connect, submit one allowlisted transaction, observe the tx hash/receipt, and reset chain state.
- **Main limitation:** does not validate real wallet popup UX.

## 2. Extension-wallet automation profile

Run Playwright/Puppeteer with a dedicated browser profile containing MetaMask, Rabby, or a similar extension wallet seeded with a low-value local/testnet account.

- **Best for:** testing real injected-provider behavior, extension connection prompts, chain switching, account switching, and wallet UX compatibility.
- **Browser integration:** launch Chromium with the unpacked extension and a dedicated user data directory; automate both the dapp tab and extension popup/notification pages.
- **Signer boundary:** signing authority lives inside the extension profile, which means profile files and seed setup become sensitive even if only testnet-funded.
- **Safety model:** never use production wallets; isolate profile per test suite; reset from a known fixture; restrict to local/testnet chains; keep seed material outside agent-readable docs/logs.
- **Verification target:** connect the dapp, approve a known local/testnet transaction, record extension version and selectors used, then reset the profile.
- **Main limitation:** brittle across wallet versions and dangerous if profile secrets are reused or accidentally funded.

## 3. WalletConnect bridge to policy signer

The agent drives the dapp in a browser while wallet requests are routed through WalletConnect or a similar bridge to a separate signer process that enforces policy before signing.

- **Best for:** separating browser-control authority from signing authority while still using a wallet protocol supported by many dapps.
- **Browser integration:** the agent initiates WalletConnect in the dapp, captures or passes the pairing URI to the bridge, and waits for session approval/results.
- **Signer boundary:** private key never enters the browser or agent context; the bridge receives structured JSON-RPC requests and returns approved signatures or errors.
- **Safety model:** chain allowlist, contract/function allowlist, value caps, allowance limits, simulation, session expiry, audit logging, and human approval for high-risk requests.
- **Verification target:** pair a local dapp, accept only an allowlisted `eth_sendTransaction`, reject a disallowed chain or value, and log both decisions.
- **Main limitation:** only works when the dapp supports WalletConnect-compatible flows.

## 4. Local policy signer service

Expose a local JSON-RPC, HTTP, Unix-socket, or test-harness service that accepts structured signing requests from the browser/test harness and applies deterministic policy before using an EOA.

- **Best for:** controlled automation where the agent never sees the key and the team controls the provider surface.
- **Browser integration:** inject an EIP-1193 provider that forwards `eth_accounts`, `eth_chainId`, `personal_sign`, `eth_signTypedData_v4`, and `eth_sendTransaction` requests to the service.
- **Signer boundary:** browser and agent can propose wallet actions; the signer service is the only component that can access key material and broadcast transactions.
- **Safety model:** explicit policy file, dry-run/simulation before signing, zero secret logging, short-lived sessions, and deny-by-default behavior.
- **Verification target:** demonstrate allow/deny decisions with audit records before adding any extension wallet complexity.
- **Main limitation:** provider shim may need to emulate wallet-specific behavior for dapps that assume MetaMask quirks.

## 5. Human-in-the-loop approval queue

The agent prepares actions and transaction payloads; a user approves or rejects them in a separate UI/chat/hardware-wallet flow before signing.

- **Best for:** public-network workflows, high-value approvals, first use of a new contract, or any action that exceeds autonomous policy limits.
- **Browser integration:** automation pauses at the signing boundary and resumes only after approval, rejection, or timeout.
- **Signer boundary:** the human approval surface must be outside the browser page the agent controls to avoid dapp prompt spoofing.
- **Safety model:** decoded calldata, target chain/contract/function, value/token movement, simulation result, nonce, expiry, and exact approval scope are shown before signing.
- **Verification target:** reject unknown calldata, timeout stale requests, and require explicit approval for token approvals or public-network value transfers.
- **Main limitation:** lower throughput and not suitable for unattended CI.

## 6. Account abstraction / session keys

Use smart accounts, session keys, delegation frameworks, or scoped permissions so the agent controls only limited capabilities rather than an all-powerful EOA.

- **Best for:** repeatable bounded tasks where permissions can be encoded as capabilities with target, selector, value, rate, and expiry limits.
- **Browser integration:** dapp support varies; may require a custom connector, smart-account SDK, bundler, or paymaster.
- **Signer boundary:** the agent may hold a limited session key, while the root owner EOA remains offline or human-controlled.
- **Safety model:** enforceable session scope, short expiry, spend limits, revocation path, and monitoring for permission misuse.
- **Verification target:** create a session key that can call exactly one test contract function on a local chain and fails all other calls.
- **Main limitation:** not a drop-in solution for EOA-only dapps and likely too much moving parts for the first prototype.

## Initial recommendation

1. **Prototype first: disposable local/devnet signer with an injected provider.** It is the fastest path to deterministic Playwright/Puppeteer coverage and keeps raw-key exposure acceptable because accounts are valueless and recreated per run.
2. **Prototype second: local policy signer service or WalletConnect bridge.** This preserves the same browser-vs-signer separation while adding policy, simulation, audit logging, and optional human approval.
3. **Evaluate extension-wallet automation in parallel as a compatibility track.** It is important for realism, but should not be the primary safety primitive because the browser profile itself becomes a sensitive signing container.
4. **Defer public-network autonomy.** Public-network actions should start as prepare-only or human-approved flows until the policy model, simulation, and audit trail are proven.

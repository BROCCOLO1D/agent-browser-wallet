# Threat model

This threat model focuses on EVM EOA signing during Playwright/Puppeteer-style browser automation. It assumes the browser page may be hostile or compromised and that the agent may misunderstand UI intent, so signing authority must be constrained separately from browser-control authority.

## Assets

- Raw private keys, seed phrases, keystore files, and browser wallet profile secrets.
- Signing capability for EOAs, session keys, delegated accounts, and WalletConnect sessions.
- RPC credentials, bundler/paymaster credentials, faucet credentials, and CI secrets.
- Browser session state, cookies, extension storage, dapp connection permissions, and WalletConnect pairing/session data.
- Funds, NFT ownership, token allowances, permit signatures, delegation rights, and contract admin permissions.
- Policy files, approval records, audit logs, simulation traces, and transaction history.

## Trust boundaries

- **Agent process vs. browser automation process:** the agent can propose and click, but should not be able to sign valuable payloads directly.
- **Browser page vs. injected provider or extension wallet:** page JavaScript is untrusted input to the wallet boundary.
- **Browser automation harness vs. signer service:** the harness may route requests, but the signer/policy layer makes allow/deny decisions.
- **Extension profile vs. normal user wallet:** test profiles must be isolated from real wallet profiles and production secrets.
- **Local/devnet chains vs. testnet/public networks:** local keys are disposable; public-network signing has real asset impact.
- **Human approval surface vs. dapp-controlled UI:** approval must happen outside the page the agent controls to avoid spoofing.
- **Policy configuration vs. runtime request:** the signer must sign exactly the payload evaluated by policy; any mutation re-enters policy.

See [architecture notes](architecture.md) for the component-level trust boundary diagrams and [wallet-action policy model](policy-model.md) for concrete enforcement rules.

## Risk levels

| Level | Context | Allowed autonomy | Minimum controls |
| --- | --- | --- | --- |
| Local/devnet | Anvil/Hardhat/Ganache or in-process test chain | Full autonomous signing is acceptable only for disposable accounts. | Local RPC allowlist, fixture contract/function allowlist, deterministic reset, audit log. |
| Forked local | Local fork of public state with no public broadcast | Autonomous signing can test realistic state if transactions cannot escape the fork. | Local-only RPC enforcement, chain/fork labeling, no real private keys, no upstream broadcast path. |
| Testnet | Low-value test assets | Agent may request signatures through a policy gate. | Chain/contract/function allowlists, value and allowance caps, simulation, short sessions. |
| Public prepare | No signature, dry-run, or transaction draft only | Agent can prepare decoded requests for review. | No signer key in agent/browser, simulation, human-readable diff, audit record. |
| Public write/value | Real assets, approvals, permits, or delegations | Human approval or hardened policy signer required; no blind autonomous signing. | Human approval outside dapp page, exact payload hash, caps, simulation, audit, replay protection. |

## Abuse cases and mitigations

| Abuse case | How it can happen | Impact | Mitigations |
| --- | --- | --- | --- |
| Raw key or seed exfiltration | Key appears in repo, docs, logs, CI env, browser profile, prompt context, or stack trace. | Attacker drains all assets controlled by the EOA. | Never commit secrets; use disposable local keys only; keep production keys out of agent-readable storage; redact logs; rotate any exposed test key. |
| Malicious dapp requests a disguised transaction | Dapp UI says “connect” or “claim” while provider request sends value, calls attacker contract, or grants approval. | Loss of funds or future spending authority. | Decode calldata/typed data; allowlist chain/contract/selector; simulate effects; require human approval for unknowns or public-network asset impact. |
| Wrong chain signing | Dapp or wallet switches from local/testnet to public network, or RPC metadata is spoofed. | Intended test action becomes real transaction. | Pin numeric chain IDs; verify RPC-reported chain ID; deny chain switching unless configured; local signer refuses non-local RPC URLs. |
| Extension profile reuse | A seeded MetaMask/Rabby profile persists across tests, receives funds, or is reused by a human. | Test automation can spend unintended assets; state leaks across runs. | Isolate user-data-dir per suite; use low-value accounts; reset/discard profiles; record wallet version; never import production seed phrases. |
| Wallet popup automation clicks through risk | Playwright selectors click approve/sign without verifying prompt content. | Agent signs unexpected requests because UI changed or was spoofed. | Match expected prompt target/value/function when visible; pin extension versions; prefer policy signer for safety; require human approval for public networks. |
| Unlimited token/NFT approval | Dapp requests `approve(max)` or `setApprovalForAll` during a test flow. | Future drain risk beyond the current transaction. | Deny unlimited approvals by default; cap spender/token/amount; require human approval for public approvals and permits; revoke/cleanup exact test approvals. |
| Permit or typed-data blind signing | Agent signs EIP-712/permit/delegation payload that grants offchain spend rights. | No immediate transaction appears, but attacker gains authorization. | Decode typed data domain and message; disable blind `eth_sign`; allowlist typed-data schemas; human approval for public-network permits/delegations. |
| Simulation gap or false confidence | Simulation unavailable, run against wrong state, or misses MEV/proxy/external effects. | Policy approves a harmful or failing transaction. | Treat simulation as necessary but not sufficient; fail closed when unavailable on testnet/public; include block tag/state in audit; keep allowlists/caps active. |
| Policy bypass through alternate provider path | Dapp uses extension provider, WalletConnect, direct RPC, or custom iframe not routed through policy. | Requests avoid the signer gate and audit trail. | In tests, expose only one intended wallet path; block/monitor unexpected providers; make signer the only holder of key material; audit all signing transports. |
| Human approval spoofing/context confusion | Dapp page displays fake “approved” UI or agent summarizes request incorrectly. | Human approves wrong action or automation resumes after fake approval. | Approval UI outside browser page; show decoded payload and exact hash; use request IDs, expiries, and approve/reject states from policy service only. |
| Session replay or stale request signing | Old WalletConnect/provider request is replayed after policy/session context changes. | Duplicate or out-of-context signature. | Short session expiry; single-use request IDs/nonces; bind request to origin/account/chain; log duplicate/replay denials. |
| Audit log tampering or secret leakage | Logs are overwritten, omitted, or include sensitive data. | Loss of forensic trail or further credential exposure. | Append-only NDJSON or structured audit sink; redact secrets; record policy version/hash; write decision before signing and result after broadcast. |
| Test account accidentally funded with real value | A “test” EOA address is reused on public networks or receives valuable tokens/NFTs. | Autonomous tests gain spend authority over real assets. | Environment-specific accounts; monitor balances before autonomous runs; hard stop on nonzero public-network value; never reuse local mnemonic outside devnet. |
| Account-abstraction/session-key overscope | Session key permits too many targets, high spend, long expiry, or broad delegation. | Agent gets durable authority equivalent to a hot wallet. | Encode narrow target/selector/value/rate/expiry scopes; provide revocation; audit every user operation; use human approval for scope increases. |
| CI artifact leakage | Browser profiles, traces, videos, storage state, or wallet logs are uploaded as artifacts. | Secrets or wallet sessions become downloadable. | Exclude profile directories and storage state from artifacts; sanitize traces; keep audit logs secret-aware; use throwaway credentials. |

## Baseline controls

- Never store high-value raw keys in agent-readable files, browser profiles, prompts, docs, or CI artifacts.
- Treat giving an agent a funded raw key as unsafe except for disposable local/devnet keys.
- Separate signing into a minimal, policy-enforcing process whenever value or public networks are involved.
- Apply chain, contract, function selector, value, token allowance, session, and origin limits.
- Simulate transactions before signing when possible, but still enforce allowlists and caps.
- Require human approval for public-network value transfer, token/NFT approvals, permits, delegations, unknown calldata, and policy overrides.
- Rotate/reset browser profiles, WalletConnect sessions, test accounts, and local chain state between runs.
- Log signing requests and decisions without logging secrets; preserve request IDs and exact payload hashes.
- Deny by default when chain identity, target contract, function selector, typed data, or simulation result is unknown.

## Pathway-specific concerns

### Disposable local/devnet signer

- Safe only if the chain is local and the key is disposable.
- Hard stop on public RPC URLs, known public chain IDs, persistent seed files, or non-fixture contracts.
- Forked public state is acceptable only when transactions cannot be broadcast upstream.

### Browser extension wallet automation profile

- The profile is a signing container and should be treated as sensitive even for testnet.
- UI automation is compatibility coverage, not a policy enforcement mechanism.
- Reset profiles and pin wallet versions/selectors; require external human approval for public-network prompts.

### Policy signer service / WalletConnect bridge

- WalletConnect or provider injection is only transport; policy enforcement is the safety boundary.
- Deny requests missing policy, simulation, decoded calldata, or session context.
- Audit both accepted and denied requests so malicious dapp behavior is visible during tests.

### Human approval

- Human approval must happen outside the dapp page and include decoded action details, simulation summary, risk flags, exact payload hash, and expiry.
- Approval should be for one exact payload, not a broad “let the agent continue” permission.

### Account abstraction / session keys

- Session keys reduce raw EOA risk only if their scope is technically enforced and revocable.
- Treat broad session keys as hot wallets; constrain targets, selectors, value, rate, and expiry.

## Open research questions

- Which transaction decoding/simulation stack gives the best local/testnet developer experience for EVM browser tests?
- How much of MetaMask/Rabby popup content can be reliably asserted across versions before tests become too brittle?
- What is the smallest injected-provider surface that covers common dapp test flows without emulating a full wallet?
- How should audit logs be stored in CI so they are available for debugging without leaking wallet/session secrets?
- Which account-abstraction/session-key frameworks are practical for EOA-style dapp compatibility versus custom connectors?

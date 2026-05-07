# Threat model

## Assets

- Raw private keys, seed phrases, and wallet profile secrets.
- Signing capability for EOAs or session keys.
- RPC credentials and API keys.
- Browser session state and wallet connection sessions.
- Funds, NFT approvals, token allowances, and contract permissions.
- Audit logs and approval history.

## Trust boundaries

- Agent process vs. browser automation process.
- Browser page vs. extension wallet UI.
- Test harness vs. signer service.
- Local/devnet chains vs. public networks.
- Human approval surface vs. autonomous execution.

## Primary risks

- Agent exfiltrates or accidentally leaks private keys or seed phrases.
- Malicious or compromised dapp tricks the agent into approving dangerous transactions.
- Agent signs on the wrong chain or against the wrong contract.
- Transaction payload is opaque or misdecoded.
- Browser profile persists dangerous state between runs.
- Playwright/Puppeteer automation bypasses intended human review.
- Test accounts accidentally receive real funds or approvals.
- Logs capture sensitive wallet material.

## Baseline controls

- Never store high-value raw keys in agent-readable files.
- Use disposable devnet/testnet accounts by default.
- Separate signing into a minimal, policy-enforcing process.
- Apply chain, contract, function selector, value, and token allowance limits.
- Simulate transactions before signing when possible.
- Require human approval for public-network value transfer or approvals.
- Rotate/reset browser profiles and wallet sessions.
- Log signing requests and decisions without logging secrets.

## Risk levels

| Level | Context | Allowed autonomy |
| --- | --- | --- |
| Local | Anvil/Hardhat/devnet only | Full agent control of disposable keys is acceptable. |
| Testnet | Low-value testnet assets | Agent may request signatures through policy gate. |
| Mainnet read/prepare | No signing or zero-value dry runs | Agent can prepare transactions for review. |
| Mainnet write/value | Real assets or approvals | Human approval or hardened policy signer required. |

## Research needed

- Best transaction decoding and simulation stack for EVM actions.
- Reliable policy schema for wallet actions.
- Safe storage patterns for low-value test keys and browser profiles.
- Attack scenarios specific to wallet extension automation.

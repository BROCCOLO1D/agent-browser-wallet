# Wallet-action policy model

This model describes the policy layer for a local signer service, WalletConnect bridge, or extension-automation guardrail. It is intentionally deny-by-default: the browser page and agent may propose wallet actions, but only the signer/policy layer can approve the exact payload to be signed or broadcast.

## Policy goals

- Keep raw EOA keys out of the agent and browser page except for disposable local/devnet accounts.
- Make every wallet action explicit, bounded, simulated where possible, and auditable.
- Support full automation on local/devnet, constrained automation on testnet, and human-reviewed public-network actions.
- Fail closed when calldata, chain identity, token effects, or approval scope cannot be decoded.

## Scope by environment

| Environment | Default autonomy | Required controls | Disallowed by default |
| --- | --- | --- | --- |
| Local/devnet | Autonomous signing allowed for disposable accounts | Chain allowlist, local RPC check, fixture contract/function allowlist, reset/audit per run | Persistent funded keys, public RPC broadcast, unbounded approvals unless fixture explicitly tests them |
| Testnet | Autonomous signing only for low-value, allowlisted actions | Chain allowlist, contract/function allowlist, value and allowance caps, simulation, short session expiry, audit log | Unknown contracts, nonzero value above cap, unlimited token approvals, failed/unknown simulation |
| Public network | Prepare-only or human-approved signing | All testnet controls plus human approval for value, approvals, new contracts, opaque calldata, or first-use actions | Fully autonomous transfer of real assets, raw key exposure to agent/browser, blind signing |

## Wallet action request

A policy engine should normalize every provider request into a single wallet-action record before evaluation.

```ts
type WalletActionRequest = {
  id: string;                    // unique request id for audit/replay checks
  sessionId: string;
  requestedAt: string;           // ISO timestamp
  origin: string;                // dapp origin seen by browser or WalletConnect metadata
  transport: 'injected-provider' | 'walletconnect' | 'extension-popup' | 'test-harness';
  method: 'eth_sendTransaction' | 'eth_signTransaction' | 'personal_sign' | 'eth_signTypedData_v4';
  chainId: number;
  from: `0x${string}`;
  to?: `0x${string}`;
  valueWei: string;
  data?: `0x${string}`;
  decoded?: {
    contractName?: string;
    functionName?: string;
    selector?: `0x${string}`;
    argsSummary?: Record<string, unknown>;
    tokenEffects?: Array<{
      token: `0x${string}`;
      standard: 'ERC20' | 'ERC721' | 'ERC1155' | 'native' | 'unknown';
      direction: 'in' | 'out' | 'approval' | 'unknown';
      amount?: string;
      spender?: `0x${string}`;
    }>;
  };
  simulation?: {
    status: 'passed' | 'failed' | 'unavailable';
    blockTag?: string;
    nativeDeltaWei?: string;
    tokenDeltas?: Array<Record<string, unknown>>;
    warnings?: string[];
  };
};
```

This is illustrative documentation, not a committed runtime API. Later prototypes can translate it into TypeScript or JSON Schema.

## Evaluation order

1. **Session check:** session exists, has not expired, matches expected origin/transport/account, and has not been revoked.
2. **Method check:** method is allowed for the environment; blind `eth_sign` should remain disabled because it lacks typed intent.
3. **Chain check:** `chainId` is in the allowlist and the RPC endpoint agrees with that chain ID.
4. **Account check:** `from` is one of the session's allowed accounts and matches the signer identity.
5. **Target check:** `to` contract is allowlisted for the current environment and origin.
6. **Function check:** calldata selector or typed-data domain/message is decoded and allowlisted.
7. **Value check:** native value is within per-transaction and per-session caps.
8. **Allowance check:** token approval amount and spender are bounded; unlimited approvals require human approval or local-only fixture scope.
9. **Simulation check:** simulation passes and expected state/token/native deltas are within policy.
10. **Human-approval check:** trigger approval if any rule requires escalation.
11. **Audit check:** write the decision before signing; write final signature/tx hash after signing or broadcasting.

The signer must sign exactly the payload evaluated by policy. Any mutation after approval requires a new request id and full re-evaluation.

## Core policy dimensions

### Chain allowlist

- Store numeric chain IDs and expected RPC URLs/names per environment.
- Local/devnet entries should include a local-only RPC matcher such as `127.0.0.1`, `localhost`, or an in-process provider.
- Testnet/public entries should pin expected chain IDs; never trust dapp-provided chain metadata alone.
- Deny chain-switch requests unless the requested chain is explicitly configured for the session.

### Contract and function allowlists

- Allow by `(chainId, contractAddress, selector)` rather than contract name alone.
- Include ABI references or verified signatures so calldata can be decoded before approval.
- Prefer narrow fixture functions for local prototypes, e.g. a single `setMessage(string)` or `mintTestToken(address,uint256)` call.
- Require human approval for unknown selectors, fallback calls, proxy upgrades, delegatecall-like admin paths, or newly deployed contracts on public networks.

### Value caps

- Enforce both per-transaction and per-session caps in native token units.
- Use zero-value defaults for initial browser tests unless the fixture explicitly exercises value transfer.
- Include gas-cost visibility in audit logs; on public networks, gas spend can be real value even when `valueWei` is zero.
- Deny or escalate when simulation reports native/token deltas outside the cap.

### Allowance handling

- Treat ERC-20, ERC-721, and ERC-1155 approvals as high-risk because they grant future authority beyond the current transaction.
- Deny unlimited approvals by default outside local/devnet fixture tests.
- Allow testnet approvals only when spender, token, amount, and expiry/session purpose are bounded.
- Require human approval for public-network `approve`, `setApprovalForAll`, permit-style signatures, and typed data that grants spend rights.
- Prefer exact allowances followed by cleanup/revocation in tests that need approvals.

### Transaction simulation

- Simulate `eth_sendTransaction` requests before signing when an RPC/fork backend supports it.
- Simulation should capture revert status, native/token deltas, emitted events, allowance changes, and warnings for unknown effects.
- Failed simulation denies automatically for testnet/public; local fixtures may allow expected reverts only when the test explicitly asserts rejection behavior.
- Simulation is advisory, not sufficient: policy allowlists and caps still apply.

### Session expiry and replay protection

- Sessions must include `createdAt`, `expiresAt`, origin, allowed chains, allowed accounts, and cumulative caps.
- Use short-lived sessions for tests; CI sessions should end when the test process exits.
- Request IDs and nonces should be single-use; repeated requests should produce explicit duplicate/replay audit entries.
- Revoke sessions when chain/account/origin changes unexpectedly.

### Audit logging

Minimum fields for every decision:

- request id, session id, timestamp, origin, transport, method
- chain id, from, to, value, calldata selector or typed-data domain
- decoded function and argument summary when available
- policy version/hash and matched rule id
- simulation status and concise effect summary
- decision: `allowed`, `denied`, `needs_human`, `approved_by_human`, `rejected_by_human`, `timed_out`
- denial/escalation reason
- signer identity/address, tx hash/signature digest for approved actions

Never log raw private keys, seed phrases, decrypted wallet files, full secret env vars, or unredacted approval credentials.

## Human approval triggers

Require human approval when any of these are true:

- Public-network transaction or signature with real asset impact.
- Native value exceeds the autonomous cap or gas estimate is unusually high.
- Token/NFT approval, permit, delegation, or `setApprovalForAll` outside local fixtures.
- Unknown contract, unknown function selector, proxy/admin operation, or opaque calldata.
- Simulation fails, is unavailable on testnet/public, or reports unexpected token/native deltas.
- New dapp origin, new chain, new account, or first use of a contract in a session.
- The agent requests a policy override, session extension, or cap increase.

Human approval prompts should show the decoded action, risk flags, simulation summary, exact payload hash, expiry, and a clear approve/reject choice outside the dapp page controlled by the agent.

## Example local-only policy sketch

```yaml
environment: local
session:
  maxDurationSeconds: 900
  allowedOrigins:
    - http://127.0.0.1:5173
chains:
  - chainId: 31337
    rpcUrlPattern: "http://127.0.0.1:*"
accounts:
  mode: disposable-devnet-only
limits:
  maxNativeValueWeiPerTx: "0"
  maxNativeValueWeiPerSession: "0"
contracts:
  - address: "<fixture contract address from test deployment>"
    functions:
      - selector: "<selector for the fixture function>"
        name: "fixtureFunction(...)"
        maxCallsPerSession: 5
approvals:
  erc20: deny
  erc721: deny
  erc1155: deny
simulation:
  required: true
audit:
  sink: ./artifacts/wallet-actions.ndjson
humanApproval:
  required: false
```

Keep placeholders as placeholders in docs; do not commit seeds, private keys, generated accounts, or real contract credentials.

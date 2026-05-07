# Phase 3 MetaMask onboarding usage and acceptance

Phase 3 starts the MetaMask onboarding layer for importing a configured burner Sepolia private key into an isolated MetaMask profile. The first implementation is deliberately mockable: it validates and redacts onboarding inputs, exposes a small state-machine driver contract, and defines the Playwright selector/helper surface that future real extension-page automation should fill in.

## Required local inputs

Copy `.env.example` to an ignored local `.env` and provide only burner/testnet values:

```bash
SEPOLIA_WALLET_ADDRESS=0x0000000000000000000000000000000000000000
SEPOLIA_WALLET_PRIVATE_KEY=replace-with-testnet-burner-private-key
METAMASK_PASSWORD=replace-with-local-wallet-password
METAMASK_ONBOARDING_TIMEOUT_MS=60000
METAMASK_ONBOARDING_DEBUG=false
```

`SEPOLIA_WALLET_ADDRESS`, `SEPOLIA_WALLET_PRIVATE_KEY`, and `METAMASK_PASSWORD` are required for onboarding. The timeout/debug flags are optional and can also be passed programmatically.

## Programmatic onboarding plan

Library consumers can pass explicit values or an injected env object. The helper does not read `.env` files directly.

```ts
import {
  createMetaMaskOnboardingPlan,
  resolveMetaMaskOnboardingConfig
} from '@agent-browser-wallet/wallet-browser';

const onboardingConfig = resolveMetaMaskOnboardingConfig({
  env: process.env
});
const plan = createMetaMaskOnboardingPlan(onboardingConfig);

// Safe for structured status output: private key and password are redacted.
console.log(JSON.stringify(plan));
```

The plan includes the expected address, timeout/debug settings, a redacted private-key/password view, selector constants for the pinned MetaMask onboarding flow, and a `run(driver)` method. `run(driver)` accepts a `MetaMaskOnboardingDriver` so tests can verify import/unlock/address behavior with mocks before a real extension artifact is available.

## CLI onboarding plan

After `pnpm build`, developers and agents can validate onboarding inputs and print the same redacted plan without requiring a MetaMask extension artifact:

```bash
pnpm --filter @agent-browser-wallet/wallet-browser cli onboarding-plan
```

The command returns non-zero on invalid address/private-key/password shape. Error messages name the invalid variable but do not echo the supplied private key or password.

## Playwright extension-page boundary

Phase 3 exports these stable helper entry points for future real MetaMask UI automation:

- `METAMASK_ONBOARDING_SELECTORS` for onboarding/import/unlock controls;
- `isMetaMaskExtensionPageUrl(url, extensionId?)` and `findMetaMaskExtensionPage({ context, extensionId })` to locate an already-open `chrome-extension://.../home.html` or `notification.html` MetaMask page;
- `createMetaMaskPageDriver({ context, page, extensionId, timeoutMs })`;
- `importPrivateKeyIntoMetaMaskPage(page, input)`;
- `unlockMetaMaskPage(page, input)`;
- `verifyMetaMaskActiveAddress(page, expectedAddress)`.

The discovery helper fails closed if no MetaMask page is open or if multiple candidate extension pages are open without an explicit page. `createMetaMaskPageDriver` now binds either an explicit `page` or the discovered extension page, can classify known onboarding, locked, and unlocked UI states from the selector contract, and can perform the locked-wallet password-fill/submit step through `unlockMetaMaskPage`. Private-key import and active-address extraction still fail closed until the pinned MetaMask pages are wired and verified. That keeps dapp tests from silently approving prompts when MetaMask changes screens or selectors.

## Acceptance for this slice

- Onboarding inputs validate address/private-key/password shape and normalize address/private-key casing/prefixes.
- Public plan/status objects redact private keys and passwords.
- Onboarding plan creation works from explicit options, injected env, or the `wallet-browser onboarding-plan` CLI command and does not require direct `.env` parsing.
- The onboarding state machine can import, unlock, and verify the expected active address through a mocked driver.
- Unknown MetaMask UI state and active-address mismatches fail closed without exposing raw secrets.

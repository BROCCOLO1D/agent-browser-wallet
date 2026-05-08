import { DEFAULT_SEPOLIA_CHAIN_ID, chainIdToHex, resolveSepoliaNetworkConfig, type SepoliaNetworkEnv } from './network.js';
import { maskEthereumAddress } from './profile-bootstrap.js';

export const WILDCAT_LENDER_URL = 'https://testnet.wildcat.finance/lender';
export const WILDCAT_LENDER_ARTIFACT_DIR = '.wallet-artifacts/wildcat-lender/<run-id>';

export interface WildcatLenderConnectionPlanOptions {
  cwd?: string;
  env?: SepoliaNetworkEnv;
}

export interface WildcatLenderConnectionPlanStep {
  action:
    | 'open-target'
    | 'dismiss-common-modals'
    | 'click-connect-wallet'
    | 'select-metamask'
    | 'approve-metamask-connect'
    | 'verify-wallet-state'
    | 'capture-connected-proof';
  description: string;
  selectors?: readonly string[];
  guardrail?: string;
}

export interface WildcatLenderConnectionPlan {
  status: 'local-only-plan';
  target: 'wildcat-lender';
  url: typeof WILDCAT_LENDER_URL;
  expectedChainId: number;
  expectedChainIdHex: string;
  expectedMaskedAccount: string;
  allowedOrigins: readonly string[];
  maxTransactionValueWei: '0';
  artifactDir: typeof WILDCAT_LENDER_ARTIFACT_DIR;
  steps: readonly WildcatLenderConnectionPlanStep[];
  diagnostics: readonly string[];
  safetyNotes: readonly string[];
}

export function createWildcatLenderConnectionPlan(
  options: WildcatLenderConnectionPlanOptions = {}
): WildcatLenderConnectionPlan {
  const network = resolveSepoliaNetworkConfig({ env: options.env, chainId: DEFAULT_SEPOLIA_CHAIN_ID });
  return {
    status: 'local-only-plan',
    target: 'wildcat-lender',
    url: WILDCAT_LENDER_URL,
    expectedChainId: DEFAULT_SEPOLIA_CHAIN_ID,
    expectedChainIdHex: chainIdToHex(DEFAULT_SEPOLIA_CHAIN_ID),
    expectedMaskedAccount: maskEthereumAddress(network.expectedAccount),
    allowedOrigins: [WILDCAT_LENDER_URL],
    maxTransactionValueWei: '0',
    artifactDir: WILDCAT_LENDER_ARTIFACT_DIR,
    steps: createWildcatPlanSteps(),
    diagnostics: [
      'Run only against an ignored local MetaMask burner profile; do not preserve browser profiles, traces, or screenshots in Git.',
      'If the live site is flaky or unavailable, preserve only the redacted manifest and local screenshots under ignored .wallet-artifacts/.',
      'A successful proof must show the connected lender page after shared MetaMask prompt discovery and wallet state verification, not loading, onboarding, or disconnected UI.'
    ],
    safetyNotes: [
      'This command is a deterministic plan only; it does not launch Chromium, import wallets, connect, sign, or transact.',
      'The future live harness must keep max transaction value at zero wei and fail closed on any transaction, signature, unknown prompt, wrong origin, wrong account, or wrong network.',
      'Artifacts belong under .wallet-artifacts/wildcat-lender/<run-id>/ and must remain local-only until manually inspected and scanned.'
    ]
  };
}

function createWildcatPlanSteps(): readonly WildcatLenderConnectionPlanStep[] {
  return [
    {
      action: 'open-target',
      description: 'Open the Wildcat testnet lender page in the persistent Chromium profile.',
      guardrail: `Only navigate to ${WILDCAT_LENDER_URL}.`
    },
    {
      action: 'dismiss-common-modals',
      description: 'Dismiss common consent, terms, cookie, or network warning modals if they appear.',
      selectors: [
        'button:has-text("Accept")',
        'button:has-text("Agree")',
        'button:has-text("I understand")',
        'button:has-text("Close")'
      ],
      guardrail: 'Only click visible modal dismissal buttons with benign consent/close text.'
    },
    {
      action: 'click-connect-wallet',
      description: 'Click the Wildcat connect wallet entry point.',
      selectors: ['button:has-text("Connect Wallet")', 'button:has-text("Connect")'],
      guardrail: 'Fail closed if the page does not expose an explicit connect-wallet action.'
    },
    {
      action: 'select-metamask',
      description: 'Select MetaMask from the wallet chooser.',
      selectors: ['button:has-text("MetaMask")', '[data-testid*="metamask" i]'],
      guardrail: 'Fail closed if MetaMask is not an explicit wallet option.'
    },
    {
      action: 'approve-metamask-connect',
      description: 'Approve only the shared MetaMask connection prompt discovered on notification.html.',
      guardrail: `Prompt text must include ${WILDCAT_LENDER_URL} and must not look like a signature or transaction prompt.`
    },
    {
      action: 'verify-wallet-state',
      description: 'Assert Sepolia chain 11155111 and the configured burner account before declaring success.',
      guardrail: 'Fail closed on wrong chain, wrong account, unknown prompt, or any transaction/value request.'
    },
    {
      action: 'capture-connected-proof',
      description: 'Capture local-only diagnostics after the Wildcat lender UI shows connected state with a masked account.',
      guardrail: 'Screenshot and manifest must be redacted, local-only, and stored under ignored .wallet-artifacts/wildcat-lender/.'
    }
  ];
}

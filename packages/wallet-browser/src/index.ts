export {
  PINNED_METAMASK_VERSION,
  resolveWalletBrowserConfig,
  type ResolveWalletBrowserConfigOptions,
  type WalletBrowserConfig,
  type WalletBrowserEnv
} from './config.js';

export {
  buildChromiumExtensionArgs,
  launchWalletBrowser,
  prepareChromiumLaunchOptions,
  type PreparedChromiumLaunchOptions,
  type WalletBrowserLaunchResult
} from './launcher.js';

export { runWalletBrowserCli, type WalletBrowserCliOptions } from './cli.js';

export {
  DEFAULT_METAMASK_ONBOARDING_TIMEOUT_MS,
  METAMASK_ONBOARDING_SELECTORS,
  createMetaMaskOnboardingPlan,
  createMetaMaskPageDriver,
  findMetaMaskExtensionPage,
  importPrivateKeyIntoMetaMaskPage,
  isMetaMaskExtensionPageUrl,
  maskSecret,
  resolveMetaMaskOnboardingConfig,
  runMetaMaskOnboarding,
  unlockMetaMaskPage,
  validateEthereumAddress,
  validateMetaMaskPassword,
  validatePrivateKey,
  verifyMetaMaskActiveAddress,
  type MetaMaskImportPrivateKeyInput,
  type MetaMaskExtensionPageDiscoveryOptions,
  type MetaMaskOnboardingConfig,
  type MetaMaskOnboardingDriver,
  type MetaMaskOnboardingEnv,
  type MetaMaskOnboardingResult,
  type MetaMaskOnboardingState,
  type MetaMaskOnboardingStatus,
  type MetaMaskPageDriverOptions,
  type MetaMaskUnlockInput,
  type RedactedMetaMaskOnboardingPlan,
  type ResolveMetaMaskOnboardingConfigOptions
} from './onboarding.js';

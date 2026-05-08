export interface ExtensionPageLike {
  url(): string;
}

export interface DiscoverMetaMaskExtensionPageOptions {
  extensionId?: string;
}

const METAMASK_PAGE_PATHS = new Set(['/home.html', '/notification.html']);

export function isMetaMaskExtensionPageUrl(url: string, options: DiscoverMetaMaskExtensionPageOptions = {}): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'chrome-extension:') {
    return false;
  }

  const extensionId = options.extensionId?.trim();
  if (extensionId && parsed.hostname !== extensionId) {
    return false;
  }

  return METAMASK_PAGE_PATHS.has(parsed.pathname);
}

export function discoverMetaMaskExtensionPage<Page extends ExtensionPageLike>(
  pages: readonly Page[],
  options: DiscoverMetaMaskExtensionPageOptions = {}
): Page {
  const candidates = pages.filter((page) => isMetaMaskExtensionPageUrl(page.url(), options));

  if (candidates.length === 0) {
    throw new Error('No MetaMask extension page found. Expected one chrome-extension://<id>/home.html page.');
  }

  if (candidates.length > 1) {
    throw new Error('Multiple MetaMask extension page candidates found; refusing to choose an ambiguous wallet UI page.');
  }

  return candidates[0];
}

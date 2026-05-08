import { describe, expect, it } from 'vitest';

import { discoverMetaMaskExtensionPage } from '../src/extension-pages.js';

interface FakePage {
  url(): string;
}

function page(url: string): FakePage {
  return { url: () => url };
}

describe('discoverMetaMaskExtensionPage', () => {
  it('selects a single MetaMask home page from extension pages', () => {
    const candidate = page('chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/home.html');

    expect(discoverMetaMaskExtensionPage([page('about:blank'), candidate])).toBe(candidate);
  });

  it('selects a single MetaMask onboarding page from extension pages', () => {
    const candidate = page('chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/home.html#onboarding/welcome');

    expect(discoverMetaMaskExtensionPage([candidate])).toBe(candidate);
  });

  it('selects a single MetaMask notification page from extension pages', () => {
    const candidate = page('chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/notification.html');

    expect(discoverMetaMaskExtensionPage([candidate])).toBe(candidate);
  });

  it('can scope discovery to the expected extension id', () => {
    const expected = page('chrome-extension://expectedid/home.html');
    const unexpected = page('chrome-extension://otherid/home.html');

    expect(discoverMetaMaskExtensionPage([unexpected, expected], { extensionId: 'expectedid' })).toBe(expected);
  });

  it('fails closed when no MetaMask extension page is present', () => {
    expect(() => discoverMetaMaskExtensionPage([page('https://example.test/')])).toThrow('No MetaMask extension page found');
  });

  it('fails closed when multiple MetaMask extension page candidates are present', () => {
    expect(() =>
      discoverMetaMaskExtensionPage([
        page('chrome-extension://one/home.html'),
        page('chrome-extension://two/home.html#onboarding/welcome')
      ])
    ).toThrow('Multiple MetaMask extension page candidates found');
  });
});

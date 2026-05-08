#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const fixtureDir = resolve(repoRoot, 'apps/fixture-dapp');
const outputDir = resolve(repoRoot, 'docs/assets/readme');
const baseURL = 'http://127.0.0.1:5173';

const account = '0x1111111111111111111111111111111111111111';
const signature = `0x${'aa'.repeat(65)}`;
const txHash = `0x${'bb'.repeat(32)}`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit ${result.status}`);
  }
}

async function waitForServer(url, timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function injectMockProvider(page, chainId = '0xaa36a7') {
  await page.addInitScript(({ account, chainId, signature, txHash }) => {
    const listeners = new Map();
    let connected = false;
    window.ethereum = {
      async request(args) {
        if (args.method === 'eth_accounts') return connected ? [account] : [];
        if (args.method === 'eth_requestAccounts') {
          connected = true;
          return [account];
        }
        if (args.method === 'eth_chainId') return chainId;
        if (args.method === 'personal_sign') return signature;
        if (args.method === 'eth_sendTransaction') return txHash;
        throw new Error(`Unexpected method: ${args.method}`);
      },
      on(event, listener) {
        listeners.set(event, [...(listeners.get(event) ?? []), listener]);
      }
    };
    window.__fixtureEmitProviderEvent = (event, ...args) => {
      for (const listener of listeners.get(event) ?? []) listener(...args);
    };
  }, { account, chainId, signature, txHash });
}

async function screenshot(page, name) {
  await page.screenshot({ path: resolve(outputDir, name), fullPage: true });
}

run('pnpm', ['--filter', '@agent-browser-wallet/fixture-dapp', 'build']);
await mkdir(outputDir, { recursive: true });

const server = spawn('python3', ['-m', 'http.server', '5173', '--bind', '127.0.0.1'], {
  cwd: fixtureDir,
  stdio: ['ignore', 'pipe', 'pipe']
});

try {
  await waitForServer(baseURL);
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: 1040, height: 780 }, deviceScaleFactor: 1 });
    await page.goto(baseURL);
    await page.locator('[data-testid="status-output"]').waitFor({ state: 'visible' });
    await screenshot(page, 'fixture-no-provider.png');

    const connected = await browser.newPage({ viewport: { width: 1040, height: 780 }, deviceScaleFactor: 1 });
    await injectMockProvider(connected);
    await connected.goto(baseURL);
    await connected.locator('[data-testid="connect-wallet-button"]').click();
    await connected.locator('[data-testid="sign-message-button"]').click();
    await connected.locator('[data-testid="send-transaction-button"]').click();
    await connected.locator('[data-testid="send-transaction-status"]').waitFor({ state: 'visible' });
    await screenshot(connected, 'fixture-connected-actions.png');

    const guardrail = await browser.newPage({ viewport: { width: 1040, height: 780 }, deviceScaleFactor: 1 });
    await injectMockProvider(guardrail, '0x1');
    await guardrail.goto(baseURL);
    await guardrail.locator('[data-testid="connect-wallet-button"]').click();
    await guardrail.locator('[data-testid="send-transaction-button"]').click();
    await guardrail.locator('[data-testid="send-transaction-status"]').waitFor({ state: 'visible' });
    await screenshot(guardrail, 'fixture-guardrail-rejected.png');
  } finally {
    await browser.close();
  }
} finally {
  server.kill('SIGTERM');
}

console.log(`Captured README screenshots in ${outputDir}`);

import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const baseUrl = process.env.UI_AUDIT_BASE_URL ?? 'http://127.0.0.1:4173';
const debugPort = Number(process.env.UI_AUDIT_DEBUG_PORT ?? 9222);
const outputDir = path.resolve(process.cwd(), process.env.UI_AUDIT_OUTPUT_DIR ?? 'tmp-ui-audit-shots');
const startPreviewWhenNeeded = process.env.UI_AUDIT_START_PREVIEW !== 'false';
const browserPath = resolveBrowserPath();

const routes = [
  { name: 'dashboard', path: '/' },
  { name: 'inputs', path: '/analysis/new' },
  { name: 'review', path: '/analysis/review' },
  { name: 'result', path: '/analysis/recommendation' },
  { name: 'export', path: '/analysis/export' }
];

const viewports = [
  { name: 'desktop', width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false },
  { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 2, mobile: true }
];

class CdpClient {
  constructor(webSocket) {
    this.webSocket = webSocket;
    this.nextId = 1;
    this.pending = new Map();

    webSocket.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data.toString());
      if (payload.id && this.pending.has(payload.id)) {
        const entry = this.pending.get(payload.id);
        this.pending.delete(payload.id);
        if (payload.error) {
          entry.reject(new Error(payload.error.message));
        } else {
          entry.resolve(payload.result);
        }
      }
    });

    webSocket.addEventListener('close', () => {
      for (const entry of this.pending.values()) {
        entry.reject(new Error('CDP connection closed'));
      }
      this.pending.clear();
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const message = JSON.stringify({ id, method, params });

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.webSocket.send(message);
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });

    return result.result?.value;
  }

  close() {
    this.webSocket.close();
  }
}

async function main() {
  if (!browserPath) {
    throw new Error(
      'Unable to find Edge or Chrome. Set UI_AUDIT_BROWSER to a Chromium-based browser executable to capture screenshots.'
    );
  }

  let previewProcess;
  if (!(await canReach(baseUrl))) {
    if (!startPreviewWhenNeeded) {
      throw new Error(`Preview server is not reachable at ${baseUrl}`);
    }

    previewProcess = startPreview(baseUrl);
    await waitForUrl(baseUrl, 30000);
  }

  const browserProcess = startBrowser(browserPath, debugPort);

  try {
    await waitForUrl(`http://127.0.0.1:${debugPort}/json/version`, 20000);
    const client = await connectToFirstPage(debugPort);
    await client.send('Page.enable');

    await rm(outputDir, { recursive: true, force: true });
    await mkdir(outputDir, { recursive: true });

    for (const theme of ['light', 'dark']) {
      await seedSampleProject(client, theme);

      for (const viewport of viewports) {
        await setViewport(client, viewport);

        for (const route of routes) {
          await navigate(client, new URL(route.path, baseUrl).toString());
          await expandRouteDetails(client);
          await delay(250);

          const screenshot = await client.send('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: true,
            fromSurface: true
          });

          const targetPath = path.join(outputDir, `${route.name}-${theme}-${viewport.name}.png`);
          await writeFile(targetPath, Buffer.from(screenshot.data, 'base64'));
          console.log(`Captured ${path.relative(process.cwd(), targetPath)}`);
        }
      }
    }

    client.close();
  } finally {
    browserProcess.kill();
    previewProcess?.kill();
  }
}

function resolveBrowserPath() {
  if (process.env.UI_AUDIT_BROWSER && existsSync(process.env.UI_AUDIT_BROWSER)) {
    return process.env.UI_AUDIT_BROWSER;
  }

  for (const candidate of [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function startPreview(url) {
  const parsed = new URL(url);
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return spawn(command, ['run', 'preview', '--', '--host', parsed.hostname, '--port', parsed.port], {
    cwd: process.cwd(),
    stdio: 'ignore'
  });
}

function startBrowser(executable, port) {
  return spawn(
    executable,
    [`--headless=new`, '--disable-gpu', `--remote-debugging-port=${port}`, '--window-size=1600,2400', 'about:blank'],
    {
      cwd: process.cwd(),
      stdio: 'ignore'
    }
  );
}

async function connectToFirstPage(port) {
  const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
  const page = targets.find((target) => target.type === 'page');
  if (!page?.webSocketDebuggerUrl) {
    throw new Error('Unable to find a debuggable page target');
  }

  const webSocket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    webSocket.addEventListener('open', () => resolve());
    webSocket.addEventListener('error', (event) => reject(event.error ?? new Error('WebSocket connection failed')));
  });

  return new CdpClient(webSocket);
}

async function setViewport(client, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor,
    mobile: viewport.mobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height
  });
}

async function seedSampleProject(client, theme) {
  await navigate(client, new URL('/', baseUrl).toString());
  await client.evaluate(`
    (() => {
      localStorage.clear();
      localStorage.setItem('gear-bore-tolerancing:theme', ${JSON.stringify(theme)});
      return true;
    })()
  `);
  await navigate(client, new URL('/', baseUrl).toString());

  const clicked = await client.evaluate(`
    (() => {
      const button = [...document.querySelectorAll('button')].find((node) => node.textContent?.trim() === 'Load sample');
      if (!button) {
        return false;
      }
      button.click();
      return true;
    })()
  `);

  if (!clicked) {
    throw new Error('Unable to click the Load sample button');
  }

  await waitForCondition(
    client,
    `(() => location.pathname === '/analysis/recommendation' && Boolean(localStorage.getItem('gear-bore-tolerancing:draft')))()`,
    10000
  );
}

async function navigate(client, url) {
  await client.send('Page.navigate', { url });
  await waitForCondition(
    client,
    `(() => document.readyState === 'complete' && location.href.startsWith(${JSON.stringify(url)}))()`,
    10000
  );
}

async function expandRouteDetails(client) {
  await client.evaluate(`
    (() => {
      document.querySelectorAll('details').forEach((element) => {
        element.open = true;
      });
      return true;
    })()
  `);

  await clickAllButtons(client, 'Evidence');
  await clickAllButtons(client, 'Show trace');
}

async function clickAllButtons(client, label) {
  for (;;) {
    const clicked = await client.evaluate(`
      (() => {
        const button = [...document.querySelectorAll('button')].find((node) => node.textContent?.trim() === ${JSON.stringify(label)});
        if (!button) {
          return false;
        }
        button.click();
        return true;
      })()
    `);

    if (!clicked) {
      return;
    }

    await delay(120);
  }
}

async function waitForCondition(client, expression, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await client.evaluate(expression);
    if (result) {
      return;
    }

    await delay(150);
  }

  throw new Error(`Timed out while waiting for browser condition: ${expression}`);
}

async function canReach(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForUrl(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await canReach(url)) {
      return;
    }

    await delay(250);
  }

  throw new Error(`Timed out while waiting for ${url}`);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return response.json();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

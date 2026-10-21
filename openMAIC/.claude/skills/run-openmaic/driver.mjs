#!/usr/bin/env node
// Headless driver for the OpenMAIC dev server.
//
// Reads commands from stdin, one per line, and runs them against a single
// Chromium page. Same verb shape as chromium-cli, so the SKILL.md heredocs
// read the same either way. Run from the unit root (openMAIC/):
//
//   node .claude/skills/run-openmaic/driver.mjs <<'EOF'
//   nav http://localhost:3000
//   wait-for text=OpenMAIC
//   screenshot home
//   console --errors
//   EOF
//
// Uses the project's own @playwright/test (devDependency) and its browser,
// so no extra install is needed after `pnpm install`.

import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { tmpdir } from 'node:os';

const require = createRequire(join(process.cwd(), 'package.json'));
const { chromium } = require('@playwright/test');

const SHOT_DIR = process.env.OPENMAIC_SHOTS || join(tmpdir(), 'openmaic-shots');
const DEFAULT_TIMEOUT = 30_000;
mkdirSync(SHOT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

// "text=Foo" -> getByText, anything else is a CSS selector.
function locate(sel) {
  if (sel.startsWith('text=')) return page.getByText(sel.slice(5)).first();
  return page.locator(sel).first();
}

const commands = {
  async nav([url]) {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    console.log(`nav ${url} -> HTTP ${res?.status()}`);
  },
  // wait-for and click take the rest of the line as the selector, so
  // "text=Take Quiz" works. fill takes the first word as the selector.
  async 'wait-for'(args) {
    const sel = args.join(' ');
    await locate(sel).waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT });
    console.log(`visible: ${sel}`);
  },
  async click(args) {
    const sel = args.join(' ');
    await locate(sel).click({ timeout: DEFAULT_TIMEOUT });
    console.log(`clicked: ${sel}`);
  },
  async fill([sel, ...value]) {
    await locate(sel).fill(value.join(' '), { timeout: DEFAULT_TIMEOUT });
    console.log(`filled: ${sel}`);
  },
  // Real key events into the focused element. Prefer this over fill: on
  // some pages fill() updates the DOM but not React state.
  async type(args) {
    await page.keyboard.type(args.join(' '));
    console.log(`typed: ${args.join(' ')}`);
  },
  async press([key]) {
    await page.keyboard.press(key);
    console.log(`pressed: ${key}`);
  },
  async url() {
    console.log(page.url());
  },
  async text() {
    const body = await page.locator('body').innerText();
    console.log(body.slice(0, 800));
  },
  async eval(args) {
    const result = await page.evaluate(args.join(' '));
    console.log(JSON.stringify(result));
  },
  async screenshot([name = `shot-${Date.now()}`]) {
    const file = join(SHOT_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`screenshot: ${file}`);
  },
  async 'console'([flag]) {
    if (flag !== '--errors') {
      console.log('usage: console --errors');
      return;
    }
    console.log(consoleErrors.length ? consoleErrors.join('\n') : '(no console errors)');
  },
};

const rl = createInterface({ input: process.stdin });
for await (const raw of rl) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const [verb, ...args] = line.split(/\s+/);
  const run = commands[verb];
  if (!run) {
    console.log(`unknown command: ${verb}`);
    continue;
  }
  try {
    await run(args);
  } catch (err) {
    console.log(`FAILED ${line}: ${err.message.split('\n')[0]}`);
    process.exitCode = 1;
  }
}

await browser.close();

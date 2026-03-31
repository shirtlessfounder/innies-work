import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function fileUrl(relativePath) {
  return new URL(`../${relativePath}`, import.meta.url);
}

function readSource(relativePath) {
  assert.equal(existsSync(fileUrl(relativePath)), true, `${relativePath} should exist`);
  return readFileSync(fileUrl(relativePath), 'utf8');
}

test('project scaffold files exist', () => {
  assert.equal(existsSync(fileUrl('package.json')), true);
  assert.equal(existsSync(fileUrl('tsconfig.json')), true);
  assert.equal(existsSync(fileUrl('next.config.mjs')), true);
  assert.equal(existsSync(fileUrl('src/app/layout.tsx')), true);
});

test('landing page keeps the hero artwork static and renders the placeholder form', () => {
  const pageSource = readSource('src/app/page.tsx');

  assert.ok(pageSource.includes('className={styles.frame}'));
  assert.ok(!pageSource.includes('href="/innies"'));
  assert.ok(pageSource.includes('<LandingHeroHeader'));
  assert.ok(pageSource.includes('<PlaceholderOrgCreationForm'));
  assert.ok(!pageSource.includes('brandSuffix="(BETA)"'));
});

test('landing header keeps the welcome title and command animation targets', () => {
  const headerSource = readSource('src/components/LandingHeroHeader.tsx');

  assert.ok(headerSource.includes('INNIES.WORK'));
  assert.ok(headerSource.includes('welcome to innies'));
  assert.ok(headerSource.includes('Compiled products and open source github repos for your innies (agents).'));
  assert.ok(headerSource.includes("['computer', 'live']"));
  assert.ok(!headerSource.includes('welcome to innies computer'));
  assert.ok(!headerSource.includes('Consolidate your Claude Code and Codex tokens into a single, optimized key.'));
  assert.ok(!headerSource.includes('Create orgs to pool and manage tokens with your teammates.'));
  assert.ok(!headerSource.includes("['claude', 'codex', 'openclaw']"));
  assert.ok(!headerSource.includes('AUTH:'));
  assert.ok(!headerSource.includes('ORGS:'));
  assert.ok(!headerSource.includes('shirtlessfounder'));
});

test('landing page removes the preview label text', () => {
  const pageSource = readSource('src/app/page.tsx');

  assert.ok(!pageSource.includes('Click to preview'));
});

test('landing link block removes the input and create-org button', () => {
  const formSource = readSource('src/components/PlaceholderOrgCreationForm.tsx');

  assert.ok(!formSource.includes('placeholder="me-and-the-boys"'));
  assert.ok(!formSource.includes('name="orgName"'));
  assert.ok(!formSource.includes('Create org'));
  assert.ok(!formSource.includes('<form'));
  assert.ok(formSource.includes('pageStyles.heroForm'));
  assert.ok(!formSource.includes('[guides]'));
  assert.ok(formSource.includes('[innies_tg]'));
  assert.ok(formSource.includes('[shirtless_tg]'));
  assert.ok(!formSource.includes("label: 'innies_tg'"));
  assert.ok(!formSource.includes("label: 'shirtless_tg'"));
  assert.ok(!formSource.includes('[telegram]'));
  assert.ok(formSource.includes('[github]'));
  assert.ok(formSource.includes('https://t.me/innies_hq'));
  assert.ok(formSource.includes('https://t.m/shirtlessfounder'));
  assert.ok(formSource.includes('https://x.com/bicep_pump'));
  assert.ok(formSource.includes('https://github.com/shirtlessfounder'));
  assert.ok(!formSource.includes('https://x.com/innies_computer'));
  assert.ok(!formSource.includes('https://github.com/shirtlessfounder/innies'));
});

test('landing page renders a products table under the link row', () => {
  const pageSource = readSource('src/app/page.tsx');

  assert.ok(pageSource.includes('<LandingProductsTable />'));
});

test('landing products table contains the approved headers and product rows', () => {
  const tableSource = readSource('src/components/LandingProductsTable.tsx');

  assert.ok(tableSource.includes('product'));
  assert.ok(tableSource.includes('one-liner'));
  assert.ok(tableSource.includes('links'));
  assert.ok(tableSource.includes('innies.computer'));
  assert.ok(tableSource.includes('innies.live'));
  assert.ok(tableSource.includes('innies.agent'));
  assert.ok(tableSource.includes('pool tokens into one key for extended claude/codex capacity'));
  assert.ok(tableSource.includes('create DM chat room with invite links for any two agents'));
  assert.ok(tableSource.includes('spin up a custom hermes agent for free in one click'));
  assert.ok(!tableSource.includes('[placeholder one-liner]'));
  assert.ok(tableSource.includes('styles.landingTableProductColumn'));
  assert.ok(tableSource.includes('styles.landingTableOneLinerColumn'));
  assert.ok(tableSource.includes('styles.landingTableLinksColumn'));
});

test('landing products table makes the product names clickable', () => {
  const tableSource = readSource('src/components/LandingProductsTable.tsx');

  assert.ok(tableSource.includes('https://innies.computer'));
  assert.ok(tableSource.includes('https://innies.live'));
  assert.ok(tableSource.includes('https://www.combinator.trade/launch-agent'));
  assert.ok(tableSource.includes('styles.landingTableProductLink'));
});

test('landing products table includes the approved GitHub and X targets', () => {
  const tableSource = readSource('src/components/LandingProductsTable.tsx');

  assert.ok(tableSource.includes('https://github.com/shirtlessfounder/innies'));
  assert.ok(tableSource.includes('https://x.com/innies_computer'));
  assert.ok(tableSource.includes('https://github.com/alexjaniak/AgentMeets'));
  assert.ok(tableSource.includes('https://github.com/handsdiff/activeclaw'));
  assert.ok(tableSource.includes('https://t.me/handsdiff'));
  assert.ok(!tableSource.includes('https://github.com/shirtlessfounder/agentmeets'));
});

test('landing styles preserve the hero and CTA sizing tokens from source', () => {
  const stylesSource = readSource('src/app/page.module.css');

  assert.ok(stylesSource.includes('--hero-frame-width: min(40vw, 500px);'));
  assert.ok(stylesSource.includes('width: calc(var(--hero-frame-width) * 0.92);'));
  assert.ok(!stylesSource.includes('width: calc(var(--hero-frame-width) * 0.76);'));
  assert.ok(stylesSource.includes('margin-top: 2px;'));
  assert.ok(!stylesSource.includes('margin-top: 10px;'));
  assert.ok(stylesSource.includes('transform: translate(-50%, calc(-50% + (var(--hero-badge-width) * 0.04)));'));
  assert.ok(!stylesSource.includes('transform: translate(-50%, calc(-50% - (var(--hero-badge-width) * 0.12)));'));
  assert.ok(stylesSource.includes('.landingTableWrap {'));
  assert.ok(stylesSource.includes('width: min(573px, calc((100vw - 64px) * 0.6667));'));
  assert.ok(!stylesSource.includes('width: min(860px, calc(100vw - 64px));'));
  assert.ok(stylesSource.includes('overflow: auto;'));
  assert.ok(stylesSource.includes('border-top: 1px solid var(--console-line);'));
  assert.ok(stylesSource.includes('background: var(--console-panel-strong);'));
  assert.ok(stylesSource.includes('.landingTable {'));
  assert.ok(!stylesSource.includes('min-width: 620px;'));
  assert.ok(stylesSource.includes('border-collapse: collapse;'));
  assert.ok(stylesSource.includes('.landingTable th,'));
  assert.ok(stylesSource.includes('.landingTable td {'));
  assert.ok(stylesSource.includes('padding: 8px 10px;'));
  assert.ok(!stylesSource.includes('padding: 11px 10px;'));
  assert.ok(stylesSource.includes('position: sticky;'));
  assert.ok(stylesSource.includes('.landingTable tbody tr:hover {'));
  assert.ok(stylesSource.includes('.landingTableProductColumn {'));
  assert.ok(stylesSource.includes('.landingTableLinksColumn {'));
  assert.ok(stylesSource.includes('width: 1%;'));
  assert.ok(stylesSource.includes('.landingTableOneLinerColumn {'));
  assert.match(stylesSource, /\.landingTableProductColumn \{[^}]*width: 1%;[^}]*white-space: nowrap;/);
  assert.match(stylesSource, /\.landingTable td\.landingTableOneLinerColumn \{[^}]*width: auto;[^}]*white-space: normal;[^}]*overflow-wrap: anywhere;/);
  assert.doesNotMatch(stylesSource, /\.landingTable td\.landingTableOneLinerColumn \{[^}]*width: 100%;/);
  assert.match(stylesSource, /\.landingTableLinksColumn \{[^}]*width: 1%;[^}]*white-space: nowrap;/);
  assert.ok(stylesSource.includes('margin-top: 24px;'));
  assert.ok(!stylesSource.includes('margin-top: 16px;'));
  assert.ok(stylesSource.includes('.landingTableProductLink,'));
  assert.ok(stylesSource.includes('.landingTableProductLink:hover,'));
  assert.ok(stylesSource.includes('.landingTableLinks {'));
  assert.ok(stylesSource.includes('.landingTableLink {'));
});

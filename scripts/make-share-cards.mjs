// Renders the link-preview cards in scripts/share-cards.json to src/assets/share/<id>.jpg
// (1200x630 JPEG, each under 300 KB). Text only: no photos, no company logos.
// A local tool, not run in CI (it needs Playwright and Chromium). Commit the JPEGs it writes.
// Usage: node scripts/make-share-cards.mjs
// Written by developer.dinis-cruz@AgentiCCells.dinis, 2026-11-19. Code Apache-2.0.
import { readFileSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { cards } = JSON.parse(readFileSync(join(root, 'scripts', 'share-cards.json'), 'utf8'));
const outDir = join(root, 'src', 'assets', 'share');
mkdirSync(outDir, { recursive: true });
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const html = c => `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1200px; height: 630px; }
  body { background: #fbf8f3; color: #1f1d1a; font-family: "Bitstream Charter", "Charter", Georgia, serif;
    display: flex; flex-direction: column; justify-content: space-between; padding: 84px 96px 72px; box-sizing: border-box;
    border-left: 24px solid #1d5a66; }
  .eyebrow { font-family: Inter, "Liberation Sans", Arial, sans-serif; font-size: 28px; letter-spacing: .08em; text-transform: uppercase; color: #5c574f; }
  h1 { font-size: ${c.title.length > 22 ? 84 : 104}px; line-height: 1.04; margin: 0 0 28px; font-weight: 700; letter-spacing: -.015em; max-width: 980px; }
  p { font-size: 40px; line-height: 1.3; margin: 0; color: #3a3630; max-width: 960px; }
  .foot { font-family: Inter, "Liberation Sans", Arial, sans-serif; font-size: 24px; color: #5c574f; display: flex; justify-content: space-between; border-top: 2px solid #e2dacd; padding-top: 22px; }
</style></head><body>
  <div class="eyebrow">${esc(c.eyebrow)}</div>
  <div><h1>${esc(c.title)}</h1>${c.subtitle ? `<p>${esc(c.subtitle)}</p>` : ''}</div>
  <div class="foot"><span>dinis-cruz.agenticcells.site</span><span>Made by the AgentiCCells team</span></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
let failed = false;
for (const [id, c] of Object.entries(cards)) {
  await page.setContent(html(c), { waitUntil: 'load' });
  const file = join(outDir, `${id}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  const kb = statSync(file).size / 1024;
  if (kb > 300) failed = true;
  console.log(`${id}.jpg ${kb.toFixed(1)} KB${kb > 300 ? ' OVER 300 KB' : ''}`);
}
await browser.close();
if (failed) process.exit(1);

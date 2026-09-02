// Regenerates docs/diagrams/*.png from diagrams.html (hand-authored SVG).
// Run from the project root: node scripts/report-tools/render_diagrams.mjs
import puppeteer from 'puppeteer';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 2 });
  const filePath = 'file:///' + join(__dirname, 'diagrams.html').replace(/\\/g, '/');
  await page.goto(filePath, { waitUntil: 'networkidle0' });

  const useCaseEl = await page.$('#usecase');
  await useCaseEl.screenshot({ path: 'docs/diagrams/use_case_diagram.png' });

  const erdEl = await page.$('#erd');
  await erdEl.screenshot({ path: 'docs/diagrams/erd_diagram.png' });

  await browser.close();
  console.log('DONE');
})();

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const possiblePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.CHROME_PATH,
].filter(Boolean);

const executablePath = possiblePaths.find((p) => fs.existsSync(p));

if (!executablePath) {
  console.error('No Chrome or Edge browser executable found at standard paths');
  process.exit(1);
}

async function generate() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const svgPath = path.resolve(__dirname, '../public/icons/icon.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  // Generate 192x192
  await page.setViewport({ width: 192, height: 192 });
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;">${svgContent.replace('width="512"', 'width="192"').replace('height="512"', 'height="192"')}</body></html>`);
  const out192 = path.resolve(__dirname, '../public/icons/icon-192.png');
  await page.screenshot({ path: out192, omitBackground: true });
  console.log('Generated:', out192);

  // Generate 512x512
  await page.setViewport({ width: 512, height: 512 });
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;">${svgContent}</body></html>`);
  const out512 = path.resolve(__dirname, '../public/icons/icon-512.png');
  await page.screenshot({ path: out512, omitBackground: true });
  console.log('Generated:', out512);

  await browser.close();
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});

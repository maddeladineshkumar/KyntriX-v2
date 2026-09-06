const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve(__dirname, '../test_screenshots/debug_mobile');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  // iPhone 13/14 / modern Android viewport
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__ROBOT_STORE__ !== undefined, { timeout: 8000 });

  await page.screenshot({ path: path.join(outDir, '01_mobile_initial.png') });
  console.log('Saved 01_mobile_initial.png');

  // Find the change button or model selector button
  const changeBtn = await page.$('button[title*="change robot model"]');
  console.log('Change button found:', !!changeBtn);
  if (changeBtn) {
    const box = await changeBtn.boundingBox();
    console.log('Change button bounding box:', box);
    await changeBtn.click();
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(outDir, '02_catalog_opened_mobile.png') });
    console.log('Saved 02_catalog_opened_mobile.png');

    // Check visibility of robot cards
    const cards = await page.$$('button[aria-label*="Select robot"]');
    console.log('Number of robot cards found:', cards.length);
    if (cards.length > 0) {
      const firstCardBox = await cards[0].boundingBox();
      console.log('First card bounding box:', firstCardBox);
    }
  }

  // Also test with desktop viewport emulating mobile desktop site mode (e.g. 980x844 with touch)
  const pageDesktopMode = await browser.newPage();
  await pageDesktopMode.setViewport({ width: 980, height: 844, isMobile: true, hasTouch: true });
  await pageDesktopMode.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
  await pageDesktopMode.screenshot({ path: path.join(outDir, '03_desktop_site_mode.png') });

  const changeBtnDesktop = await pageDesktopMode.$('button[title*="change robot model"]');
  if (changeBtnDesktop) {
    await changeBtnDesktop.click();
    await new Promise((r) => setTimeout(r, 600));
    await pageDesktopMode.screenshot({ path: path.join(outDir, '04_desktop_site_catalog.png') });
  }

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

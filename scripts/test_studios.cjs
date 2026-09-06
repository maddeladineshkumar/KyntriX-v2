const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve(__dirname, '../test_screenshots/studios_landscape');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function run() {
  const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ROBOT_STORE__ !== undefined);

  const studios = [
    { id: 'dh', name: 'dh simulation' },
    { id: 'transform', name: 'matrices' },
    { id: 'workspace', name: 'workspace' },
    { id: 'custom', name: 'custom' },
  ];

  for (const s of studios) {
    const opened = await page.evaluate((name) => {
      const btns = Array.from(document.querySelectorAll('button'));
      const found = btns.find(b => b.textContent && b.textContent.toLowerCase().includes(name));
      if (found) { found.click(); return true; }
      return false;
    }, s.name);

    if (opened) {
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, `${s.id}_landscape.png`) });

      // Check modal bounding box and header/body
      const modalInfo = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) return null;
        const rect = modal.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height, windowH: window.innerHeight };
      });
      console.log(`Studio ${s.id} modal info:`, modalInfo);

      // Close modal
      await page.evaluate(() => {
        const closeBtn = document.querySelector('button[aria-label="Close studio pop-up"]');
        if (closeBtn) { closeBtn.click(); return true; }
        return false;
      });
      await new Promise(r => setTimeout(r, 300));
    }
  }

  await browser.close();
  console.log('Saved studio screenshots to', outDir);
}
run().catch(console.error);

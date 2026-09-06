const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve(__dirname, '../test_screenshots/landscape_debug');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const viewports = [
    { name: 'Landscape_iPhone_844x390', width: 844, height: 390 },
    { name: 'Landscape_Android_800x360', width: 800, height: 360 },
    { name: 'Desktop_Site_Landscape_980x450', width: 980, height: 450 },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ROBOT_STORE__ !== undefined);

    await page.screenshot({ path: path.join(outDir, `${vp.name}_01_main.png`) });

    // Click visible change button
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const changeBtn = btns.find(b => {
        const title = (b.getAttribute('title') || '').toLowerCase();
        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
        const isVisible = b.offsetWidth > 0 && b.offsetHeight > 0;
        return isVisible && (title.includes('change robot model') || aria.includes('change model') || aria.includes('select robot model'));
      });
      if (changeBtn) {
        changeBtn.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      await new Promise((r) => setTimeout(r, 500));
      await page.screenshot({ path: path.join(outDir, `${vp.name}_02_catalog.png`) });

      // Check card 1 visibility and footer visibility
      const visibility = await page.evaluate(() => {
        const cards = document.querySelectorAll('button.catalog-card, button[aria-label*="Select robot"]');
        const firstCard = cards[0] ? cards[0].getBoundingClientRect() : null;
        const footer = document.querySelector('.catalog-footer');
        const footerRect = footer ? footer.getBoundingClientRect() : null;
        return {
          windowHeight: window.innerHeight,
          firstCard: firstCard ? { top: firstCard.top, bottom: firstCard.bottom, height: firstCard.height } : null,
          footer: footerRect ? { top: footerRect.top, bottom: footerRect.bottom } : null,
          firstCardAboveFooter: firstCard && footerRect ? firstCard.bottom <= footerRect.top : false,
        };
      });
      console.log(`Visibility in ${vp.name}:`, visibility);
    }
    await page.close();
  }

  await browser.close();
  console.log('Saved landscape screenshots to', outDir);
}

run().catch(console.error);

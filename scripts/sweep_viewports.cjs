const puppeteer = require('puppeteer-core');
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const viewports = [
  // Phones portrait
  { w: 320, h: 568 },
  { w: 360, h: 640 },
  { w: 360, h: 740 },
  { w: 360, h: 800 },
  { w: 375, h: 667 },
  { w: 375, h: 812 },
  { w: 390, h: 844 },
  { w: 412, h: 915 },
  { w: 414, h: 896 },
  { w: 430, h: 932 },
  // Phones landscape
  { w: 568, h: 320 },
  { w: 667, h: 375 },
  { w: 800, h: 360 },
  { w: 844, h: 390 },
  { w: 896, h: 414 },
  { w: 915, h: 412 },
  { w: 932, h: 430 },
  // Desktop site on phones
  { w: 980, h: 450 },
  { w: 980, h: 500 },
  { w: 980, h: 550 },
  { w: 980, h: 600 },
  { w: 980, h: 700 },
  { w: 980, h: 844 },
  // Tablets
  { w: 768, h: 1024 },
  { w: 1024, h: 768 },
  { w: 820, h: 1180 },
  { w: 1180, h: 820 },
  // Small laptops
  { w: 1280, h: 800 },
  { w: 1366, h: 768 },
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 }
];

async function sweep() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  let failures = [];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.w <= 980, hasTouch: vp.w <= 980 });
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });

    const check = await page.evaluate(() => {
      const overlay = document.querySelector('.ee-pos-overlay');
      const dock = document.querySelector('.backdrop-blur-2xl.shadow-xl');
      const toolbar = document.querySelector('.absolute.top-4.left-4');

      if (!dock) return { error: 'dock not found' };
      const dRect = dock.getBoundingClientRect();
      const dockVisible = dRect.bottom <= window.innerHeight + 5 && dRect.top >= 0;

      let eeCollidesDock = false;
      let eeCollidesToolbar = false;
      let eeHidden = true;

      if (overlay) {
        const style = window.getComputedStyle(overlay);
        eeHidden = style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
        if (!eeHidden) {
          const oRect = overlay.getBoundingClientRect();
          eeCollidesDock = !(oRect.right <= dRect.left || oRect.left >= dRect.right || oRect.bottom <= dRect.top || oRect.top >= dRect.bottom);
          if (toolbar) {
            const tRect = toolbar.getBoundingClientRect();
            eeCollidesToolbar = !(oRect.right <= tRect.left || oRect.left >= tRect.right || oRect.bottom <= tRect.top || oRect.top >= tRect.bottom);
          }
        }
      }

      return {
        dockVisible,
        eeHidden,
        eeCollidesDock,
        eeCollidesToolbar,
      };
    });

    if (!check.dockVisible || check.eeCollidesDock || check.eeCollidesToolbar) {
      failures.push({ vp, check });
    }
  }

  console.log('Failures count:', failures.length);
  if (failures.length > 0) {
    console.log('Failures:', JSON.stringify(failures, null, 2));
  } else {
    console.log('ALL', viewports.length, 'VIEWPORTS PASSED CLEANLY WITH ZERO COLLISIONS');
  }

  await browser.close();
}

sweep().catch(console.error);

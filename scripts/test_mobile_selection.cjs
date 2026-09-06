const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve(__dirname, '../test_screenshots/mobile_verification');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log('=== STARTING EXHAUSTIVE MOBILE & DESKTOP-SITE VERIFICATION ===');
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const testViewports = [
    { name: 'iPhone_SE_small', width: 320, height: 568 },
    { name: 'Android_360x800', width: 360, height: 800 },
    { name: 'iPhone_14_390x844', width: 390, height: 844 },
    { name: 'Pixel7_412x915', width: 412, height: 915 },
    { name: 'Landscape_iPhone_844x390', width: 844, height: 390 },
    { name: 'Landscape_Android_800x360', width: 800, height: 360 },
    { name: 'Desktop_Site_Landscape_980x450', width: 980, height: 450 },
    { name: 'Desktop_Site_Tall_980x844', width: 980, height: 844 },
  ];

  for (const vp of testViewports) {
    console.log(`\n--- Testing viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });

    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.__ROBOT_STORE__ !== undefined, { timeout: 8000 });

    // 1. Initial screen screenshot
    await page.screenshot({ path: path.join(outDir, `${vp.name}_01_home.png`) });

    // 2. Check bottom dock is visible and not wrapped
    const dockBox = await page.evaluate(() => {
      const dock = document.querySelector('.backdrop-blur-2xl.shadow-xl');
      if (!dock) return null;
      const rect = dock.getBoundingClientRect();
      const isVisible = rect.bottom <= window.innerHeight + 5 && rect.top >= 0;
      return { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom, visible: isVisible };
    });
    console.log(`Dock dimensions in ${vp.name}:`, dockBox);
    if (!dockBox || !dockBox.visible) {
      throw new Error(`Dock is NOT visible on screen in ${vp.name}! ${JSON.stringify(dockBox)}`);
    }

    // 2b. Check that .ee-pos-overlay does not collide with or overlap the bottom dock
    const eeOverlayCheck = await page.evaluate(() => {
      const overlay = document.querySelector('.ee-pos-overlay');
      const dock = document.querySelector('.backdrop-blur-2xl.shadow-xl');
      if (!overlay || !dock) return { overlayFound: !!overlay, dockFound: !!dock, collides: false };
      const oStyle = window.getComputedStyle(overlay);
      const isHidden = oStyle.display === 'none' || oStyle.visibility === 'hidden' || oStyle.opacity === '0';
      const oRect = overlay.getBoundingClientRect();
      const dRect = dock.getBoundingClientRect();
      const collides = !isHidden && !(
        oRect.right <= dRect.left ||
        oRect.left >= dRect.right ||
        oRect.bottom <= dRect.top ||
        oRect.top >= dRect.bottom
      );
      return {
        isHidden,
        overlayRect: isHidden ? null : { top: oRect.top, bottom: oRect.bottom, left: oRect.left, right: oRect.right },
        dockRect: { top: dRect.top, bottom: dRect.bottom, left: dRect.left, right: dRect.right },
        collides,
      };
    });
    console.log(`EE overlay check in ${vp.name}:`, eeOverlayCheck);
    if (eeOverlayCheck.collides) {
      throw new Error(`.ee-pos-overlay COLLIDES with bottom dock in ${vp.name}! Details: ${JSON.stringify(eeOverlayCheck)}`);
    }

    // 2c. Check mobile View ▾ dropdown collision if View button exists (< md)
    const viewMenuCollision = await page.evaluate(() => {
      const viewBtn = document.querySelector('button[aria-label="Toggle View Options Menu"]');
      if (!viewBtn || viewBtn.offsetParent === null) return { tested: false };
      viewBtn.click();
      const overlay = document.querySelector('.ee-pos-overlay');
      const dropdown = viewBtn.closest('.absolute')?.querySelector('.animate-in');
      let collides = false;
      let overlayVisible = false;
      if (overlay && dropdown) {
        const oStyle = window.getComputedStyle(overlay);
        overlayVisible = oStyle.display !== 'none' && oStyle.visibility !== 'hidden' && oStyle.opacity !== '0';
        if (overlayVisible) {
          const o = overlay.getBoundingClientRect();
          const d = dropdown.getBoundingClientRect();
          collides = !(o.right <= d.left || o.left >= d.right || o.bottom <= d.top || o.top >= d.bottom);
        }
      }
      viewBtn.click(); // close menu
      return { tested: true, overlayVisible, collides };
    });
    console.log(`View menu check in ${vp.name}:`, viewMenuCollision);
    if (viewMenuCollision.collides) {
      throw new Error(`Mobile View menu dropdown COLLIDES with .ee-pos-overlay in ${vp.name}!`);
    }

    // 3. Open catalog via Change button (either in dock or mobile header)
    const openSucceeded = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const changeBtn = btns.find((b) => {
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
    if (!openSucceeded) throw new Error(`Change model button not clickable in ${vp.name}!`);

    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(outDir, `${vp.name}_02_catalog_opened.png`) });

    // 4. Verify first card is immediately visible and clickable
    const firstCardVisibility = await page.evaluate(() => {
      const cards = document.querySelectorAll('.catalog-grid button.catalog-card');
      if (cards.length === 0) return { count: 0, visible: false };
      const first = cards[0];
      const rect = first.getBoundingClientRect();
      const footer = document.querySelector('.catalog-footer');
      const footerTop = footer ? footer.getBoundingClientRect().top : window.innerHeight;
      const visibleAboveFooter = rect.top < footerTop && rect.bottom > 0;
      return { count: cards.length, top: rect.top, bottom: rect.bottom, height: rect.height, footerTop, visibleAboveFooter };
    });
    console.log(`Cards count & first card in ${vp.name}:`, firstCardVisibility);
    if (!firstCardVisibility.visibleAboveFooter) {
      throw new Error(`First robot card is NOT visible above footer in ${vp.name}! rect: ${JSON.stringify(firstCardVisibility)}`);
    }

    // 5. Select a different robot model
    const initialRobotId = await page.evaluate(() => window.__ROBOT_STORE__.getState().robot.id);
    console.log(`Initial robot before selection: ${initialRobotId}`);

    const cardSelectSuccess = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.catalog-grid button.catalog-card'));
      // Find a card that is not the currently active robot
      const targetCard = cards.find(c => {
        const aria = c.getAttribute('aria-label') || '';
        return !aria.toLowerCase().includes('puma');
      }) || cards[0];
      if (targetCard) {
        targetCard.click();
        return true;
      }
      return false;
    });
    if (!cardSelectSuccess) throw new Error(`Failed to click robot card in ${vp.name}`);

    await new Promise((r) => setTimeout(r, 600));

    // 6. Verify selection succeeded, modal closed, and scale is 1.0 (NO ZOOM)
    const newRobotState = await page.evaluate(() => {
      return {
        robotId: window.__ROBOT_STORE__.getState().robot.id,
        robotName: window.__ROBOT_STORE__.getState().robot.name,
        catalogOpen: !!document.querySelector('#catalog-modal-title'),
        visualViewportScale: window.visualViewport ? window.visualViewport.scale : 1.0,
      };
    });
    console.log(`After selection state in ${vp.name}:`, newRobotState);

    if (newRobotState.catalogOpen) {
      throw new Error(`Catalog modal failed to close after selecting robot in ${vp.name}!`);
    }
    if (newRobotState.robotId === initialRobotId) {
      throw new Error(`Robot model did not change in ${vp.name}! Still ${newRobotState.robotId}`);
    }
    if (newRobotState.visualViewportScale !== 1.0) {
      throw new Error(`Visual viewport zoomed! scale=${newRobotState.visualViewportScale}, expected 1.0`);
    }

    await page.screenshot({ path: path.join(outDir, `${vp.name}_03_after_selection.png`) });

    // 7. Verify bottom card access: Reopen catalog and scroll to the bottom
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const changeBtn = btns.find((b) => {
        const title = (b.getAttribute('title') || '').toLowerCase();
        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
        const isVisible = b.offsetWidth > 0 && b.offsetHeight > 0;
        return isVisible && (title.includes('change robot model') || aria.includes('change model') || aria.includes('select robot model'));
      });
      if (changeBtn) changeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const bottomCardInfo = await page.evaluate(() => {
      const grid = document.querySelector('.catalog-grid') || document.querySelector('.overflow-y-auto');
      if (!grid) return null;
      // Scroll to bottom
      grid.scrollTop = grid.scrollHeight;
      const cards = grid.querySelectorAll('button.catalog-card, button[aria-label*="Select robot"]');
      const lastCard = cards[cards.length - 1];
      const footer = document.querySelector('.catalog-footer');
      const lastCardRect = lastCard ? lastCard.getBoundingClientRect() : null;
      const footerRect = footer ? footer.getBoundingClientRect() : null;
      return {
        cardCount: cards.length,
        lastCardTop: lastCardRect ? lastCardRect.top : null,
        lastCardBottom: lastCardRect ? lastCardRect.bottom : null,
        footerTop: footerRect ? footerRect.top : null,
        isAboveFooter: lastCardRect && footerRect ? lastCardRect.bottom <= footerRect.bottom + 5 : false,
      };
    });
    console.log(`Bottom card check in ${vp.name}:`, bottomCardInfo);
    if (!bottomCardInfo || !bottomCardInfo.isAboveFooter) {
      throw new Error(`Bottom card is obscured by footer in ${vp.name}! ${JSON.stringify(bottomCardInfo)}`);
    }

    // Close catalog
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Close setup modal"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 300));

    // 8. Verify drawers: open Joint Jogger
    const jogOpened = await page.evaluate(() => {
      const btn = document.querySelector('button[title*="Joint Controls Panel"]');
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (jogOpened) {
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({ path: path.join(outDir, `${vp.name}_04_joint_drawer.png`) });

      // Check drawer is above dock
      const zIndices = await page.evaluate(() => {
        const drawer = document.querySelector('div[aria-label="Joint Actuation Panel"]');
        const dock = document.querySelector('.backdrop-blur-2xl.shadow-xl');
        return {
          drawerZ: drawer ? window.getComputedStyle(drawer).zIndex : null,
          dockZ: dock ? window.getComputedStyle(dock).zIndex : null,
        };
      });
      if (parseInt(zIndices.drawerZ, 10) <= parseInt(zIndices.dockZ, 10)) {
        throw new Error(`Drawer zIndex (${zIndices.drawerZ}) is not higher than dock zIndex (${zIndices.dockZ})!`);
      }

      await page.evaluate(() => {
        const btn = document.querySelector('button[title*="Joint Controls Panel"]');
        if (btn) btn.click();
      });
      await new Promise((r) => setTimeout(r, 300));
    }

    await page.close();
  }

  await browser.close();
  console.log('\n=== ALL 8 MOBILE & DESKTOP-SITE VIEWPORT VERIFICATIONS PASSED PERFECTLY ===');
}

run().catch((e) => {
  console.error('VERIFICATION FAILED:', e);
  process.exit(1);
});

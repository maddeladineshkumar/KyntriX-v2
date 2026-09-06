const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve(__dirname, '../test_screenshots/mobile_features');
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
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__ROBOT_STORE__ !== undefined, { timeout: 8000 });

  // 1. Initial screen
  await page.screenshot({ path: path.join(outDir, '01_initial.png') });

  // 2. Catalog modal
  await page.evaluate(() => window.__ROBOT_STORE__.getState().setActiveTab('catalog'));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, '02_catalog.png') });
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  // 3. Joint Jogger Drawer
  const jogBtn = await page.$('button[title*="Joint Controls Panel"]');
  if (jogBtn) await jogBtn.click();
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, '03_joint_jogger.png') });
  if (jogBtn) await jogBtn.click();
  await new Promise((r) => setTimeout(r, 300));

  // 4. IK Drawer
  await page.evaluate(() => window.__ROBOT_STORE__.getState().setActiveTab('ik'));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, '04_ik_drawer.png') });
  await page.evaluate(() => window.__ROBOT_STORE__.getState().setActiveTab('fk'));
  await new Promise((r) => setTimeout(r, 300));

  // 5. DH Table Studio
  await page.evaluate(() => window.__ROBOT_STORE__.getState().setActiveTab('dh'));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, '05_dh_studio.png') });
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  // 6. Trajectory Studio
  await page.evaluate(() => window.__ROBOT_STORE__.getState().setActiveTab('trajectory'));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, '06_trajectory_studio.png') });
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  // 7. Custom Robot Creator
  await page.evaluate(() => window.__ROBOT_STORE__.getState().setActiveTab('custom'));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, '07_custom_arm.png') });
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  // 8. Analysis Studio
  await page.evaluate(() => window.__ROBOT_STORE__.getState().setActiveTab('analysis'));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, '08_analysis.png') });
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  // 9. Workspace Studio
  await page.evaluate(() => window.__ROBOT_STORE__.getState().setActiveTab('workspace'));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, '09_workspace.png') });
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  // 10. Transformation Studio
  await page.evaluate(() => window.__ROBOT_STORE__.getState().setActiveTab('transform'));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, '10_transform.png') });
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  await browser.close();
  console.log('Finished capturing all mobile features');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

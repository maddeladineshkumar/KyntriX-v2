const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotDir = path.resolve(__dirname, '../test_screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function runAudit() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`Console error: ${msg.text()}`);
      console.error('[BROWSER ERROR]', msg.text());
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`Page error: ${err.message}`);
    console.error('[BROWSER PAGE ERROR]', err.message);
  });

  console.log('1. Navigating to app...');
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__ROBOT_STORE__ !== undefined, { timeout: 8000 });
  await page.screenshot({ path: path.join(screenshotDir, '01_initial_home.png') });

  // 1b. Close onboarding wizard by clicking "Start Live Simulation"
  const startSimBtn = await page.$('button ::-p-text(Start Live Simulation)');
  if (startSimBtn) {
    console.log('Clicking "Start Live Simulation" to close catalog...');
    await startSimBtn.click();
    await new Promise((r) => setTimeout(r, 400));
  }
  await page.screenshot({ path: path.join(screenshotDir, '01b_canvas_ready.png') });

  // Helper to get store
  const getStore = () => page.evaluate(() => {
    const s = window.__ROBOT_STORE__.getState();
    return {
      robotName: s.robot.name,
      dof: s.robot.dof,
      q: [...s.q],
      isPlaying: s.playback.isPlaying,
      currentTime: s.playback.currentTime,
      targetPose: Array.from(s.targetPose.elements),
      ikSolving: s.ikSolving,
      ikResult: s.ikResult ? {
        converged: s.ikResult.converged,
        solutionsCount: s.ikResult.solutions.length,
        timeMs: s.ikResult.computationTimeMs,
      } : null,
      activeTab: s.activeTab,
      showTargetGizmo: s.viewOptions.showTargetGizmo,
    };
  });

  console.log('Initial Store:', await getStore());

  // 2. Open IK Target Solver Drawer
  console.log('2. Opening IK Target Solver Drawer...');
  const ikBtn = await page.waitForSelector('button ::-p-text(IK Target Solver)', { timeout: 4000 });
  if (ikBtn) {
    await ikBtn.click();
  }

  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotDir, '02_ik_drawer_opened.png') });

  let storeAfterOpen = await getStore();
  console.log('Store after opening IK:', {
    activeTab: storeAfterOpen.activeTab,
    showTargetGizmo: storeAfterOpen.showTargetGizmo,
  });

  // 3. Test Cartesian Inputs and Update
  console.log('3. Testing Cartesian inputs...');
  const inputs = await page.$$('input[type="number"]');
  console.log(`Found ${inputs.length} number inputs`);

  // Type new target coordinates: X=0.450, Y=0.200, Z=0.400
  if (inputs.length >= 3) {
    for (let i = 0; i < 3; i++) {
      await inputs[i].click();
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
    }
    await inputs[0].type('0.450');
    await inputs[1].type('0.200');
    await inputs[2].type('0.400');
  }

  await page.screenshot({ path: path.join(screenshotDir, '03_inputs_typed.png') });

  // 4. Click SOLVE & ANIMATE TARGET button
  console.log('4. Clicking SOLVE & ANIMATE TARGET button...');
  const solveBtn = await page.waitForSelector('button ::-p-text(SOLVE & ANIMATE TARGET)', { timeout: 4000 });
  if (!solveBtn) {
    throw new Error('Solve & Animate button not found!');
  }

  const initialQ = (await getStore()).q;
  console.log('Initial q before solve:', initialQ);

  await solveBtn.click();

  // Watch playback during solve and animation
  let animationObserved = false;
  let maxTimeObserved = 0;
  let middleQ = null;

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 50));
    const s = await getStore();
    if (s.isPlaying) {
      animationObserved = true;
      maxTimeObserved = Math.max(maxTimeObserved, s.currentTime);
      if (!middleQ && s.currentTime > 0.1) {
        middleQ = [...s.q];
      }
    }
    if (animationObserved && !s.isPlaying) {
      console.log(`Animation finished after step ${i}! Max time: ${maxTimeObserved}s`);
      break;
    }
  }

  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(screenshotDir, '04_after_animation.png') });

  const finalQ = (await getStore()).q;
  console.log('Animation observed:', animationObserved);
  console.log('Middle q during animation:', middleQ);
  console.log('Final q after animation:', finalQ);

  const qChanged = finalQ.some((val, idx) => Math.abs(val - initialQ[idx]) > 0.01);
  console.log('Joints changed significantly from initial:', qChanged);

  // 5. Test Nudge buttons
  console.log('5. Testing nudge buttons (+Z, -X)...');
  const plusZBtn = await page.waitForSelector('button ::-p-text(+Z)', { timeout: 3000 });
  await plusZBtn.click();
  await new Promise((r) => setTimeout(r, 600));

  const qAfterNudge = (await getStore()).q;
  console.log('q after +Z nudge:', qAfterNudge);

  // 6. Test Orientation Presets
  console.log('6. Testing Orientation Preset "Forward"...');
  const fwdBtn = await page.waitForSelector('button ::-p-text(Forward)', { timeout: 3000 });
  await fwdBtn.click();
  await new Promise((r) => setTimeout(r, 1200));

  const qAfterFwd = (await getStore()).q;
  console.log('q after Forward preset:', qAfterFwd);

  // 7. Test Discovered Solutions Cards (Compare, Preview in 3D, Restore, Snap)
  console.log('7. Testing Discovered Solutions & Compare...');
  const compareBtn = await page.$('button[aria-label="Toggle compare mode between solutions"]');
  if (compareBtn) {
    await compareBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: path.join(screenshotDir, '05_compare_mode.png') });
    // Exit compare
    await compareBtn.click();
    await new Promise((r) => setTimeout(r, 200));
  }

  // Test Preview in 3D button
  console.log('Testing Preview in 3D and Restore Original Pose...');
  const previewBtn = await page.$('button[title="Temporarily preview robot pose in 3D without trajectory"]');
  if (previewBtn) {
    await previewBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: path.join(screenshotDir, '06_preview_3d.png') });

    const restoreBtn = await page.waitForSelector('button[aria-label="Restore pose before preview"]', { timeout: 3000 });
    await restoreBtn.click();
    await new Promise((r) => setTimeout(r, 300));
  }

  // 8. Test DH Table Studio IK Tab
  console.log('8. Testing Denavit-Hartenberg Table Studio IK tab...');
  // Open DH Table Studio modal
  const dhBtn = await page.waitForSelector('button ::-p-text(DH Simulation Studio)', { timeout: 4000 });
  await dhBtn.click();

  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(screenshotDir, '07_dh_table_studio.png') });

  // Click IK sub-tab inside DH Table Studio
  console.log('Clicking Inverse Kinematics subtab in DH Table Studio...');
  const ikSubTab = await page.waitForSelector('button ::-p-text(Inverse Kinematics)', { timeout: 4000 });
  await ikSubTab.click();
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotDir, '08_dh_ik_tab.png') });

  // Test Quick Reach Preset (+100mm Z)
  console.log('Clicking Quick Reach Preset (+100mm Z) in DH Table Studio...');
  const dhPresetZ = await page.waitForSelector('#dh-ik-preset-offset-z', { timeout: 4000 });
  await dhPresetZ.click();
  await new Promise((r) => setTimeout(r, 300));

  // Check solve button in DH IK tab
  console.log('Testing Solve & Animate button in DH Table Studio IK tab...');
  const dhSolveBtn = await page.waitForSelector('#dh-ik-solve-btn', { timeout: 4000 });
  const dhInitialQ = (await getStore()).q;
  console.log('DH initial q before solve:', dhInitialQ);

  await dhSolveBtn.click();

  let dhAnimationObserved = false;
  let dhFramesSampled = [];

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 50));
    const s = await getStore();
    if (s.isPlaying) {
      dhAnimationObserved = true;
      dhFramesSampled.push({ currentTime: s.currentTime, q: [...s.q] });
    }
    if (dhAnimationObserved && !s.isPlaying) {
      console.log(`DH animation completed smoothly after ${i} frames! Total samples: ${dhFramesSampled.length}`);
      break;
    }
  }

  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(screenshotDir, '09_after_dh_animation.png') });
  const dhFinalQ = (await getStore()).q;
  console.log('DH Animation observed:', dhAnimationObserved);
  console.log('DH Samples count:', dhFramesSampled.length);
  console.log('DH Final q:', dhFinalQ);

  // 9. Test Nudge in DH Table Studio
  console.log('9. Testing Nudge +X in DH Table Studio...');
  const dhNudgeX = await page.waitForSelector('#dh-ik-nudge-pos-x', { timeout: 3000 });
  await dhNudgeX.click();
  await new Promise((r) => setTimeout(r, 300));
  console.log('Clicking Solve & Animate after +X nudge...');
  await dhSolveBtn.click();

  let dhNudgeAnimObserved = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 50));
    const s = await getStore();
    if (s.isPlaying) {
      dhNudgeAnimObserved = true;
      break;
    }
  }
  console.log('DH animation observed after Nudge +X:', dhNudgeAnimObserved);

  console.log('\n--- AUDIT SUMMARY ---');
  console.log(`Browser Errors Count: ${errors.length}`);
  if (errors.length > 0) {
    console.error('Errors:', errors);
  }
  console.log(`IK Animation in Main Drawer: ${animationObserved ? 'PASSED' : 'FAILED'}`);
  console.log(`IK Animation in DH Studio: ${dhAnimationObserved ? 'PASSED' : 'FAILED'}`);

  await browser.close();
}

runAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});

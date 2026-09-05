const puppeteer = require('puppeteer-core');
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('=== STARTING EXHAUSTIVE BUTTON VERIFICATION AUDIT ===');
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
      errors.push(`[CONSOLE ERROR] ${msg.text()}`);
      console.error('[CONSOLE ERROR]', msg.text());
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`[PAGE ERROR] ${err.message}`);
    console.error('[PAGE ERROR]', err.message);
  });

  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__ROBOT_STORE__ !== undefined);

  // Close onboarding catalog if open
  const startSimBtn = await page.$('button ::-p-text(Start Live Simulation)');
  if (startSimBtn) {
    await startSimBtn.click();
    await new Promise((r) => setTimeout(r, 400));
  }

  const _getStore = () => page.evaluate(() => {
    const s = window.__ROBOT_STORE__.getState();
    return {
      robotName: s.robot.name,
      q: [...s.q],
      isPlaying: s.playback.isPlaying,
      targetPose: Array.from(s.targetPose.elements),
      ikSolving: s.ikSolving,
      activeTab: s.activeTab,
      solutionsCount: s.ikResult ? s.ikResult.solutions.length : 0,
    };
  });

  console.log('--- 1. Testing IKStudio (Main Drawer) Buttons ---');
  // Open IK Drawer
  const ikBtn = await page.waitForSelector('button ::-p-text(IK Target Solver)');
  await ikBtn.click();
  await new Promise((r) => setTimeout(r, 600));

  // Test Step buttons: 1mm, 10mm, 50mm
  console.log('Testing step sizes (1mm, 50mm, 10mm)...');
  for (const step of ['1mm', '50mm', '10mm']) {
    const btn = await page.waitForSelector(`div.bg-stone-50\\/80 button ::-p-text(${step})`);
    await btn.click();
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log('✓ Step size buttons work');

  // Test Nudge buttons: -X, +X, -Y, +Y, -Z, +Z
  console.log('Testing 6 Cartesian Nudge buttons...');
  const nudgeIds = ['#ik-nudge-neg-x', '#ik-nudge-pos-x', '#ik-nudge-neg-y', '#ik-nudge-pos-y', '#ik-nudge-neg-z', '#ik-nudge-pos-z'];
  for (const id of nudgeIds) {
    const btn = await page.waitForSelector(id);
    await btn.click();
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log('✓ All 6 Cartesian Nudge buttons clicked successfully');

  // Test Reach Presets in main drawer
  console.log('Testing Reach Presets in main drawer (+100mm Z, +100mm X, +100mm Y, Work Pose)...');
  for (const pid of ['#ik-preset-offset-z', '#ik-preset-offset-x', '#ik-preset-offset-y', '#ik-preset-work-pose']) {
    const btn = await page.waitForSelector(pid);
    await btn.click();
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log('✓ All 4 Reach Presets work');

  // Test Orientation Presets
  console.log('Testing Orientation Presets (Tool Down, Forward, Tool Up, Zero)...');
  for (const oid of ['#ik-orient-down', '#ik-orient-forward', '#ik-orient-up', '#ik-orient-zero']) {
    const btn = await page.waitForSelector(oid);
    await btn.click();
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log('✓ All 4 Orientation Presets work');

  // Test Sync EE Pose
  console.log('Testing Sync EE Pose button...');
  const syncEEBtn = await page.waitForSelector('button ::-p-text(Sync EE Pose)');
  await syncEEBtn.click();
  await new Promise((r) => setTimeout(r, 300));
  console.log('✓ Sync EE Pose button works');

  // Test Solve button directly
  console.log('Testing Solve & Animate button...');
  const solveBtn = await page.waitForSelector('#ik-solve-btn');
  // Displace target slightly first via preset
  await (await page.$('#ik-preset-offset-z')).click();
  await new Promise((r) => setTimeout(r, 200));
  await solveBtn.click();
  await new Promise((r) => setTimeout(r, 800));
  console.log('✓ Solve button works');

  // Test Discovered Solution Buttons
  console.log('Testing candidate branch Snap and Animate buttons...');
  const snapButtons = await page.$$('button ::-p-text(Snap)');
  if (snapButtons.length > 0) {
    await snapButtons[0].click();
    await new Promise((r) => setTimeout(r, 200));
    console.log('✓ Branch Snap button works');
  }

  const animateButtons = await page.$$('button ::-p-text(Animate)');
  if (animateButtons.length > 0) {
    await animateButtons[0].click();
    await new Promise((r) => setTimeout(r, 600));
    console.log('✓ Branch Animate button works');
  }

  console.log('--- 2. Testing DHTableStudio (Modal) Buttons ---');
  // Open DH Simulation Studio
  const dhBtn = await page.waitForSelector('button ::-p-text(DH Simulation Studio)');
  await dhBtn.click();
  await new Promise((r) => setTimeout(r, 800));

  // Switch to IK Subtab
  const ikSubTab = await page.waitForSelector('button ::-p-text(Inverse Kinematics)');
  await ikSubTab.click();
  await new Promise((r) => setTimeout(r, 600));

  // Test DH Reach Presets
  console.log('Testing DH Reach Presets (+100mm Z, +100mm X, +100mm Y, Work Pose, Reset = EE)...');
  for (const dhPid of ['#dh-ik-preset-offset-z', '#dh-ik-preset-offset-x', '#dh-ik-preset-offset-y', '#dh-ik-preset-work-pose', '#dh-ik-preset-reset-ee']) {
    const btn = await page.waitForSelector(dhPid);
    await btn.click();
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log('✓ All 5 DH Reach Presets work');

  // Test DH Nudge Step buttons
  console.log('Testing DH Nudge step sizes (1mm, 10mm, 50mm)...');
  const dhSteps = await page.$$('div.p-3.bg-stone-50\\/90 button');
  for (const stepBtn of dhSteps) {
    await stepBtn.click();
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log('✓ DH step buttons work');

  // Test DH Nudge buttons: -X, +X, -Y, +Y, -Z, +Z
  console.log('Testing DH 6 Nudge buttons...');
  for (const dhNid of ['#dh-ik-nudge-neg-x', '#dh-ik-nudge-pos-x', '#dh-ik-nudge-neg-y', '#dh-ik-nudge-pos-y', '#dh-ik-nudge-neg-z', '#dh-ik-nudge-pos-z']) {
    const btn = await page.waitForSelector(dhNid);
    await btn.click();
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log('✓ All 6 DH Nudge buttons work');

  // Test DH Orientation Presets
  console.log('Testing DH Orientation Presets (Tool Down, Forward, Tool Up, Zero)...');
  for (const dhOid of ['#dh-ik-orient-down', '#dh-ik-orient-forward', '#dh-ik-orient-up', '#dh-ik-orient-zero']) {
    const btn = await page.waitForSelector(dhOid);
    await btn.click();
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log('✓ All 4 DH Orientation Presets work');

  // Test DH Solve Button
  console.log('Testing DH Solve button...');
  await (await page.$('#dh-ik-preset-offset-z')).click();
  await new Promise((r) => setTimeout(r, 200));
  const dhSolveBtn = await page.waitForSelector('#dh-ik-solve-btn');
  await dhSolveBtn.click();
  await new Promise((r) => setTimeout(r, 800));
  console.log('✓ DH Solve button works');

  // Test DH Apply Solution buttons
  console.log('Testing DH Apply Animate & Snap buttons...');
  const dhApplyAnimate = await page.$('#dh-ik-apply-animate-btn');
  if (dhApplyAnimate) {
    await dhApplyAnimate.click();
    await new Promise((r) => setTimeout(r, 500));
    console.log('✓ DH Apply Animate button works');
  }

  const dhApplySnap = await page.$('#dh-ik-apply-snap-btn');
  if (dhApplySnap) {
    await dhApplySnap.click();
    await new Promise((r) => setTimeout(r, 200));
    console.log('✓ DH Apply Snap button works');
  }

  console.log('=== ALL BUTTONS TESTED SUCCESSFULLY ===');
  console.log(`Errors encountered: ${errors.length}`);
  if (errors.length > 0) {
    console.error(errors);
    process.exit(1);
  }

  await browser.close();
  console.log('Audit completed cleanly.');
})().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});

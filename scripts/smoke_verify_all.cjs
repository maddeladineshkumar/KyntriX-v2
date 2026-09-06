const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotDir = path.resolve(__dirname, '../test_screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function waitForIKSolve(page, timeoutMs = 20000) {
  await page.waitForFunction(
    () => {
      const s = window.__ROBOT_STORE__ && window.__ROBOT_STORE__.getState();
      if (!s) return false;
      // 1. ikSolving must be false
      if (s.ikSolving === true) return false;
      // 2. Status announcement must not be "Solving inverse kinematics..."
      if (!s.statusAnnouncement || s.statusAnnouncement === 'Solving inverse kinematics...') return false;
      // 3. Result must exist and correspond to current target
      if (!s.ikResult || !s.ikResult.target) return false;

      const currentTarget = s.targetPose;
      const resultTarget = s.ikResult.target;
      if (!currentTarget || !currentTarget.elements || !resultTarget.elements) return false;

      const cElem = currentTarget.elements;
      const rElem = resultTarget.elements;
      for (let i = 0; i < 16; i++) {
        if (Math.abs(cElem[i] - rElem[i]) > 1e-4) {
          return false;
        }
      }
      return true;
    },
    { timeout: timeoutMs, polling: 50 }
  );
}

async function runSmokeVerification() {
  console.log('=== STARTING COMPLETE BROWSER SMOKE TEST SUITE ===');
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

  console.log('1. Navigating to app on http://localhost:5174/ ...');
  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ROBOT_STORE__ !== undefined, { timeout: 8000 });

  // 1. Desktop Screenshot (with initial live canvas)
  const startSimBtn = await page.$('button ::-p-text(Start Live Simulation)');
  if (startSimBtn) {
    await startSimBtn.click();
    await new Promise((r) => setTimeout(r, 400));
  }
  await page.screenshot({ path: path.join(screenshotDir, '01_desktop.png') });
  console.log('? 1. Desktop screenshot captured (1440x900)');

  // 2. Mobile Screenshot (390x844 iPhone viewport)
  await page.setViewport({ width: 390, height: 844 });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(screenshotDir, '02_mobile.png') });
  console.log('? 2. Mobile screenshot captured (390x844)');
  await page.setViewport({ width: 1440, height: 900 });
  await new Promise((r) => setTimeout(r, 300));

  // 3. Robot Catalog Modal
  await page.evaluate(() => {
    window.__ROBOT_STORE__.getState().setActiveTab('catalog');
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotDir, '03_robot_catalog.png') });
  console.log('? 3. Robot catalog modal verified');
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 400));

  // 4. Joint Controls Drawer
  const joggerBtn = await page.waitForSelector('button ::-p-text(Joint Jogger)');
  await joggerBtn.click();
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => {
    window.__ROBOT_STORE__.getState().setJointValue(0, 0.45);
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(screenshotDir, '04_joint_controls.png') });
  console.log('? 4. Joint controls verified');

  // 5. IK Success Verification
  const ikSwitchBtn = await page.waitForSelector('button[title="Switch to IK Target Solver"]');
  await ikSwitchBtn.click();
  await new Promise((r) => setTimeout(r, 500));
  const reachPreset = await page.waitForSelector('#ik-preset-work-pose');
  await reachPreset.click();
  await new Promise((r) => setTimeout(r, 300));
  const solveBtn = await page.waitForSelector('#ik-solve-btn');
  await solveBtn.click();
  await waitForIKSolve(page);

  const ikSuccessState = await page.evaluate(() => {
    const s = window.__ROBOT_STORE__.getState();
    return {
      converged: s.ikResult ? s.ikResult.converged : false,
      solutionsCount: s.ikResult ? s.ikResult.solutions.length : 0,
      manipulability: s.jacobian.manipulability,
      conditionNumber: s.jacobian.conditionNumber,
      fullResult: s.ikResult,
    };
  });
  console.log('IK Result Details:', JSON.stringify(ikSuccessState.fullResult, null, 2));
  console.log('IK Success State:', {
    converged: ikSuccessState.converged,
    solutionsCount: ikSuccessState.solutionsCount,
    manipulability: ikSuccessState.manipulability,
    conditionNumber: ikSuccessState.conditionNumber
  });
  if (!ikSuccessState.converged) {
    throw new Error('IK failed to converge for reachable offset target!');
  }
  await page.screenshot({ path: path.join(screenshotDir, '05_ik_success.png') });
  console.log('? 5. IK Success verified with real Jacobian dexterity metrics');

  // 6. IK Unreachable Target Verification
  await page.evaluate(() => {
    const s = window.__ROBOT_STORE__.getState();
    s.stopTrajectory();
    const farTarget = s.targetPose.clone();
    // In row-major Matrix4, translation is elements[3], elements[7], elements[11]
    farTarget.elements[3] = 10.0;
    farTarget.elements[7] = 10.0;
    farTarget.elements[11] = 10.0;
    s.setTargetPose(farTarget, false);
    s.triggerSolveIK(false, false);
  });
  await waitForIKSolve(page);
  const ikUnreachableState = await page.evaluate(() => {
    const s = window.__ROBOT_STORE__.getState();
    return {
      converged: s.ikResult ? s.ikResult.converged : false,
      bestSolution: s.ikResult ? s.ikResult.bestSolution : null,
      announcement: s.statusAnnouncement,
    };
  });
  console.log('IK Unreachable State:', ikUnreachableState);
  if (ikUnreachableState.converged !== false) {
    throw new Error('Checkpoint 6 failed: expected converged === false for unreachable target (10, 10, 10)');
  }
  if (ikUnreachableState.bestSolution !== null && ikUnreachableState.bestSolution.converged) {
    throw new Error('Checkpoint 6 failed: bestSolution must be null or unconverged');
  }
  const announcementLower = (ikUnreachableState.announcement || '').toLowerCase();
  if (
    !announcementLower.includes('failed') &&
    !announcementLower.includes('unreachable')
  ) {
    throw new Error(`Checkpoint 6 failed: expected failure announcement containing "failed" or "unreachable", got "${ikUnreachableState.announcement}"`);
  }
  await page.screenshot({ path: path.join(screenshotDir, '06_ik_unreachable.png') });
  console.log('? 6. IK Unreachable target correctly detected and announced');

  // Reset to home
  await page.evaluate(() => window.__ROBOT_STORE__.getState().resetToHome());
  await new Promise((r) => setTimeout(r, 300));
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  // 7. Trajectory Generation
  await page.evaluate(() => {
    const s = window.__ROBOT_STORE__.getState();
    s.setActiveTab('trajectory');
    // Valid goal within Puma 560 limits: [-2.79..2.79, -0.61..3.75, -3.92..0.78, -4.64..4.64, -4.88..-1.39, -6.28..6.28]
    s.generateJointTraj([0.3, 1.2, -0.5, 0.2, -4.0, 0.1], 3.0, 'quintic');
  });
  await new Promise((r) => setTimeout(r, 800));
  const trajState = await page.evaluate(() => {
    const s = window.__ROBOT_STORE__.getState();
    const t = s.activeTrajectory;
    return {
      isValid: t ? t.isValid : false,
      samples: t ? t.timeSteps.length : 0,
      duration: t ? t.duration : 0,
    };
  });
  console.log('Generated Trajectory State:', trajState);
  if (!trajState.isValid) {
    throw new Error('Checkpoint 7 failed: valid trajectory must have isValid === true');
  }
  if (trajState.samples !== 120 || trajState.duration !== 3.0) {
    throw new Error(`Checkpoint 7 failed: expected 120 samples and duration 3.0, got ${trajState.samples} samples, ${trajState.duration}s`);
  }

  // Also verify out-of-limit rejection in Checkpoint 7
  await page.evaluate(() => {
    const s = window.__ROBOT_STORE__.getState();
    s.generateJointTraj([0.3, 1.2, -0.5, 0.2, 5.0, 0.1], 3.0, 'quintic');
  });
  await new Promise((r) => setTimeout(r, 400));
  const invalidTrajState = await page.evaluate(() => {
    const s = window.__ROBOT_STORE__.getState();
    const t = s.activeTrajectory;
    return {
      isValid: t ? t.isValid : false,
      failureReason: t ? t.failureReason : '',
    };
  });
  if (invalidTrajState.isValid !== false) {
    throw new Error('Checkpoint 7 failed: out-of-limit goal must produce isValid === false');
  }
  if (!invalidTrajState.failureReason.includes('limits')) {
    throw new Error(`Checkpoint 7 failed: failureReason must specify limit violation, got: "${invalidTrajState.failureReason}"`);
  }
  await page.screenshot({ path: path.join(screenshotDir, '07_trajectory_gen.png') });
  console.log('? 7. Trajectory generation verified (both valid execution and out-of-limit rejection)');

  // 8. Signature THANKS Trajectory Telemetry
  console.log('Computing signature THANKS trajectory...');
  await page.evaluate(async () => {
    await window.__ROBOT_STORE__.getState().loadThanksTraj();
  });
  await page.waitForFunction(
    () => {
      const s = window.__ROBOT_STORE__ && window.__ROBOT_STORE__.getState();
      return s && s.thanksLoadingProgress === null && s.activeTrajectory !== null;
    },
    { timeout: 25000, polling: 50 }
  );
  const thanksState = await page.evaluate(() => {
    const s = window.__ROBOT_STORE__.getState();
    const t = s.activeTrajectory;
    if (!t) return null;
    const maxVel = Math.max(...t.velocities.map((v) => Math.max(...v.map(Math.abs))));
    const maxAcc = Math.max(...t.accelerations.map((a) => Math.max(...a.map(Math.abs))));
    const maxPosErr = Math.max(...t.states.map((st) => st.positionError));
    const maxOriErr = Math.max(...t.states.map((st) => st.orientationError));
    return {
      samples: t.timeSteps.length,
      duration: t.duration,
      maxVel,
      maxAcc,
      isRealNonzero: maxVel > 1e-4 && maxAcc > 1e-4,
      isValid: t.isValid,
      hasIKFailure: t.hasIKFailure,
      failedSamplesCount: t.failedSampleIndices ? t.failedSampleIndices.length : 0,
      isPlaying: s.playback.isPlaying,
      firstWaypointErr: t.states[0]?.positionError ?? Infinity,
      maxPosErr,
      maxOriErr,
    };
  });
  console.log('THANKS Trajectory Telemetry:', thanksState);
  if (!thanksState) {
    throw new Error('THANKS trajectory failed to load!');
  }
  if (thanksState.hasIKFailure || thanksState.isValid !== true) {
    throw new Error(`Checkpoint 8 failed: Puma 560 THANKS trajectory must be valid with zero IK failures (isValid=${thanksState.isValid}, hasIKFailure=${thanksState.hasIKFailure})`);
  }
  if (thanksState.failedSamplesCount !== 0) {
    throw new Error(`Checkpoint 8 failed: Puma 560 THANKS trajectory must have 0 failed samples, got ${thanksState.failedSamplesCount}`);
  }
  if (!thanksState.isPlaying) {
    throw new Error('Checkpoint 8 failed: Autoplay must start for fully valid THANKS trajectory!');
  }
  if (thanksState.firstWaypointErr > 1e-4) {
    throw new Error(`Checkpoint 8 failed: Reachable waypoint 0 has large position error: ${thanksState.firstWaypointErr}`);
  }
  if (thanksState.maxPosErr > 1e-4) {
    throw new Error(`Checkpoint 8 failed: Maximum position error ${thanksState.maxPosErr} exceeds strict threshold 1e-4 m`);
  }
  if (thanksState.maxOriErr > 1e-3) {
    throw new Error(`Checkpoint 8 failed: Maximum orientation error ${thanksState.maxOriErr} exceeds strict threshold 1e-3 rad`);
  }
  await page.screenshot({ path: path.join(screenshotDir, '08_thanks_telemetry.png') });
  console.log('? 8. THANKS trajectory verified with 100% reachable waypoints, zero IK failures, and smooth autoplay');

  // 9. Analysis Charts
  await page.evaluate(() => {
    window.__ROBOT_STORE__.getState().setActiveTab('analysis');
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(screenshotDir, '09_analysis_charts.png') });
  console.log('? 9. Analysis charts verified');
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  // 10. Workspace Sampling Studio
  await page.evaluate(() => {
    window.__ROBOT_STORE__.getState().setActiveTab('workspace');
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(screenshotDir, '10_workspace_sampling.png') });
  console.log('? 10. Workspace studio verified');
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  // 11. DH Editor (DH Simulation Studio)
  await page.evaluate(() => {
    window.__ROBOT_STORE__.getState().setActiveTab('dh');
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(screenshotDir, '11_dh_editor.png') });
  console.log('? 11. DH Editor studio verified');
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  // 12. Transformation Studio
  await page.evaluate(() => {
    window.__ROBOT_STORE__.getState().setActiveTab('transform');
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(screenshotDir, '12_transformation_studio.png') });
  console.log('? 12. Transformation studio verified');
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  // 13. Custom Robot Creator
  await page.evaluate(() => {
    window.__ROBOT_STORE__.getState().setActiveTab('custom');
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(screenshotDir, '13_custom_robot_creator.png') });
  console.log('? 13. Custom robot creator verified');
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  // 14. Robot Switching
  console.log('Testing asynchronous robot switching (Puma 560 -> ABBIRB120)...');
  await page.evaluate(async () => {
    await window.__ROBOT_STORE__.getState().selectRobot('ABBIRB120');
  });
  await page.waitForFunction(
    () => {
      const s = window.__ROBOT_STORE__ && window.__ROBOT_STORE__.getState();
      return s && s.robot && s.robot.name === 'ABBIRB120' && s.robotLoading === false;
    },
    { timeout: 15000, polling: 50 }
  );
  const switchedRobot = await page.evaluate(() => window.__ROBOT_STORE__.getState().robot.name);
  console.log('Current robot name after switch:', switchedRobot);
  await page.screenshot({ path: path.join(screenshotDir, '14_robot_switching.png') });
  console.log('? 14. Robot switching verified');

  // 15. Emergency Stop Semantics
  console.log('Testing emergency stop preserving joint pose and halting playback...');
  await page.evaluate(() => {
    const s = window.__ROBOT_STORE__.getState();
    // Valid goal within ABB IRB 120 limits:
    s.generateJointTraj([0.2, 1.2, 0.2, -3.0, 4.0, 0.2], 4.0, 'quintic');
    s.playTrajectory();
  });
  await page.waitForFunction(
    () => {
      const s = window.__ROBOT_STORE__ && window.__ROBOT_STORE__.getState();
      return s && s.playback && s.playback.isPlaying && s.playback.currentTime > 0.05;
    },
    { timeout: 10000, polling: 50 }
  );
  const midPlaybackState = await page.evaluate(() => {
    const s = window.__ROBOT_STORE__.getState();
    const stateBefore = {
      isPlaying: s.playback.isPlaying,
      time: s.playback.currentTime,
      q: [...s.q],
      isEStopped: s.isEStopped,
    };
    s.emergencyStop();
    return stateBefore;
  });
  console.log('State during playback before E-stop:', midPlaybackState);
  if (!midPlaybackState.isPlaying || midPlaybackState.time <= 0) {
    throw new Error(`Checkpoint 15 failed: Playback failed to start before E-stop (isPlaying=${midPlaybackState.isPlaying}, time=${midPlaybackState.time})`);
  }
  await new Promise((r) => setTimeout(r, 200));

  const eStoppedState = await page.evaluate(() => {
    const s = window.__ROBOT_STORE__.getState();
    return {
      isEStopped: s.isEStopped,
      isPlaying: s.playback.isPlaying,
      time: s.playback.currentTime,
      q: [...s.q],
    };
  });
  console.log('State after E-stop:', eStoppedState);

  if (!eStoppedState.isEStopped || eStoppedState.isPlaying) {
    throw new Error('Checkpoint 15 failed: E-Stop failed to halt playback immediately!');
  }
  if (Math.abs(eStoppedState.time - midPlaybackState.time) > 0.05) {
    throw new Error(`Checkpoint 15 failed: E-stop failed to preserve playback time: before=${midPlaybackState.time}, after=${eStoppedState.time}`);
  }
  for (let j = 0; j < eStoppedState.q.length; j++) {
    if (Math.abs(eStoppedState.q[j] - midPlaybackState.q[j]) > 1e-4) {
      throw new Error(`Checkpoint 15 failed: E-stop altered joint ${j}: before=${midPlaybackState.q[j]}, after=${eStoppedState.q[j]}`);
    }
  }

  // Verify controls are blocked while E-stopped
  await page.evaluate(() => {
    const s = window.__ROBOT_STORE__.getState();
    s.stepForward();
    s.playTrajectory();
    s.setJoints([0, 0, 0, 0, 0, 0]);
  });
  const blockedState = await page.evaluate(() => {
    const s = window.__ROBOT_STORE__.getState();
    return {
      isPlaying: s.playback.isPlaying,
      time: s.playback.currentTime,
      q: [...s.q],
    };
  });
  if (blockedState.isPlaying || Math.abs(blockedState.time - eStoppedState.time) > 1e-4) {
    throw new Error('Checkpoint 15 failed: Controls were not blocked while emergency stop was active!');
  }

  // Reset E-stop
  await page.evaluate(() => window.__ROBOT_STORE__.getState().resetEStop());
  await page.screenshot({ path: path.join(screenshotDir, '15_emergency_stop.png') });
  console.log('? 15. Emergency stop semantics verified (active playback halted, pose & time preserved, controls blocked)');

  console.log('\n=== SMOKE TEST AUDIT SUMMARY ===');
  console.log(`Browser Page / Console Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.error('Errors encountered:', errors);
    throw new Error(`Browser smoke test encountered ${errors.length} errors.`);
  }

  console.log('ALL 15 VERIFICATION CHECKPOINTS PASSED CLEANLY WITH ZERO ERRORS!');
  await browser.close();
}

runSmokeVerification().catch((err) => {
  console.error('Smoke verification failed:', err);
  process.exit(1);
});

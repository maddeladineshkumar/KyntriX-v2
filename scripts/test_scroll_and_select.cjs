const puppeteer = require('puppeteer-core');

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testScrollAndSelect() {
  console.log('Starting testScrollAndSelect...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__ROBOT_STORE__ !== undefined, { timeout: 8000 });

  const initialRobot = await page.evaluate(() => window.__ROBOT_STORE__.getState().robot.name);
  console.log('Initial robot model:', initialRobot);

  // 1. Open catalog
  const changeBtn = await page.waitForSelector('button[title*="change robot model"], button[aria-label*="change robot model"]', { timeout: 5000 });
  await changeBtn.click();
  await page.waitForSelector('.catalog-grid', { visible: true, timeout: 5000 });
  console.log('Catalog opened successfully with .catalog-grid present');

  // 2. Detect all robot cards
  const cardsCount = await page.evaluate(() => {
    const cards = document.querySelectorAll('.catalog-card');
    return cards.length;
  });
  console.log('Total robot cards detected:', cardsCount);
  if (cardsCount === 0) {
    throw new Error('Verification failed: No robot cards (.catalog-card) detected in catalog grid');
  }

  // 3. Verify the first card is visible
  const firstCardInfo = await page.evaluate(() => {
    const first = document.querySelector('.catalog-card');
    if (!first) return null;
    const rect = first.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight && rect.height > 0;
    return { isVisible, rect: { top: rect.top, bottom: rect.bottom, height: rect.height } };
  });
  console.log('First card info:', firstCardInfo);
  if (!firstCardInfo || !firstCardInfo.isVisible) {
    throw new Error(`Verification failed: First robot card is not visible in viewport! info: ${JSON.stringify(firstCardInfo)}`);
  }

  // 4. Scroll to final card
  const scrollResult = await page.evaluate(() => {
    const scrollContainer = document.querySelector('.catalog-grid');
    if (!scrollContainer) return null;
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    return {
      scrollTop: scrollContainer.scrollTop,
      scrollHeight: scrollContainer.scrollHeight,
      clientHeight: scrollContainer.clientHeight,
    };
  });
  console.log('Scroll result:', scrollResult);
  await new Promise((r) => setTimeout(r, 400));

  // 5. Verify the final card is not hidden behind the footer
  const lastCardInfo = await page.evaluate(() => {
    const cards = document.querySelectorAll('.catalog-card');
    if (cards.length === 0) return null;
    const last = cards[cards.length - 1];
    const rect = last.getBoundingClientRect();
    const footer = document.querySelector('.catalog-footer');
    const footerRect = footer ? footer.getBoundingClientRect() : null;

    // Check if the last card's bottom is within visible area above the footer
    const isAboveFooter = footerRect ? rect.bottom <= footerRect.top + 2 : true;
    return {
      totalCards: cards.length,
      lastCardLabel: last.getAttribute('aria-label'),
      rect: { top: rect.top, bottom: rect.bottom },
      footerTop: footerRect ? footerRect.top : null,
      isAboveFooter,
    };
  });
  console.log('Last card info:', lastCardInfo);

  if (!lastCardInfo || !lastCardInfo.isAboveFooter) {
    throw new Error(`Verification failed: Last card is obscured by footer! info: ${JSON.stringify(lastCardInfo)}`);
  }

  // 6. Select a different robot
  const cards = await page.$$('.catalog-card');
  const lastCard = cards[cards.length - 1];
  await lastCard.click();
  await new Promise((r) => setTimeout(r, 800));

  // 7. Verify modal closes after selection
  const isModalClosed = await page.evaluate(() => {
    return document.querySelector('.catalog-grid') === null;
  });
  if (!isModalClosed) {
    throw new Error('Verification failed: Catalog modal did not close after selecting a robot');
  }
  console.log('Modal closed successfully after robot selection');

  // 8. Verify different robot selected and state updated
  const finalRobot = await page.evaluate(() => window.__ROBOT_STORE__.getState().robot.name);
  console.log('Selected robot successfully:', finalRobot);
  if (finalRobot === initialRobot) {
    throw new Error(`Verification failed: Expected different robot to be selected, but still ${initialRobot}`);
  }

  await browser.close();
  console.log('Scroll and select test passed cleanly with all assertions verified!');
}

testScrollAndSelect().catch((e) => {
  console.error(e);
  process.exit(1);
});

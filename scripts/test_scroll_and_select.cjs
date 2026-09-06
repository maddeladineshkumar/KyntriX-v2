const puppeteer = require('puppeteer-core');

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testScrollAndSelect() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__ROBOT_STORE__ !== undefined, { timeout: 8000 });

  // Open catalog
  const changeBtn = await page.$('button[title*="change robot model"]');
  await changeBtn.click();
  await new Promise((r) => setTimeout(r, 400));

  // Scroll to bottom of the cards container
  const scrollResult = await page.evaluate(() => {
    const scrollContainer = document.querySelector('.flex-1.overflow-y-auto.p-3');
    if (!scrollContainer) return null;
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    return {
      scrollTop: scrollContainer.scrollTop,
      scrollHeight: scrollContainer.scrollHeight,
      clientHeight: scrollContainer.clientHeight,
    };
  });
  console.log('Scroll result:', scrollResult);
  await new Promise((r) => setTimeout(r, 300));

  // Find the last card and click Select & Load
  const lastCardInfo = await page.evaluate(() => {
    const cards = document.querySelectorAll('button[aria-label*="Select robot"]');
    if (cards.length === 0) return null;
    const last = cards[cards.length - 1];
    const rect = last.getBoundingClientRect();
    const footer = document.querySelector('.bg-white\\/95.border-t');
    const footerRect = footer ? footer.getBoundingClientRect() : null;

    // Check if the last card's button is above the footer
    const isAboveFooter = footerRect ? rect.bottom <= footerRect.top : true;
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
    throw new Error(`Last card is obscured by footer! info: ${JSON.stringify(lastCardInfo)}`);
  }

  // Click the last card
  const cards = await page.$$('button[aria-label*="Select robot"]');
  const lastCard = cards[cards.length - 1];
  await lastCard.click();
  await new Promise((r) => setTimeout(r, 600));

  const finalRobot = await page.evaluate(() => window.__ROBOT_STORE__.getState().robot.name);
  console.log('Selected last robot successfully:', finalRobot);

  await browser.close();
  console.log('Scroll and select test passed!');
}

testScrollAndSelect().catch((e) => {
  console.error(e);
  process.exit(1);
});

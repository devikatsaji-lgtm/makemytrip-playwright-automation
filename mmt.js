const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  // 1. Open website
  await page.goto('https://www.makemytrip.com/');

  // Close login popup (important step)
  await page.waitForTimeout(3000);
  await page.locator('[data-cy="closeModal"]').click();

  // 2. Navigate to Hotels
  await page.click("//span[text()='Hotels']");

  // 3. Select city (Kerala)
  await page.click('#city');
  await page.fill('input[placeholder="Enter city/ Hotel/ Area/ Building"]', 'Kerala');
  await page.waitForTimeout(2000);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  // 4. Select Check-in and Check-out
  await page.click('#checkin');

  await page.click("//div[@aria-label='Tue Mar 25 2026']");
  await page.click("//div[@aria-label='Sun Mar 30 2026']");

  // 5. Open room & guest section
  await page.click('#guest');

  await page.waitForSelector('.roomGuests');

  // 6. Select 1 Room (Assertion)
  const roomCount = await page.locator('.rmsCounter').first().textContent();
  console.log("Room Count:", roomCount);

  if (!roomCount.includes('1')) {
    throw new Error("Room count is not 1");
  }

  // 7. Select 2 Adults (Assertion)
  await page.click("(//button[contains(@class,'increment')])[1]");
  await page.waitForTimeout(1000);

  const adultCount = await page.locator('.adults .rmsCounter').textContent();
  console.log("Adult Count:", adultCount);

  if (!adultCount.includes('2')) {
    throw new Error("Adult count is not 2");
  }

  // 8. Add 1 Child and select age 3
  await page.click("(//button[contains(@class,'increment')])[2]");
  await page.waitForTimeout(2000);

  await page.selectOption('select', '3');

  // 9. Add 2nd child and select age 5
  await page.click("(//button[contains(@class,'increment')])[2]");
  await page.waitForTimeout(2000);

  const childAgeDropdowns = page.locator('select');
  await childAgeDropdowns.nth(1).selectOption('5');

  // 10. Click Apply
  await page.click("//button[text()='APPLY']");
  await page.waitForTimeout(2000);

  // 11. Click Search
  await page.click("//button[text()='Search']");
  await page.waitForLoadState('load');

  // 12. Wait for results
  await page.waitForSelector('.listingRow');

  // 13. Apply filters (High rating + Low price)
  // Sort by price (low to high)
  await page.click("//span[contains(text(),'Price - Low to High')]");
  await page.waitForTimeout(3000);

  // 14. Extract hotel details
  const hotels = await page.$$('.listingRow');

  for (let i = 0; i < Math.min(hotels.length, 5); i++) {
    const hotel = hotels[i];

    const name = await hotel.$eval('.latoBlack', el => el.innerText).catch(() => 'N/A');
    const city = "Kerala";
    const rating = await hotel.$eval('.rating', el => el.innerText).catch(() => 'N/A');
    const price = await hotel.$eval('.price', el => el.innerText).catch(() => 'N/A');
    const totalPrice = await hotel.$eval('.totalPrice', el => el.innerText).catch(() => 'N/A');
    const url = await hotel.$eval('a', el => el.href).catch(() => 'N/A');

    console.log("------ HOTEL DETAILS ------");
    console.log("Name:", name);
    console.log("City:", city);
    console.log("Rating:", rating);
    console.log("Price per night:", price);
    console.log("Total price:", totalPrice);
    console.log("URL:", url);
  }

  await browser.close();
})();
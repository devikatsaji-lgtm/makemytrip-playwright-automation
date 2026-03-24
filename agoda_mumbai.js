// ============================================================
//  Agoda.com – Mumbai Hotel Finder
//  2 Adults + 2 Children (age 3 & 5) + 1 Room
//  Filter: Guest Rating 9+ → Sort Lowest Price
//  Prints FIRST hotel from filtered results
//
//  HOW TO RUN:
//       npm init -y
//       npm install playwright
//       npx playwright install chromium
//       node agoda_mumbai.js
// ============================================================

const { chromium } = require("playwright");
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Safe wait — never crashes on timeout
async function safeWait(page, ms = 3000) {
  try {
    await Promise.race([
      page.waitForLoadState("networkidle", { timeout: ms }),
      pause(ms)
    ]);
  } catch (_) { await pause(ms); }
}

// Click a button by its exact aria-label
async function clickByAriaLabel(page, label) {
  try {
    await page.click(`button[aria-label="${label}"]`);
    return true;
  } catch (_) { return false; }
}

// Read the number shown between – and + buttons in occupancy panel
async function readCount(page, ariaLabelMinus) {
  try {
    const val = await page.evaluate((lbl) => {
      const minusBtn = document.querySelector(`button[aria-label="${lbl}"]`);
      if (!minusBtn) return null;
      // The count is usually in a sibling span/div between minus and plus
      const parent = minusBtn.parentElement;
      if (!parent) return null;
      const spans = parent.querySelectorAll("span, div, p");
      for (const s of spans) {
        const n = parseInt(s.innerText.trim(), 10);
        if (!isNaN(n)) return n;
      }
      return null;
    }, ariaLabelMinus);
    return val !== null ? val : 0;
  } catch (_) { return 0; }
}

// Wait for Agoda's custom age dropdown (li items) to appear after adding a child
async function waitForChildAgeDropdown(page, previousChildCount, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // Agoda renders age pickers as a row of clickable items or a custom dropdown
    // Check for any new element containing age options (0,1,2...17)
    const found = await page.evaluate((prevCount) => {
      // Look for elements that represent child age inputs
      // They usually appear as a container with text like "Age" or "Child age"
      const ageContainers = [
        ...document.querySelectorAll('[data-selenium*="age" i]'),
        ...document.querySelectorAll('[class*="ChildAge" i]'),
        ...document.querySelectorAll('[class*="child-age" i]'),
        ...document.querySelectorAll('[placeholder*="age" i]'),
        ...document.querySelectorAll('select'),
      ];
      return ageContainers.length > 0;
    }, previousChildCount);
    if (found) return true;
    await pause(400);
  }
  return false;
}

// Set child age using whatever UI Agoda renders (select, custom dropdown, or input)
async function setChildAge(page, childIndex, age) {
  await pause(600);

  // 1. Try standard <select>
  const selects = await page.$$("select");
  let ageSelectIndex = 0;
  for (const s of selects) {
    const opts = await s.$$("option");
    const vals = await Promise.all(opts.map(o => o.getAttribute("value")));
    if (vals.length >= 4 && vals.length <= 20) {
      if (ageSelectIndex === childIndex) {
        await s.selectOption(String(age));
        console.log(`  ✓ Child ${childIndex + 1} age = ${age} (select)`);
        return;
      }
      ageSelectIndex++;
    }
  }

  // 2. Try Agoda custom dropdown — find by data-selenium or class containing "age"
  const agodaAgeSet = await page.evaluate((idx, ageVal) => {
    // Find all age-related containers
    const allEls = [
      ...document.querySelectorAll('[data-selenium*="age" i]'),
      ...document.querySelectorAll('[class*="ChildAge" i]'),
      ...document.querySelectorAll('[class*="child-age" i]'),
      ...document.querySelectorAll('[class*="age-selector" i]'),
    ];
    if (allEls[idx]) {
      // Try clicking to open dropdown then pick value
      allEls[idx].click();
      return true;
    }
    return false;
  }, childIndex, age);

  if (agodaAgeSet) {
    await pause(500);
    // Now try to click the option with the age value
    try {
      await page.locator(`[role="option"]:has-text("${age}")`).first().click({ timeout: 3000 });
      console.log(`  ✓ Child ${childIndex + 1} age = ${age} (custom dropdown)`);
      return;
    } catch (_) {}
    try {
      await page.locator(`li:has-text("${age}")`).first().click({ timeout: 3000 });
      console.log(`  ✓ Child ${childIndex + 1} age = ${age} (li)`);
      return;
    } catch (_) {}
  }

  // 3. Try input fields for age
  try {
    const inputs = await page.$$('input[type="number"], input[placeholder*="age" i]');
    if (inputs[childIndex]) {
      await inputs[childIndex].fill(String(age));
      console.log(`  ✓ Child ${childIndex + 1} age = ${age} (input)`);
      return;
    }
  } catch (_) {}

  console.log(`  ⚠ Could not set child ${childIndex + 1} age (Agoda may use non-standard UI)`);
}

// ════════════════════════════════════════════════════════════
async function main() {
  console.log("\n🚀 Agoda Mumbai – Best Hotel Search\n");

  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // ── STEP 1: Open Agoda ────────────────────────────────────────────────────
  console.log("[ 1/9 ] Opening Agoda.com...");
  await page.goto("https://www.agoda.com", { waitUntil: "domcontentloaded" });
  await pause(4000);

  // ── STEP 2: Close pop-ups ─────────────────────────────────────────────────
  console.log("[ 2/9 ] Closing pop-ups...");
  for (const sel of [
    'button[aria-label="Close"]',
    'button[data-element-name="close-button"]',
    '[class*="Modal"] button[class*="close"]',
    'button[class*="CloseButton"]',
  ]) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) { await el.click(); await pause(800); }
    } catch (_) {}
  }
  await page.keyboard.press("Escape");
  await pause(600);

  // ── STEP 3: Destination – Mumbai ─────────────────────────────────────────
  console.log("[ 3/9 ] Typing Mumbai...");
  try {
    for (const sel of [
      'input[data-selenium="textInput"]',
      "#textInput",
      'input[placeholder*="destination"]',
      'input[placeholder*="Where"]',
    ]) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        await page.click(sel);
        await page.fill(sel, "");
        await page.type(sel, "Mumbai", { delay: 100 });
        break;
      } catch (_) {}
    }
    await pause(2500);
    for (const sel of [
      '[data-selenium="autosuggest-item"]:first-child',
      'li[class*="Suggestion"]:first-child',
      '[role="option"]:first-child',
      '[role="listbox"] li:first-child',
    ]) {
      try {
        await page.waitForSelector(sel, { timeout: 4000 });
        await page.click(sel);
        break;
      } catch (_) {}
    }
    await pause(1500);
    console.log("  ✓ Mumbai selected");
  } catch (e) { console.log("  ⚠ Destination:", e.message); }

  // ── STEP 4: Dates Apr 1 → Apr 5 ──────────────────────────────────────────
  console.log("[ 4/9 ] Setting dates Apr 1 → Apr 5...");
  try {
    for (const sel of [
      '[data-selenium="checkInDate"]',
      '[data-element-name="check-in"]',
      'span[class*="check-in"]',
    ]) {
      try { await page.click(sel, { timeout: 3000 }); break; } catch (_) {}
    }
    await pause(2000);

    let dateSet = false;
    for (const year of ["2026", "2025"]) {
      const cin  = `${year}-04-01`;
      const cout = `${year}-04-05`;

      for (let i = 0; i < 24; i++) {
        const found =
          await page.$(`[data-date="${cin}"]`) ||
          await page.$(`[data-selenium-date="${cin}"]`) ||
          await page.$(`td[data-date="${cin}"]`);
        if (found) { dateSet = true; break; }

        for (const sel of [
          'button[aria-label="Next month"]',
          '[data-selenium="calendar-next"]',
          '[class*="DayPicker-NavButton--next"]',
          'button[class*="forward"]',
        ]) {
          try { const b = await page.$(sel); if (b && await b.isVisible()) { await b.click(); break; } } catch (_) {}
        }
        await pause(700);
      }

      if (dateSet) {
        // Click check-in — use exact data-date attribute
        const cinEl =
          await page.$(`[data-date="${cin}"]`) ||
          await page.$(`[data-selenium-date="${cin}"]`) ||
          await page.$(`td[data-date="${cin}"]`);
        if (cinEl) {
          await cinEl.click();
        } else {
          // Fallback: click by aria-label with full date string e.g. "Tuesday, April 1, 2026"
          await page.locator(`[aria-label*="April 1, ${year}"]`).first().click({ timeout: 3000 }).catch(() => {});
        }
        await pause(900);

        const coutEl =
          await page.$(`[data-date="${cout}"]`) ||
          await page.$(`[data-selenium-date="${cout}"]`) ||
          await page.$(`td[data-date="${cout}"]`);
        if (coutEl) {
          await coutEl.click();
        } else {
          await page.locator(`[aria-label*="April 5, ${year}"]`).first().click({ timeout: 3000 }).catch(() => {});
        }
        console.log(`  ✓ Apr 1 → Apr 5, ${year}`);
        await pause(1000);
        break;
      }
    }
    if (!dateSet) console.log("  ⚠ Could not set dates");
  } catch (e) { console.log("  ⚠ Date picker:", e.message); }

  // ── STEP 5: Guests ────────────────────────────────────────────────────────
  console.log("[ 5/9 ] Setting guests (2 Adults, 2 Children ages 3 & 5, 1 Room)...");
  try {
    // Open occupancy panel
    for (const sel of [
      '[data-selenium="occupancyBox"]',
      '[data-element-name="occupancy"]',
      'span[class*="Occupancy"]',
      '[class*="occupancy"]',
    ]) {
      try { await page.click(sel, { timeout: 3000 }); break; } catch (_) {}
    }
    await pause(2000);

    // ── Adults: read current value, then set to exactly 2 ──
    // From debug: minus="Subtract Adults", plus="Add Adults"
    const currentAdults = await readCount(page, "Subtract Adults");
    console.log(`  Adults currently: ${currentAdults}`);

    if (currentAdults < 2) {
      for (let i = currentAdults; i < 2; i++) {
        await clickByAriaLabel(page, "Add Adults");
        await pause(400);
      }
    } else if (currentAdults > 2) {
      for (let i = currentAdults; i > 2; i--) {
        await clickByAriaLabel(page, "Subtract Adults");
        await pause(400);
      }
    }
    console.log("  ✓ Adults = 2");

    // ── Child 1: click Add Children → wait for age UI → set age 3 ──────────
    console.log("  Adding Child 1 (age 3)...");
    await clickByAriaLabel(page, "Add Children");
    await pause(2000); // wait for Agoda's age UI to render

    // Agoda shows age as clickable buttons or a custom list — try all methods
    let age3Set = false;

    // Method A: standard <select>
    const selects1 = await page.$$("select");
    for (const s of selects1) {
      const opts = await s.$$("option");
      const vals = await Promise.all(opts.map(o => o.getAttribute("value")));
      if (vals.length >= 3 && vals.length <= 20) {
        try { await s.selectOption("3"); age3Set = true; break; } catch (_) {}
      }
    }

    // Method B: Agoda custom list — look for a visible "3" option near the child section
    if (!age3Set) {
      try {
        // Agoda renders ages as items in a dropdown list
        await page.locator('[data-selenium*="age" i]').first().click({ timeout: 2000 }).catch(() => {});
        await pause(500);
        await page.locator(`li:has-text("3 years"), li:has-text("3"), [role="option"]:has-text("3")`).first().click({ timeout: 3000 });
        age3Set = true;
      } catch (_) {}
    }

    // Method C: find any visible dropdown that opened and pick "3"
    if (!age3Set) {
      try {
        await page.locator(`[role="listbox"] [role="option"]:has-text("3")`).first().click({ timeout: 3000 });
        age3Set = true;
      } catch (_) {}
    }

    if (age3Set) console.log("  ✓ Child 1 age = 3");
    else console.log("  ⚠ Child 1 age not set");
    await pause(1000);

    // ── Child 2: click Add Children → wait for age UI → set age 5 ──────────
    console.log("  Adding Child 2 (age 5)...");
    await clickByAriaLabel(page, "Add Children");
    await pause(2000);

    let age5Set = false;

    // Method A: the LAST select that appeared
    const selects2 = await page.$$("select");
    // Walk from the end to find the newest age select
    for (let i = selects2.length - 1; i >= 0; i--) {
      const opts = await selects2[i].$$("option");
      const vals = await Promise.all(opts.map(o => o.getAttribute("value")));
      if (vals.length >= 3 && vals.length <= 20) {
        try { await selects2[i].selectOption("5"); age5Set = true; break; } catch (_) {}
      }
    }

    // Method B: click the second age container then pick 5
    if (!age5Set) {
      try {
        const ageContainers = await page.$$('[data-selenium*="age" i], [class*="ChildAge" i], [class*="child-age" i]');
        if (ageContainers.length >= 2) {
          await ageContainers[1].click();
          await pause(500);
          await page.locator(`li:has-text("5 years"), li:has-text("5"), [role="option"]:has-text("5")`).first().click({ timeout: 3000 });
          age5Set = true;
        }
      } catch (_) {}
    }

    // Method C: find any visible option "5" in an open listbox
    if (!age5Set) {
      try {
        await page.locator(`[role="listbox"] [role="option"]:has-text("5")`).first().click({ timeout: 3000 });
        age5Set = true;
      } catch (_) {}
    }

    if (age5Set) console.log("  ✓ Child 2 age = 5");
    else console.log("  ⚠ Child 2 age not set");
    await pause(800);

    console.log("  ✓ Room = 1 (default)");

    // Close occupancy panel
    let closed = false;
    for (const txt of ["Done", "Apply"]) {
      try {
        await page.locator(`button:has-text("${txt}")`).first().click({ timeout: 2000 });
        closed = true; break;
      } catch (_) {}
    }
    if (!closed) await page.keyboard.press("Escape");
    await pause(800);
    console.log("  ✓ Guest panel closed");
  } catch (e) { console.log("  ⚠ Guest panel:", e.message); }

  // ── STEP 6: Submit Search ─────────────────────────────────────────────────
  console.log("[ 6/9 ] Submitting search...");
  for (const sel of [
    'button[data-selenium="searchButton"]',
    '[data-element-name="search-button"]',
    'button[class*="SearchButton"]',
    'button[type="submit"]',
    'button:has-text("SEARCH")',
  ]) {
    try { const b = await page.$(sel); if (b && await b.isVisible()) { await b.click(); break; } } catch (_) {}
  }
  // Also try by text
  try { await page.locator('button:has-text("SEARCH")').first().click({ timeout: 3000 }); } catch (_) {}
  await safeWait(page, 10000);
  await pause(3000);
  console.log("  ✓ Results loaded");

  // ── STEP 7: Filter by Guest Rating 9+ ────────────────────────────────────
  console.log("[ 7/9 ] Applying Guest Rating 9+ filter...");
  try {
    // Scroll down so filters are visible
    await page.evaluate(() => window.scrollBy(0, 300));
    await pause(1000);

    let filtered = false;

    // Agoda's rating filter is usually inside a sidebar/filter panel
    // Try finding it by scanning ALL clickable elements on the page for "9" rating text
    const ratingClicked = await page.evaluate(() => {
      // Look inside filter containers
      const filterContainers = [
        ...document.querySelectorAll('[class*="filter" i]'),
        ...document.querySelectorAll('[class*="Filter"]'),
        ...document.querySelectorAll('[data-element-name*="filter" i]'),
        ...document.querySelectorAll('aside'),
        ...document.querySelectorAll('[class*="sidebar" i]'),
      ];

      for (const container of filterContainers) {
        const items = container.querySelectorAll('label, li, div[role="button"], span[role="button"], input + label, a');
        for (const item of items) {
          const txt = item.innerText || item.textContent || "";
          if (txt.includes("9") && (txt.includes("Exceptional") || txt.includes("9+") || txt.includes("9.0"))) {
            item.click();
            return `Clicked: "${txt.trim().substring(0, 50)}"`;
          }
        }
      }
      return null;
    });

    if (ratingClicked) {
      console.log(`  ✓ ${ratingClicked}`);
      filtered = true;
    }

    // Fallback: try Playwright text locators
    if (!filtered) {
      for (const txt of ["Exceptional", "9+", "9.0+", "9 - Exceptional"]) {
        try {
          await page.locator(`text=${txt}`).first().click({ timeout: 3000 });
          filtered = true;
          console.log(`  ✓ Rating filter: "${txt}"`);
          break;
        } catch (_) {}
      }
    }

    if (!filtered) console.log("  ⚠ Rating filter not found — results shown without rating filter");
    await safeWait(page, 4000);
  } catch (e) { console.log("  ⚠ Rating filter:", e.message); }

  // ── STEP 8: Sort by Lowest Price ─────────────────────────────────────────
  console.log("[ 8/9 ] Sorting by lowest price...");
  try {
    let sorted = false;

    // Try select dropdown
    for (const sel of [
      'select[data-selenium="sortBy"]',
      '[class*="SortBy" i] select',
      'select[id*="sort" i]',
      'select[name*="sort" i]',
    ]) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.selectOption({ label: /low.*price|price.*low|lowest/i })
            .catch(() => el.selectOption({ label: /price/i }))
            .catch(() => el.selectOption({ value: "price" }));
          sorted = true;
          break;
        }
      } catch (_) {}
    }

    // Try text buttons
    if (!sorted) {
      for (const txt of ["Price (low to high)", "Price: Low to High", "Lowest price first", "Lowest price", "Price", "Low to high"]) {
        try {
          await page.locator(`text="${txt}"`).first().click({ timeout: 3000 });
          sorted = true;
          console.log(`  ✓ Sorted: "${txt}"`);
          break;
        } catch (_) {}
      }
    }

    if (!sorted) console.log("  ⚠ Price sort not found");
    await safeWait(page, 4000);
  } catch (e) { console.log("  ⚠ Sort:", e.message); }

  // ── STEP 9: Print the FIRST hotel ────────────────────────────────────────
  console.log("[ 9/9 ] Reading first hotel...\n");
  try {
    let cardSel = null;
    for (const sel of [
      '[data-selenium="hotel-item"]',
      '[data-testid="property-card"]',
      '[class*="PropertyCard"]',
      '[class*="hotel-item"]',
    ]) {
      try {
        await page.waitForSelector(sel, { timeout: 8000 });
        cardSel = sel;
        break;
      } catch (_) {}
    }
    if (!cardSel) throw new Error("No hotel cards found");

    const hotel = await page.evaluate((cs) => {
      const card = document.querySelector(cs);
      if (!card) return null;

      const t = (sels) => {
        for (const s of sels) {
          const el = card.querySelector(s);
          if (el && el.innerText.trim()) return el.innerText.trim();
        }
        return "N/A";
      };

      const name = t(['[data-selenium="hotel-name"]', 'h3[class*="hotel-name"]', 'p[class*="PropertyName"]', 'h3', 'h2']);
      const city = t(['[data-selenium="area-city-text"]', '[class*="area-city"]', '[class*="PropertyAddress"]', 'span[class*="address"]']);

      let rating = "N/A";
      for (const s of ['[data-selenium="review-score"]', 'span[class*="review-score"]', '[class*="ReviewScore"]', 'span[class*="score"]']) {
        const el = card.querySelector(s);
        if (el) { const m = el.innerText.match(/(\d+[.,]\d+)/); if (m) { rating = m[1]; break; } }
      }

      const price = t(['[data-selenium="display-price"]', 'span[class*="price-per-night"]', '[class*="PriceDisplay"]', 'span[class*="price"]']);
      const total = t(['[data-selenium="total-price"]', 'span[class*="total-price"]', '[class*="TotalPrice"]']);

      const linkEl = card.querySelector('a[href*="/hotel/"]') || card.querySelector('a');
      let url = linkEl ? (linkEl.href || linkEl.getAttribute("href")) : "N/A";
      if (url && url.startsWith("/")) url = "https://www.agoda.com" + url;
      // Clean URL — remove query string for readability
      try { url = url.split("?")[0]; } catch (_) {}

      return { name, city, rating, price, total, url };
    }, cardSel);

    if (!hotel) {
      console.log("⚠  Could not read hotel card.");
    } else {
      console.log("╔══════════════════════════════════════════════════════════╗");
      console.log("║        🏨  BEST HOTEL — Rating 9+ · Lowest Price        ║");
      console.log("╠══════════════════════════════════════════════════════════╣");
      console.log(`  Hotel Name  : ${hotel.name}`);
      console.log(`  City        : ${hotel.city}`);
      console.log(`  Rating      : ${hotel.rating}`);
      console.log(`  Price/Night : ${hotel.price}`);
      console.log(`  Total Stay  : ${hotel.total}`);
      console.log(`  URL         : ${hotel.url}`);
      console.log("╚══════════════════════════════════════════════════════════╝");
    }
  } catch (e) { console.log("⚠  Print error:", e.message); }

  console.log("\n⏳ Browser stays open 10 seconds for review...");
  await pause(10000);
  await browser.close();
  console.log("✅ Done!\n");
}

main().catch(err => { console.error("❌ Error:", err.message); process.exit(1); });
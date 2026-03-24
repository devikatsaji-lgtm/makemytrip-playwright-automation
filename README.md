# 🏨 Agoda Mumbai Hotel Automation (Playwright)

This project automates hotel search on Agoda using Playwright.

## 📌 Features
- Search Mumbai hotels
- Select dates (April 1–5)
- Add 2 adults + 2 children (age 3 & 5)
- Filter rating 9+
- Sort by lowest price
- Extract first hotel details

## 📦 Prerequisites
- Node.js (v16 or higher)
- npm

## ⚙️ Setup Instructions

### 1. Initialize project
npm init -y

### 2. Install Playwright
npm install playwright

### 3. Install browser
npx playwright install chromium

## ▶️ Run Script
node agoda_mumbai.js

## ⚠️ Notes
- Agoda UI may change → update selectors if needed
- Script includes handling for popups and dynamic UI

## 🛠 Troubleshooting
- Use force click if element not clickable:
  await locator.click({ force: true });

- Increase timeout if needed:
  await page.waitForSelector(selector, { timeout: 20000 });

## 👩‍💻 Author
QA Automation Practice Project

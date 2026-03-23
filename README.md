# 🏨 MakeMyTrip Hotel Scraper

An automated browser script that finds the **highest-rated hotel or resort with the lowest available price** for a 5-night stay on [MakeMyTrip](https://www.makemytrip.com).

---

## 📋 What It Does

1. Opens MakeMyTrip's Hotels page in a real browser (Chromium).
2. Searches for hotels in a configured city with the specified dates and guests.
3. Sets guests: **2 Adults + 1 Child (Age 5) + 1 Child (Age 3)**.
4. Applies the **Hotel / Resort** filter.
5. Scrolls through all visible results and extracts name, rating, and price.
6. Finds the hotel with the **highest rating**, and among those, picks the one with the **lowest price per night**.
7. Prints the result to the terminal.

---

## 🔍 Search Criteria

| Field           | Value                              |
|-----------------|------------------------------------|
| Stay Duration   | 5 nights                           |
| Travel Dates    | 30 days from today (configurable)  |
| Adults          | 2                                  |
| Children        | 2 (Ages: 5 and 3)                  |
| Hotel Type      | Hotel or Resort                    |
| Currency        | INR (₹)                            |
| Data Source     | MakeMyTrip only                    |

---

## 🖥️ Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)
- A stable internet connection
- **Disable any Ad Blocker browser extensions** before running (they interfere with MMT's site)

---

## ⚙️ Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/mmt-hotel-scraper.git
cd mmt-hotel-scraper
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install the Chromium browser (used by Playwright)

```bash
npm run install-browsers
```

---

## ▶️ Running the Script

```bash
npm start
```

The script will:
- Open a visible browser window (you can watch it work)
- Search for hotels automatically
- Print the best match in your terminal

---

## 🔧 Configuration

You can customise the search by editing the `CONFIG` object at the top of `index.js`:

```js
const CONFIG = {
  city: "Goa",              // 🏙 Change to your target city (e.g. "Mumbai", "Delhi")
  checkInOffsetDays: 30,    // 📅 Check-in = today + this many days
  stayNights: 5,            // 🌙 Number of nights
  adults: 2,                // 👤 Number of adults
  children: [5, 3],         // 👶 Ages of children
  headless: false,          // 👁 true = no browser window (faster, less visible)
  slowMo: 80,               // ⏱ Delay between actions in ms (helps avoid detection)
  timeout: 60000,           // ⏳ Max wait per action in ms
};
```

---

## 📤 Expected Output

```
╔══════════════════════════════════════════════════╗
║       MakeMyTrip Hotel Scraper                   ║
╚══════════════════════════════════════════════════╝
🏙  City      : Goa
📅 Check-in  : 22 Jun 2025
📅 Check-out : 27 Jun 2025
👥 Guests    : 2 Adults, 2 Children (Ages: 5, 3)

🌐 Opening MakeMyTrip...
🔍 Searching for hotels in Goa...
📅 Setting check-in date...
📅 Setting check-out date...
👥 Setting guests...
🔎 Submitting search...
📊 Extracting hotel listings...
   Found 24 hotels with valid rating & price.

╔══════════════════════════════════════════════════╗
║            ✅  BEST MATCH FOUND                  ║
╚══════════════════════════════════════════════════╝
🏨 Name            : The Leela Goa
🏙  City            : Goa
⭐ Rating           : 4.8
💰 Price per night  : ₹6,500
💳 Total (5 nights) : ₹32,500
🔗 URL              : https://www.makemytrip.com/hotels/...
══════════════════════════════════════════════════
```

---

## 🧱 Tech Stack

| Tool       | Purpose                          |
|------------|----------------------------------|
| Node.js    | Runtime environment              |
| Playwright | Browser automation framework     |
| Chromium   | Headless/headed browser engine   |

---

## 🔑 Selection Logic

```
1. Collect all hotels from results page
2. maxRating = highest rating across all hotels
3. topRatedHotels = all hotels where rating === maxRating
4. bestHotel = hotel in topRatedHotels with minimum pricePerNight
```

---

## ❗ Troubleshooting

| Problem | Solution |
|---|---|
| `No hotels found` | Try a different city or increase `checkInOffsetDays` |
| Browser opens but nothing happens | MakeMyTrip may have updated its UI. Open an issue. |
| Popup blocks the flow | The script tries to close modals automatically. Increase `slowMo` to `150`. |
| Script crashes on date picker | Increase `timeout` to `90000` in CONFIG |
| Error screenshot saved | Check `error-screenshot.png` in the project folder |

---

## 📁 Project Structure

```
mmt-hotel-scraper/
├── index.js        # Main automation script
├── package.json    # Dependencies and scripts
└── README.md       # This file
```

---

## 📝 Notes

- The script interacts with MakeMyTrip like a real user — no APIs or scraping bypasses are used.
- Only the search results page is processed (no deep crawling).
- If MakeMyTrip shows a CAPTCHA or login wall, try running with `headless: false` and solve it manually once.

---

## 📄 License

MIT

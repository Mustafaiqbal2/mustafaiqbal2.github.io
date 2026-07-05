import path from "node:path";
import { chromium } from "playwright-core";

const chromePath = process.env.CHROME_EXECUTABLE_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const base = "http://127.0.0.1:4174";
const outDir = path.join(process.cwd(), "audit-shots", "beauty");

const shots = [
  { route: "/", name: "home", scroll: 0 },
  { route: "/", name: "home-below-fold", scroll: 950 },
  { route: "/work/", name: "work", scroll: 0 },
  { route: "/work/revvy-review-automation/", name: "case-revvy", scroll: 0 },
  { route: "/resume/", name: "resume", scroll: 0 },
  { route: "/", name: "footer", scroll: 99999 }
];

const browser = await chromium.launch({ executablePath: chromePath, headless: true });

for (const theme of ["dark", "light"]) {
  for (const width of [1440, 390]) {
    const mobile = width < 500;
    const context = await browser.newContext({
      viewport: { width, height: mobile ? 850 : 950 },
      isMobile: mobile,
      hasTouch: mobile,
      deviceScaleFactor: 1
    });
    await context.addInitScript((t) => localStorage.setItem("theme-preference", t), theme);
    const page = await context.newPage();
    for (const shot of shots) {
      await page.goto(`${base}${shot.route}`, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(1500);
      if (shot.scroll) {
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), shot.scroll);
        await page.waitForTimeout(1100);
      }
      await page.screenshot({ path: path.join(outDir, `${shot.name}-${width}-${theme}.png`) });
    }
    await context.close();
  }
}

await browser.close();
console.log("beauty shots done");

/**
 * Phase 4 visual gate: capture list / board / create modal / issue detail
 * at 1914x992 against the dev server, with console-error monitoring.
 * Restores view-preference state afterward for golden comparability.
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3001";
const OUT =
  "/private/tmp/claude-501/-Users-moon-Documents-linear/756a3e51-2170-4c62-854d-12969153cc3d/scratchpad/shots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const errors = [];
try {
  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 200)));
  await page.setViewport({ width: 1914, height: 992 });

  // 1) team issues list
  await page.goto(`${BASE}/synquic-labs/team/TRENDZO/all`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await sleep(4000);
  await page.screenshot({ path: `${OUT}/p4-list.png` });

  // 2) board via mod+b
  await page.keyboard.down("Meta");
  await page.keyboard.press("b");
  await page.keyboard.up("Meta");
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/p4-board.png` });

  // 3) create modal from the board column + (fall back to "c")
  const plus = await page.$('[class*="quickAdd"]');
  if (plus) await plus.click();
  else await page.keyboard.press("c");
  await sleep(900);
  await page.screenshot({ path: `${OUT}/p4-create.png` });
  await page.keyboard.press("Escape");
  await sleep(400);

  // restore list layout
  await page.keyboard.down("Meta");
  await page.keyboard.press("b");
  await page.keyboard.up("Meta");
  await sleep(800);

  // 4) issue detail
  await page.goto(`${BASE}/synquic-labs/issue/TRENDZO-37/research-work`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await sleep(3500);
  await page.screenshot({ path: `${OUT}/p4-detail.png` });

  console.log("shots done");
  console.log(errors.length ? "CONSOLE ERRORS:\n" + errors.join("\n") : "no console errors");
} finally {
  await browser.close();
}

import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "/private/tmp/claude-501/-Users-moon-Documents-linear/756a3e51-2170-4c62-854d-12969153cc3d/scratchpad/shots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const errors = [];
try {
  const page = await browser.newPage();
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 160)));
  await page.setViewport({ width: 1914, height: 992 });
  await page.goto("http://localhost:3001/synquic-labs/projects/all", { waitUntil: "networkidle2", timeout: 90000 });
  await sleep(4000);
  await page.screenshot({ path: `${OUT}/p5-projects.png` });
  await page.goto("http://localhost:3001/synquic-labs/project/driver-app-0f150687c354/overview", { waitUntil: "networkidle2", timeout: 90000 });
  await sleep(4000);
  await page.screenshot({ path: `${OUT}/p5-overview.png` });
  console.log("shots done;", errors.length ? "ERRORS:\n" + errors.join("\n") : "no console errors");
} finally { await browser.close(); }

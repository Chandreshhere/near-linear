import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SCRATCH = "/private/tmp/claude-501/-Users-moon-Documents-linear/756a3e51-2170-4c62-854d-12969153cc3d/scratchpad";
const OUT = `${SCRATCH}/shots`;
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const errors = [];
let failed = false;
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed = true;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
try {
  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 240));
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 240)));
  await page.setViewport({ width: 1600, height: 950 });

  const rowSel = 'main [data-scroll-container] a[href*="/issue/"]';
  const panelSel = 'aside[aria-label="Issue insights"]';

  // ---------------- (pre) team issues view, panel closed ----------------
  await page.goto("http://localhost:3001/synquic-labs/team/TRENDZO/all", {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await page.waitForSelector(rowSel, { timeout: 60000 });
  await sleep(1200);

  const rowBoxBefore = await page.$eval(rowSel, (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, width: r.width };
  });
  const rowCountBefore = (await page.$$(rowSel)).length;
  check("panel absent before toggle", (await page.$(panelSel)) === null);

  // ---------------- toggle insights open ----------------
  const toggle = await page.$('button[aria-label="Open insights"]');
  check("toolbar has an Open insights button", toggle !== null);
  await toggle.click();
  await page.waitForSelector(panelSel, { timeout: 10000 });
  await sleep(400); // let the enter animation finish

  const btnState = await page.$eval(
    'button[aria-label="Close insights"]',
    (el) => el.getAttribute("data-state"),
  );
  check("toggle data-state=active while open", btnState === "active");

  // (a) overlay: the list's first row must not move or shrink
  const rowBoxAfter = await page.$eval(rowSel, (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, width: r.width };
  });
  check(
    "(a) first row X unchanged",
    Math.abs(rowBoxAfter.x - rowBoxBefore.x) < 0.5,
    `${rowBoxBefore.x} -> ${rowBoxAfter.x}`,
  );
  check(
    "(a) first row width unchanged",
    Math.abs(rowBoxAfter.width - rowBoxBefore.width) < 0.5,
    `${rowBoxBefore.width} -> ${rowBoxAfter.width}`,
  );

  // (b) geometry against the content card
  const geom = await page.evaluate(() => {
    const card = document.querySelector("#mainLayoutContainer main");
    const panel = document.querySelector('aside[aria-label="Issue insights"]');
    const c = card.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    return {
      rightInset: c.right - p.right,
      bottomInset: c.bottom - p.bottom,
      topFromCard: p.top - c.top,
      width: p.width,
      radius: getComputedStyle(panel).borderRadius,
    };
  });
  check("(b) right inset 8", Math.abs(geom.rightInset - 8) < 1.01, String(geom.rightInset));
  check("(b) bottom inset 8", Math.abs(geom.bottomInset - 8) < 1.01, String(geom.bottomInset));
  check("(b) width 320", Math.abs(geom.width - 320) < 1.01, String(geom.width));
  check("(b) radius 12px", geom.radius === "12px", geom.radius);
  check(
    "(b) top below the two header bands (+8)",
    Math.abs(geom.topFromCard - 123) < 2.01,
    String(geom.topFromCard),
  );

  // (c) tabs switch facets
  const tabInfo = await page.$$eval(`${panelSel} [role="tab"]`, (tabs) =>
    tabs.map((t) => ({ label: t.textContent, selected: t.getAttribute("aria-selected") })),
  );
  check(
    "(c) tabs Assignees|Labels|Priority|Projects",
    JSON.stringify(tabInfo.map((t) => t.label)) ===
      JSON.stringify(["Assignees", "Labels", "Priority", "Projects"]),
    JSON.stringify(tabInfo),
  );
  const listTextFor = () =>
    page.$eval(`${panelSel}`, (el) => el.children[1].textContent);
  const assigneeText = await listTextFor();

  const clickTab = async (label) => {
    const handles = await page.$$(`${panelSel} [role="tab"]`);
    for (const h of handles) {
      const t = await h.evaluate((el) => el.textContent);
      if (t === label) {
        await h.click();
        return;
      }
    }
    throw new Error(`tab ${label} not found`);
  };

  await clickTab("Priority");
  await sleep(200);
  const priorityText = await listTextFor();
  const prioritySelected = await page.$$eval(`${panelSel} [role="tab"]`, (tabs) =>
    tabs.find((t) => t.textContent === "Priority")?.getAttribute("aria-selected"),
  );
  check("(c) Priority tab selects", prioritySelected === "true");
  check(
    "(c) facet list changes with the tab",
    priorityText !== assigneeText && /No priority|Urgent|High|Medium|Low/.test(priorityText),
    priorityText.slice(0, 80),
  );

  // hover a row so the "See issues" affordance shows, then screenshot
  const firstRow = await page.$(`${panelSel} button[aria-label*="See issues"]`);
  check("facet rows expose the See issues affordance", firstRow !== null);
  await firstRow.hover();
  await sleep(300);
  await page.screenshot({ path: `${OUT}/facet-panel.png` });

  // (d) clicking the Priority facet row applies a filter
  const clickedLabel = await firstRow.evaluate((el) => el.getAttribute("aria-label"));
  await firstRow.click();
  await sleep(1200);
  const url = decodeURIComponent(page.url());
  check("(d) URL gains the priority chip", url.includes("filter=priority:is:"), url);
  const chipText = await page.evaluate(() => {
    const main = document.querySelector("#mainLayoutContainer main");
    return main ? main.textContent.includes("Priority") : false;
  });
  check("(d) a Priority filter chip renders", chipText);
  const rowCountAfter = (await page.$$(rowSel)).length;
  check(
    "(d) row set narrows",
    rowCountAfter > 0 && rowCountAfter < rowCountBefore,
    `${rowCountBefore} -> ${rowCountAfter} (facet: ${clickedLabel})`,
  );

  // (e) open state + active tab survive reload
  await page.reload({ waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector(rowSel, { timeout: 60000 });
  await sleep(1500);
  const panelAfterReload = await page.$(panelSel);
  check("(e) panel still open after reload", panelAfterReload !== null);
  if (panelAfterReload !== null) {
    const tabAfterReload = await page.$$eval(`${panelSel} [role="tab"]`, (tabs) =>
      tabs.find((t) => t.getAttribute("aria-selected") === "true")?.textContent,
    );
    check("(e) active facet tab survives reload", tabAfterReload === "Priority", String(tabAfterReload));
  }

  // ---------------- (f) projects view with the Health facet ----------------
  const projPanelSel = 'aside[aria-label="Project insights"]';
  const projRowSel = 'main [data-scroll-container] a[href*="/project/"]';
  await page.goto("http://localhost:3001/synquic-labs/projects/all", {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await page.waitForSelector(projRowSel, { timeout: 60000 });
  await sleep(1200);
  const projRowBefore = await page.$eval(projRowSel, (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, width: r.width };
  });
  await (await page.$('button[aria-label="Open insights"]')).click();
  await page.waitForSelector(projPanelSel, { timeout: 10000 });
  await sleep(400);
  const projTabs = await page.$$eval(`${projPanelSel} [role="tab"]`, (tabs) =>
    tabs.map((t) => t.textContent),
  );
  check(
    "(f) projects tabs Health|Teams|Leads",
    JSON.stringify(projTabs) === JSON.stringify(["Health", "Teams", "Leads"]),
    JSON.stringify(projTabs),
  );
  const healthText = await page.$eval(projPanelSel, (el) => el.children[1].textContent);
  check(
    "(f) Health facet rows present",
    healthText.includes("Update missing") && healthText.includes("On track"),
    healthText.slice(0, 100),
  );
  const projRowAfter = await page.$eval(projRowSel, (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, width: r.width };
  });
  check(
    "(f) table row geometry unchanged under overlay",
    Math.abs(projRowAfter.x - projRowBefore.x) < 0.5 &&
      Math.abs(projRowAfter.width - projRowBefore.width) < 0.5,
    `${projRowBefore.x}/${projRowBefore.width} -> ${projRowAfter.x}/${projRowAfter.width}`,
  );
  // click "On track" and expect a health chip in the URL
  const healthRows = await page.$$(`${projPanelSel} button[aria-label*="See projects"]`);
  let onTrackRow = null;
  for (const h of healthRows) {
    const t = await h.evaluate((el) => el.getAttribute("aria-label"));
    if (t.startsWith("On track")) onTrackRow = h;
  }
  check("(f) On track facet row exists", onTrackRow !== null);
  await onTrackRow.click();
  await sleep(1200);
  const projUrl = decodeURIComponent(page.url());
  check("(f) URL gains the health chip", projUrl.includes("filter=health:is:onTrack"), projUrl);
  await page.screenshot({ path: `${OUT}/facet-panel-projects.png` });

  // ---------------- restore: clear the localStorage this run created ----------------
  await page.evaluate(() => {
    const doomed = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key !== null && (key.startsWith("facetTab:") || key.startsWith("linearFlag:insights:"))) {
        doomed.push(key);
      }
    }
    for (const key of doomed) window.localStorage.removeItem(key);
    return doomed;
  });
  await page.goto("http://localhost:3001/synquic-labs/team/TRENDZO/all", {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await page.evaluate(() => {
    const doomed = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key !== null && (key.startsWith("facetTab:") || key.startsWith("linearFlag:insights:"))) {
        doomed.push(key);
      }
    }
    for (const key of doomed) window.localStorage.removeItem(key);
  });
  check("restore: test localStorage keys cleared", true);
} finally {
  await browser.close();
}

console.log(results.join("\n"));
console.log(
  errors.length === 0
    ? "(g) PASS  zero console errors"
    : `(g) FAIL  console errors:\n${errors.join("\n")}`,
);
process.exit(failed || errors.length > 0 ? 1 : 0);

/**
 * Phase 3 gate: optimistic round-trip, two-context realtime convergence,
 * and warm-reload persistence, against the dev server on :3001.
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = "http://localhost:3001/dev/data";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const grab = async (page) => {
  const text = await page.evaluate(() => document.body.innerText);
  const status = text.match(/status:\s*(\w+)/)?.[1];
  const lastSyncId = Number(text.match(/lastSyncId:\s*(\d+)/)?.[1] ?? -1);
  const pending = Number(text.match(/pending:\s*(\d+)/)?.[1] ?? -1);
  const title = text.match(/title:\s*([^·]+)·/)?.[1]?.trim();
  const priority = Number(text.match(/priority:\s*(\d+)/)?.[1] ?? -1);
  return { status, lastSyncId, pending, title, priority };
};

const waitReady = async (page, label) => {
  for (let i = 0; i < 40; i++) {
    const s = await grab(page);
    if (s.status === "ready") return s;
    await sleep(500);
  }
  throw new Error(`${label}: never reached ready`);
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
try {
  // Two independent contexts (separate IndexedDB), one server.
  const ctxA = await browser.createBrowserContext();
  const ctxB = await browser.createBrowserContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  await a.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
  await b.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
  const a0 = await waitReady(a, "A");
  const b0 = await waitReady(b, "B");
  console.log("A ready:", JSON.stringify(a0));
  console.log("B ready:", JSON.stringify(b0));

  // 1) optimistic mutation in A: click "Toggle priority"
  const before = a0.priority;
  await a.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Toggle priority")
    );
    btn?.click();
  });
  const aInstant = await grab(a); // optimistic apply should be immediate
  console.log("A instant after click:", JSON.stringify(aInstant));

  // 2) convergence: B must receive the delta via SSE
  let bAfter = null;
  for (let i = 0; i < 30; i++) {
    bAfter = await grab(b);
    if (bAfter.priority !== before && bAfter.lastSyncId > b0.lastSyncId) break;
    await sleep(400);
  }
  console.log("B after delta:", JSON.stringify(bAfter));
  const converged = bAfter.priority === aInstant.priority;
  console.log(converged ? "CONVERGED ✓" : "CONVERGED ✗");

  // 3) A's queue drains (ack + delta echo)
  let aSettled = null;
  for (let i = 0; i < 20; i++) {
    aSettled = await grab(a);
    if (aSettled.pending === 0 && aSettled.lastSyncId >= bAfter.lastSyncId) break;
    await sleep(400);
  }
  console.log("A settled:", JSON.stringify(aSettled));

  // 4) warm reload: A reloads — must hydrate from IndexedDB with same state
  await a.reload({ waitUntil: "networkidle2" });
  const aWarm = await waitReady(a, "A warm");
  console.log("A after warm reload:", JSON.stringify(aWarm));
  const warmOk = aWarm.priority === aSettled.priority && aWarm.lastSyncId >= aSettled.lastSyncId;
  console.log(warmOk ? "WARM RELOAD ✓" : "WARM RELOAD ✗");

  const pass = converged && aSettled.pending === 0 && warmOk;
  console.log(pass ? "PHASE 3 GATE: PASS" : "PHASE 3 GATE: FAIL");
  process.exitCode = pass ? 0 : 1;
} finally {
  await browser.close();
}

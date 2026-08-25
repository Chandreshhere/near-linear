import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "/private/tmp/claude-501/-Users-moon-Documents-linear/756a3e51-2170-4c62-854d-12969153cc3d/scratchpad/shots";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3001";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const errors = [];
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--window-size=1914,992"],
});

try {
  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 200)));
  await page.setViewport({ width: 1914, height: 992 });

  // ---------- helpers ----------
  const clickButton = async (text, scopeSel = null) => {
    const handle = await page.evaluateHandle(
      (sel, t) => {
        const scope = sel ? document.querySelector(sel) : document;
        if (!scope) return null;
        return (
          [...scope.querySelectorAll("button")].find(
            (b) => b.textContent.trim() === t && !b.disabled,
          ) ?? null
        );
      },
      scopeSel,
      text,
    );
    const el = handle.asElement();
    if (!el) throw new Error(`button "${text}" not found in ${scopeSel ?? "document"}`);
    await el.click();
    await handle.dispose();
  };

  const waitForText = async (text, timeout = 8000) => {
    await page.waitForFunction(
      (t) => document.body && document.body.innerText.includes(t),
      { timeout },
      text,
    );
  };

  const bodyHas = (text) => page.evaluate((t) => document.body.innerText.includes(t), text);

  /** Open the Nth select trigger with this aria-label and pick the option. */
  const pickSelect = async (label, index, optionText) => {
    const triggers = await page.$$(`button[aria-label="${label}"]`);
    if (!triggers[index]) throw new Error(`select "${label}"[${index}] not found`);
    await triggers[index].click();
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    const picked = await page.evaluate((t) => {
      const option = [...document.querySelectorAll('[role="option"]')].find(
        (o) => o.textContent.trim() === t,
      );
      if (!option) return false;
      option.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      option.click();
      return true;
    }, optionText);
    if (!picked) throw new Error(`option "${optionText}" not found for ${label}`);
    await sleep(250);
  };

  // ---------- 1) open the integrations settings page ----------
  await page.goto(`${BASE}/synquic-labs/settings/integrations`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await waitForText("Integrations", 20000);
  await waitForText("Microsoft Teams", 20000);
  await sleep(1500); // sync boot + integrations hydrate
  check("page renders directory with both provider cards",
    (await bodyHas("Slack")) && (await bodyHas("Microsoft Teams")));

  // ---------- 2) connect Microsoft Teams (simulated OAuth) ----------
  await clickButton("Connect", '[data-provider="msteams"]');
  await waitForText("Simulated OAuth", 5000);
  const nameInput = await page.$("#integration-workspace-name");
  await nameInput.click({ clickCount: 3 });
  await nameInput.type("Contoso");
  await clickButton("Authorize");
  await waitForText("3 channels", 5000);
  await sleep(600); // let the observer re-render settle
  check("Teams card flips to connected state (workspace, channel count)",
    (await bodyHas("Contoso")) && (await bodyHas("3 channels")) && (await bodyHas("Connected")));
  const headings = await page.evaluate(() =>
    [...document.querySelectorAll("h3")].map((h) => h.textContent.trim()),
  );
  check(
    "connection section appears",
    headings.some((h) => h.includes("Microsoft Teams") && h.includes("Contoso")),
    `h3s: ${JSON.stringify(headings)}`,
  );

  // ---------- 3) add a routing rule: Engineering → Trendzo, /task command ----------
  await clickButton("Add rule");
  await page.waitForSelector('button[aria-label="Trigger mode"]', { timeout: 5000 });
  await pickSelect("Channel", 0, "#Engineering"); // rule row channel (simulator's is index 1)
  await pickSelect("Team", 0, "Trendzo");
  await pickSelect("Trigger mode", 0, "/task command");
  const ruleState = await page.evaluate(() => {
    const raw = localStorage.getItem("integrations");
    return raw ? JSON.parse(raw) : null;
  });
  const rule = ruleState?.rules?.[0];
  check(
    "rule persisted: Engineering → t-trendzo, mode command",
    rule !== undefined &&
      rule.channelId === "mst-engineering" &&
      rule.teamId === "t-trendzo" &&
      rule.triggerMode === "command",
    JSON.stringify(rule),
  );

  // ---------- 4) simulate "/task Fix retailer login priority high" ----------
  // Fixtures move under our feet (concurrent phases) — compute the identifier
  // the allocator will hand out from the live store, exactly like ingest does.
  const expectedIdentifier = await page.evaluate(() => {
    const client = globalThis.__linearSyncClients__?.get("synquic-labs");
    if (!client) return null;
    const next =
      client.store
        .all("Issue")
        .filter((i) => i.teamId === "t-trendzo" && !i.archivedAt)
        .reduce((max, i) => Math.max(max, i.number), 0) + 1;
    return `TRENDZO-${next}`;
  });
  check("live store reachable, next identifier computed", expectedIdentifier !== null, expectedIdentifier ?? "");

  await pickSelect("Channel", 1, "#Engineering"); // simulator channel select
  await page.type('input[aria-label="Author"]', "sana");
  await page.type('textarea[aria-label="Message text"]', "/task Fix retailer login priority high");
  await clickButton("Send");
  try {
    await waitForText(`Created ${expectedIdentifier} from #Engineering`, 8000);
  } catch {
    const simText = await page.evaluate(() => document.body.innerText.slice(0, 4000));
    check("toast/inline appeared", false, `body: ${simText.slice(0, 600)}`);
  }
  const toastShown = await page.evaluate((id) => {
    const toaster = document.querySelector("[data-sonner-toaster]");
    return toaster !== null && toaster.innerText.includes(`Created ${id} from #Engineering`);
  }, expectedIdentifier);
  check(`toast fired: Created ${expectedIdentifier} from #Engineering`, toastShown);

  const inlineLinks = await page.evaluate(
    (id) => document.querySelectorAll(`a[href*="/issue/${id}/"]`).length,
    expectedIdentifier,
  );
  check(`inline result + log row link to ${expectedIdentifier}`, inlineLinks >= 2, `${inlineLinks} links`);

  // ---------- 5) the issue really exists in the sync engine ----------
  await sleep(1200); // let the optimistic transaction drain into IndexedDB
  const issue = await page.evaluate((id) => {
    const client = globalThis.__linearSyncClients__?.get("synquic-labs");
    if (!client) return { error: "no client" };
    const row = client.store.issueByIdentifier(id);
    if (!row) return { error: "issue not found" };
    const state = client.store.get("WorkflowState", row.stateId);
    return {
      identifier: row.identifier,
      title: row.title,
      priority: row.priority,
      description: row.description,
      stateCategory: state?.category,
      stateTeam: state?.teamId,
      creatorId: row.creatorId,
      assigneeId: row.assigneeId ?? null,
      sortOrder: row.sortOrder,
      pending: client.queue.pendingCount,
    };
  }, expectedIdentifier);
  check("issue exists with title 'Fix retailer login'", issue.title === "Fix retailer login", JSON.stringify(issue));
  check("priority parsed high → 2", issue.priority === 2);
  check(
    "landed in TRENDZO backlog state",
    issue.stateCategory === "backlog" && issue.stateTeam === "t-trendzo",
  );
  check("creatorId u-yk, unassigned (no 'assign me')", issue.creatorId === "u-yk" && issue.assigneeId === null);
  check(
    "description footer mentions provider · channel · author",
    typeof issue.description === "string" &&
      issue.description.includes("Created from Microsoft Teams · #Engineering · sana"),
  );
  check("optimistic transaction drained (persisted, no DataCloneError)", issue.pending === 0, `pending=${issue.pending}`);

  // ---------- 6) issue detail page renders it ----------
  await page.goto(`${BASE}/synquic-labs/issue/${expectedIdentifier}/fix-retailer-login`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await waitForText("Fix retailer login", 20000);
  check("issue page renders title", await bodyHas("Fix retailer login"));
  check("issue page shows the footer line", await bodyHas("Created from Microsoft Teams"));
  await page.screenshot({ path: `${OUT}/integrations-issue.png` });

  // ---------- 7) non-matching messages log as ignored ----------
  await page.goto(`${BASE}/synquic-labs/settings/integrations`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await waitForText("Test the pipeline", 20000);
  await sleep(800);

  // 7a: no rule for #General
  await pickSelect("Channel", 1, "#General");
  await page.type('textarea[aria-label="Message text"]', "standup moved to 10am today");
  await clickButton("Send");
  await waitForText("No routing rule for #General", 5000);
  check("no-rule message ignored with reason", await bodyHas("No routing rule for #General"));

  // 7b: right channel, wrong trigger (no /task)
  await pickSelect("Channel", 1, "#Engineering");
  const textarea = await page.$('textarea[aria-label="Message text"]');
  await textarea.click({ clickCount: 3 });
  await textarea.type("can someone look at the retailer login flow?");
  await clickButton("Send");
  await waitForText("Not a /task command", 5000);
  check("wrong-trigger message ignored with reason", await bodyHas("Not a /task command (rule requires /task)"));

  const logShape = await page.evaluate(() => {
    const raw = localStorage.getItem("integrations");
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      total: parsed?.log?.length ?? 0,
      created: parsed?.log?.filter((m) => m.outcome.kind === "created").length ?? 0,
      ignored: parsed?.log?.filter((m) => m.outcome.kind === "ignored").length ?? 0,
    };
  });
  check("activity log holds 1 created + 2 ignored", logShape.total === 3 && logShape.created === 1 && logShape.ignored === 2, JSON.stringify(logShape));

  // ---------- 8) screenshot the finished surface ----------
  await sleep(600);
  await page.screenshot({ path: `${OUT}/integrations.png`, fullPage: true });

  // ---------- 9) disconnect keeps the log ----------
  await clickButton("Disconnect", '[data-provider="msteams"]');
  await sleep(600);
  const afterDisconnect = await page.evaluate((id) => ({
    connectButtonBack: [...document.querySelectorAll('[data-provider="msteams"] button')].some(
      (b) => b.textContent.trim() === "Connect",
    ),
    logStillThere:
      document.body.innerText.includes(id) && document.body.innerText.includes("#Engineering"),
    ignoredStillThere:
      [...document.body.querySelectorAll("li")].filter((li) => li.innerText.includes("Ignored"))
        .length >= 2,
  }), expectedIdentifier);
  check("disconnect flips card back to Connect", afterDisconnect.connectButtonBack);
  check("activity log survives disconnect", afterDisconnect.logStillThere && afterDisconnect.ignoredStillThere);
  await page.screenshot({ path: `${OUT}/integrations-disconnected.png` });

  // ---------- 10) cleanup (ephemeral profile, but be explicit) ----------
  await page.evaluate(async () => {
    localStorage.removeItem("integrations");
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      dbs.map(
        (db) =>
          new Promise((resolve) => {
            const req = indexedDB.deleteDatabase(db.name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve(null);
          }),
      ),
    );
  });
  const cleaned = await page.evaluate(() => localStorage.getItem("integrations") === null);
  check("cleanup: integrations localStorage cleared + IndexedDB dropped", cleaned);
} catch (error) {
  check("script completed", false, String(error).slice(0, 300));
} finally {
  console.log(results.join("\n"));
  console.log(
    errors.length === 0
      ? "CONSOLE ERRORS: none"
      : `CONSOLE ERRORS (${errors.length}):\n` + errors.join("\n"),
  );
  if (errors.length > 0) process.exitCode = 1;
  await browser.close();
}

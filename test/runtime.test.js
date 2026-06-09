"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

const {
  StopProcessError,
  collectAllowedCandidates,
  createDefaultConfig,
  detectLoginPage,
  evaluateResponseStatus,
  resolveDownloadTarget,
  runDownloader
} = require("../src/runtime");
const { MAX_FILES, MIN_DELAY_MS } = require("../src/core");
const { renderOutputs } = require("../scripts/build");

function createHeaders(values) {
  return {
    get(name) {
      return values[name.toLowerCase()] || "";
    }
  };
}

function createWindowFixture(html, url = "https://campus.example.edu/course/view") {
  const dom = new JSDOM(html, { url });
  const messages = { alerts: [], confirms: [], logs: [], warns: [], errors: [] };

  dom.window.alert = (message) => {
    messages.alerts.push(message);
  };
  dom.window.confirm = (message) => {
    messages.confirms.push(message);
    return true;
  };
  dom.window.console = {
    error(message) {
      messages.errors.push(String(message));
    },
    log(message) {
      messages.logs.push(String(message));
    },
    warn(message) {
      messages.warns.push(String(message));
    }
  };

  return { dom, messages, window: dom.window };
}

function installDownloadSpy(windowObject, onClick) {
  const originalCreateElement = windowObject.document.createElement.bind(windowObject.document);

  windowObject.document.createElement = (tagName) => {
    const element = originalCreateElement(tagName);
    if (tagName === "a") {
      element.click = () => {
        onClick(element);
      };
    }
    return element;
  };
}

function readAuditedSources() {
  const filesToInspect = [
    path.resolve(__dirname, "..", "src", "runtime.js"),
    path.resolve(__dirname, "..", "src", "core.js"),
    path.resolve(__dirname, "..", "src", "entries", "bookmarklet-entry.js"),
    path.resolve(__dirname, "..", "src", "entries", "console-script-entry.js")
  ];

  return filesToInspect.map((file) => [file, fs.readFileSync(file, "utf8")]);
}

test("401 stops the process", () => {
  assert.throws(
    () => evaluateResponseStatus({ ok: false, status: 401 }, { logger: console, repeatedServerErrors: 0 }),
    (error) => error instanceof StopProcessError && error.code === "authentication-required"
  );
});

test("403 stops the process", () => {
  assert.throws(
    () => evaluateResponseStatus({ ok: false, status: 403 }, { logger: console, repeatedServerErrors: 0 }),
    (error) => error instanceof StopProcessError && error.code === "forbidden"
  );
});

test("429 stops the process", () => {
  assert.throws(
    () => evaluateResponseStatus({ ok: false, status: 429 }, { logger: console, repeatedServerErrors: 0 }),
    (error) => error instanceof StopProcessError && error.code === "rate-limited"
  );
});

test("5xx gets only one limited retry signal", () => {
  const state = { logger: console, repeatedServerErrors: 0 };
  assert.equal(evaluateResponseStatus({ ok: false, status: 500 }, state), "retry");
  assert.equal(state.repeatedServerErrors, 1);
});

test("repeated 5xx responses stop the process", () => {
  const state = { logger: console, repeatedServerErrors: 0 };
  evaluateResponseStatus({ ok: false, status: 500 }, state);
  assert.throws(
    () => evaluateResponseStatus({ ok: false, status: 502 }, state),
    (error) => error instanceof StopProcessError && error.code === "server-error"
  );
});

test("404 is skipped without guessing new URLs", () => {
  const state = { logger: console, repeatedServerErrors: 0 };
  assert.equal(evaluateResponseStatus({ ok: false, status: 404 }, state), "skip");
});

test("candidate collection only accepts visible allowed anchors", () => {
  const { window } = createWindowFixture(`
    <div class="activityname"><a href="/files/lesson.pdf">Lesson</a></div>
    <div class="activityname" hidden><a href="/files/hidden.pdf">Hidden</a></div>
    <div class="activityname"><a href="https://external.example.net/file.pdf">External</a></div>
    <div class="activityname"><a href="javascript:alert(1)">JS</a></div>
  `);

  const config = createDefaultConfig(window, {});
  const candidates = collectAllowedCandidates(window.document, config);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].label, "Lesson");
});

test("detects login pages instead of treating them as downloads", () => {
  const { window } = createWindowFixture("<form><input type=\"password\" /></form>");
  assert.equal(detectLoginPage(window.document), true);
});

test("resolveDownloadTarget rejects cross-origin redirects", async () => {
  const { window } = createWindowFixture("<div class=\"activityname\"><a href=\"/mod/resource/view.php?id=1\">Lesson</a></div>");
  const config = createDefaultConfig(window, {});
  const candidate = collectAllowedCandidates(window.document, config)[0];
  window.fetch = async () => ({
    headers: createHeaders({ "content-type": "text/html" }),
    ok: true,
    status: 200,
    text: async () => "<html></html>",
    url: "https://external.example.net/download.pdf"
  });

  await assert.rejects(
    () => resolveDownloadTarget(window, candidate, config, { logger: window.console, repeatedServerErrors: 0 }),
    (error) => error instanceof StopProcessError && error.code === "cross-origin-redirect"
  );
});

test("accepts legitimate same-origin intermediate pages", async () => {
  const { window } = createWindowFixture("<div class=\"activityname\"><a href=\"/mod/resource/view.php?id=1\">Lesson pack</a></div>");
  const config = createDefaultConfig(window, {});
  const candidate = collectAllowedCandidates(window.document, config)[0];

  window.fetch = async () => ({
    headers: createHeaders({ "content-type": "text/html" }),
    ok: true,
    status: 200,
    text: async () => "<html><body><a href=\"/files/final.pdf\">Final PDF</a></body></html>",
    url: "https://campus.example.edu/mod/resource/view.php?id=1"
  });

  const result = await resolveDownloadTarget(window, candidate, config, { logger: window.console, repeatedServerErrors: 0 });

  assert.equal(result.url.href, "https://campus.example.edu/files/final.pdf");
});

test("does not issue external requests when only external links are present", async () => {
  const { window } = createWindowFixture("<div class=\"activityname\"><a href=\"https://external.example.net/file.pdf\">External</a></div>");
  let fetchCalls = 0;
  window.fetch = async () => {
    fetchCalls += 1;
    throw new Error("fetch should not run");
  };

  const result = await runDownloader(window, {});

  assert.equal(result.status, "no-files");
  assert.equal(fetchCalls, 0);
});

test("does not enumerate identifiers when no visible href is present", async () => {
  const { window } = createWindowFixture("<div class=\"activityname\" data-resource-id=\"42\">Visible text without link</div>");
  let fetchCalls = 0;
  window.fetch = async () => {
    fetchCalls += 1;
    throw new Error("fetch should not run");
  };

  const result = await runDownloader(window, {});

  assert.equal(result.status, "no-files");
  assert.equal(fetchCalls, 0);
});

test("runDownloader does not start downloads without explicit confirmation", async () => {
  const { messages, window } = createWindowFixture("<div class=\"activityname\"><a href=\"/files/lesson.pdf\">Lesson</a></div>");
  let clickCount = 0;
  window.confirm = (message) => {
    messages.confirms.push(message);
    return false;
  };
  installDownloadSpy(window, () => {
    clickCount += 1;
  });

  const result = await runDownloader(window, {});

  assert.equal(result.status, "cancelled-before-start");
  assert.equal(clickCount, 0);
});

test("runDownloader allows user cancellation after the first download", async () => {
  const { window } = createWindowFixture(`
    <div class="activityname"><a href="/files/one.pdf">One</a></div>
    <div class="activityname"><a href="/files/two.pdf">Two</a></div>
  `);
  const clickedPaths = [];

  installDownloadSpy(window, (element) => {
    clickedPaths.push(element.href);
    window.academiPackDownloader.cancel();
  });

  window.setTimeout = (handler) => {
    handler();
    return 1;
  };

  const result = await runDownloader(window, {});

  assert.equal(result.status, "stopped");
  assert.equal(result.reason, "cancelled");
  assert.equal(result.downloadedCount, 1);
  assert.deepEqual(clickedPaths, ["https://campus.example.edu/files/one.pdf"]);
});

test("runDownloader respects the max file limit", async () => {
  const links = new Array(MAX_FILES + 1)
    .fill(0)
    .map((_, index) => `<div class="activityname"><a href="/files/${index}.pdf">File ${index}</a></div>`)
    .join("");
  const { window } = createWindowFixture(links);

  const result = await runDownloader(window, {});

  assert.equal(result.status, "stopped");
  assert.equal(result.reason, "too-many-files");
});

test("runDownloader enforces the minimum delay", async () => {
  const { window } = createWindowFixture(`
    <div class="activityname"><a href="/files/one.pdf">One</a></div>
    <div class="activityname"><a href="/files/two.pdf">Two</a></div>
  `);
  const requestedDelays = [];

  installDownloadSpy(window, () => {});
  window.setTimeout = (handler, delay) => {
    requestedDelays.push(delay);
    handler();
    return 1;
  };

  await runDownloader(window, { delayMs: 100 });

  assert.equal(requestedDelays.length, 1);
  assert.ok(requestedDelays[0] >= MIN_DELAY_MS);
});

test("runDownloader processes downloads sequentially with visible progress logging", async () => {
  const { messages, window } = createWindowFixture(`
    <div class="activityname"><a href="/files/one.pdf">One</a></div>
    <div class="activityname"><a href="/files/two.pdf">Two</a></div>
  `);
  const clickedPaths = [];

  installDownloadSpy(window, (element) => {
    clickedPaths.push(element.href);
  });
  window.setTimeout = (handler) => {
    handler();
    return 1;
  };

  const result = await runDownloader(window, {});

  assert.equal(result.status, "completed");
  assert.deepEqual(clickedPaths, [
    "https://campus.example.edu/files/one.pdf",
    "https://campus.example.edu/files/two.pdf"
  ]);
  assert.ok(messages.logs.some((message) => message.includes("[1/2] Preparing")));
  assert.ok(messages.logs.some((message) => message.includes("[2/2] Preparing")));
});

test("preview logs redact query strings and hashes", async () => {
  const { messages, window } = createWindowFixture(
    "<div class=\"activityname\"><a href=\"/files/lesson.pdf?token=abc#signed\">Lesson PDF</a></div>"
  );

  installDownloadSpy(window, () => {});
  await runDownloader(window, {});

  const combinedOutput = [...messages.logs, ...messages.alerts].join("\n");
  assert.equal(combinedOutput.includes("?token="), false);
  assert.equal(combinedOutput.includes("#signed"), false);
});

test("source does not use document.cookie", () => {
  for (const [file, contents] of readAuditedSources()) {
    assert.equal(contents.includes("document.cookie"), false, `${file} contains document.cookie`);
  }
});

test("source does not use localStorage", () => {
  for (const [file, contents] of readAuditedSources()) {
    assert.equal(contents.includes("localStorage"), false, `${file} contains localStorage`);
  }
});

test("source does not use sessionStorage", () => {
  for (const [file, contents] of readAuditedSources()) {
    assert.equal(contents.includes("sessionStorage"), false, `${file} contains sessionStorage`);
  }
});

test("source does not use telemetry or external messaging APIs", () => {
  const bannedPatterns = ["sendBeacon", "WebSocket", "analytics", "telemetry"];

  for (const [file, contents] of readAuditedSources()) {
    for (const pattern of bannedPatterns) {
      assert.equal(contents.includes(pattern), false, `${file} contains ${pattern}`);
    }
  }
});

test("source does not parse raw HTML with regex", () => {
  const contents = fs.readFileSync(path.resolve(__dirname, "..", "src", "runtime.js"), "utf8");
  assert.equal(contents.includes("html.match("), false);
  assert.equal(contents.includes("matchAll("), false);
});

test("bookmarklet.min.js is reproducibly generated from bookmarklet.js", async () => {
  const outputs = await renderOutputs();

  for (const [outputPath, expectedContents] of Object.entries(outputs)) {
    if (!outputPath.endsWith("bookmarklet.js") && !outputPath.endsWith("bookmarklet.min.js")) {
      continue;
    }
    const currentContents = fs.readFileSync(outputPath, "utf8");
    assert.equal(currentContents, expectedContents);
  }
});

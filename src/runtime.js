"use strict";

const {
  MAX_FILES,
  MIN_DELAY_MS,
  REPEATED_SERVER_ERROR_LIMIT,
  buildPreview,
  clampDelayMs,
  clampMaxFiles,
  computeDelayMs,
  createFetchOptions,
  getAnchorLabel,
  isAllowedDownloadUrl,
  isAllowedProtocol,
  isExtractableAnchorElement,
  isHtmlContentType,
  isInsideAllowedActivityContainer,
  isSameOrigin,
  normalizeUrl,
  redactUrl,
  uniqueCandidates
} = require("./core");

const DEFAULT_ACTIVITY_SELECTORS = [
  ".activityname",
  ".instancename",
  "li.activity",
  ".ig-title",
  ".course-content li",
  "[data-type=\"resource\"]"
];

const DEFAULT_INCLUDE_PATTERNS = [
  "pluginfile.php",
  "mod/resource/view.php",
  "/files/",
  "/bbcswebdav/",
  "/download"
];

const DEFAULT_EXCLUDE_PATTERNS = [
  "/mod/quiz/",
  "/mod/forum/",
  "/mod/assign/",
  "/mod/chat/",
  "/mod/choice/",
  "/mod/feedback/",
  "/mod/workshop/",
  "/mod/scorm/",
  "/mod/lti/",
  "/assignments/",
  "/quizzes/",
  "/discussion/",
  "/discussion_topics/",
  "/grades/",
  "/submission/",
  "/submissions/",
  "/forum/",
  "/gradebook/"
];

const DEFAULT_EXTENSION_PATTERN = /\.(pdf|docx?|pptx?|xlsx?|odt|ods|odp|zip|csv|txt|rtf|epub|mp4|mp3)(?:$|\?)/i;

class StopProcessError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function createDefaultConfig(windowObject, overrides) {
  return {
    activitySelector: DEFAULT_ACTIVITY_SELECTORS.join(","),
    delayMs: MIN_DELAY_MS,
    extensionPattern: DEFAULT_EXTENSION_PATTERN,
    excludePatterns: DEFAULT_EXCLUDE_PATTERNS,
    includePatterns: DEFAULT_INCLUDE_PATTERNS,
    maxFiles: MAX_FILES,
    modeName: "console",
    origin: windowObject.location.origin,
    platformAdapter: null,
    resolveIntermediatePages: true,
    ...overrides
  };
}

function createState(windowObject) {
  return {
    cancelled: false,
    logger: windowObject.console,
    repeatedServerErrors: 0
  };
}

function exposeCancellation(windowObject, state) {
  windowObject.academiPackDownloader = {
    cancel() {
      state.cancelled = true;
    },
    getState() {
      return { cancelled: state.cancelled };
    }
  };
}

function assertNotCancelled(state) {
  if (state.cancelled) {
    throw new StopProcessError("cancelled", "cancelled by user");
  }
}

function collectAllowedCandidates(documentObject, config, options = {}) {
  const containerSelector = options.containerSelector || config.activitySelector;
  const allowAnyVisibleContainer = Boolean(options.allowAnyVisibleContainer);
  const baseUrl = options.baseUrl || documentObject.baseURI;
  const anchors = [...documentObject.querySelectorAll("a[href]")];

  const candidates = anchors.flatMap((anchor) => {
    if (!isExtractableAnchorElement(anchor)) {
      return [];
    }

    if (!allowAnyVisibleContainer && !isInsideAllowedActivityContainer(anchor, containerSelector)) {
      return [];
    }

    const relativeHref = anchor.getAttribute("href");
    const url = normalizeUrl(relativeHref, baseUrl);

    if (!url || !isAllowedDownloadUrl(url, config)) {
      return [];
    }

    return [{
      anchor,
      label: getAnchorLabel(anchor, url),
      url
    }];
  });

  return uniqueCandidates(candidates);
}

function enforceFileCount(candidates, config) {
  const maxFiles = clampMaxFiles(config.maxFiles);

  if (candidates.length > maxFiles) {
    throw new StopProcessError(
      "too-many-files",
      `Refusing to continue because ${candidates.length} files were found and the safe limit is ${maxFiles}.`
    );
  }
}

function showPreviewAndConfirm(windowObject, candidates, config) {
  const previewMessage = [
    buildPreview(candidates, config.origin),
    "",
    "Use only your own account and only files you are authorized to access.",
    "Query strings, fragments and signed parameters are intentionally hidden.",
    "Cancel now in the next prompt, or cancel later with academiPackDownloader.cancel()."
  ].join("\n");

  windowObject.console.log(previewMessage);
  windowObject.alert(previewMessage);

  return windowObject.confirm(
    "This tool will only attempt same-origin downloads that are visibly linked on the current page.\n" +
    "Do not continue unless you are authorized to access and copy these files.\n\n" +
    "Continue?"
  );
}

function evaluateResponseStatus(response, state) {
  if (response.status === 401) {
    throw new StopProcessError("authentication-required", "authentication required");
  }

  if (response.status === 403) {
    throw new StopProcessError("forbidden", "access denied by the server");
  }

  if (response.status === 429) {
    throw new StopProcessError("rate-limited", "server is rate limiting requests");
  }

  if (response.status === 404) {
    state.repeatedServerErrors = 0;
    state.logger.warn("Skipping missing resource.");
    return "skip";
  }

  if (response.status >= 500) {
    state.repeatedServerErrors += 1;
    if (state.repeatedServerErrors >= REPEATED_SERVER_ERROR_LIMIT) {
      throw new StopProcessError("server-error", "server returned repeated 5xx responses");
    }
    return "retry";
  }

  state.repeatedServerErrors = 0;

  if (!response.ok) {
    state.logger.warn(`Skipping HTTP ${response.status}.`);
    return "skip";
  }

  return "continue";
}

async function fetchWithLimitedRetry(windowObject, url, config, state) {
  const retryDelayMs = clampDelayMs(config.delayMs);

  for (;;) {
    const response = await windowObject.fetch(url.href, createFetchOptions());
    const statusResult = evaluateResponseStatus(response, state);

    if (statusResult !== "retry") {
      return { response, statusResult };
    }

    state.logger.warn(`Retrying once after a same-origin server error for ${redactUrl(url)}.`);
    await sleep(windowObject, retryDelayMs);
  }
}

function detectLoginPage(documentObject) {
  return Boolean(documentObject.querySelector("input[type=\"password\"]"));
}

function applyPlatformAdapter(url, adapter) {
  if (
    !adapter ||
    !adapter.enabled ||
    !adapter.searchParamName ||
    !(adapter.pathPattern instanceof RegExp) ||
    !adapter.pathPattern.test(url.pathname)
  ) {
    return new URL(url.href);
  }

  const adaptedUrl = new URL(url.href);
  adaptedUrl.searchParams.set(adapter.searchParamName, adapter.searchParamValue || "1");
  return adaptedUrl;
}

async function resolveDownloadTarget(windowObject, candidate, config, state) {
  assertNotCancelled(state);

  if (!config.resolveIntermediatePages || config.extensionPattern.test(candidate.url.pathname)) {
    return { label: candidate.label, url: applyPlatformAdapter(candidate.url, config.platformAdapter) };
  }

  const { response, statusResult } = await fetchWithLimitedRetry(windowObject, candidate.url, config, state);

  if (statusResult === "skip") {
    return null;
  }

  const finalUrl = normalizeUrl(response.url, candidate.url.href);

  if (!finalUrl || !isAllowedProtocol(finalUrl) || !isSameOrigin(finalUrl, config.origin)) {
    throw new StopProcessError("cross-origin-redirect", "blocked a cross-origin redirect");
  }

  const contentType = response.headers.get("content-type") || "";

  if (!isHtmlContentType(contentType)) {
    if (!isAllowedDownloadUrl(finalUrl, config)) {
      return null;
    }
    return { label: candidate.label, url: applyPlatformAdapter(finalUrl, config.platformAdapter) };
  }

  const html = await response.text();
  const parsedDocument = new windowObject.DOMParser().parseFromString(html, "text/html");

  if (detectLoginPage(parsedDocument)) {
    throw new StopProcessError("authentication-required", "authentication required");
  }

  const resolvedCandidates = collectAllowedCandidates(parsedDocument, config, {
    allowAnyVisibleContainer: true,
    baseUrl: finalUrl.href,
    containerSelector: config.activitySelector
  });

  return resolvedCandidates.length
    ? {
        label: resolvedCandidates[0].label,
        url: applyPlatformAdapter(resolvedCandidates[0].url, config.platformAdapter)
      }
    : null;
}

function triggerDownload(windowObject, resolvedCandidate) {
  const anchor = windowObject.document.createElement("a");
  anchor.href = resolvedCandidate.url.href;
  anchor.download = "";
  anchor.referrerPolicy = "no-referrer";
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  windowObject.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function sleep(windowObject, delayMs) {
  return new Promise((resolve) => windowObject.setTimeout(resolve, delayMs));
}

async function runDownloader(windowObject, overrides = {}) {
  const config = createDefaultConfig(windowObject, overrides);
  const state = createState(windowObject);
  const delayMs = clampDelayMs(config.delayMs);

  exposeCancellation(windowObject, state);

  const candidates = collectAllowedCandidates(windowObject.document, config);

  if (!candidates.length) {
    windowObject.alert(
      "No allowed downloadable files were found.\n\n" +
      "The tool only accepts same-origin files that are visibly linked inside allowed activity containers."
    );
    return { status: "no-files" };
  }

  let downloadedCount = 0;

  try {
    enforceFileCount(candidates, config);

    if (!showPreviewAndConfirm(windowObject, candidates, config)) {
      windowObject.alert("Download cancelled before any request was made.");
      return { status: "cancelled-before-start" };
    }

    for (let index = 0; index < candidates.length; index += 1) {
      assertNotCancelled(state);

      const candidate = candidates[index];
      state.logger.log(`[${index + 1}/${candidates.length}] Preparing ${candidate.label} (${redactUrl(candidate.url)})`);

      const resolvedCandidate = await resolveDownloadTarget(windowObject, candidate, config, state);

      if (!resolvedCandidate) {
        state.logger.log(`[${index + 1}/${candidates.length}] Skipped.`);
        continue;
      }

      triggerDownload(windowObject, resolvedCandidate);
      downloadedCount += 1;
      state.logger.log(`[${index + 1}/${candidates.length}] Download triggered.`);

      if (index < candidates.length - 1) {
        await sleep(windowObject, computeDelayMs(delayMs));
      }
    }
  } catch (error) {
    if (error instanceof StopProcessError) {
      windowObject.alert(`Stopped: ${error.message}`);
      return { downloadedCount, reason: error.code, status: "stopped" };
    }
    throw error;
  }

  windowObject.alert(`Finished. Attempted ${downloadedCount} download(s) from ${candidates.length} detected item(s).`);
  return { downloadedCount, status: "completed" };
}

module.exports = {
  DEFAULT_ACTIVITY_SELECTORS,
  DEFAULT_EXCLUDE_PATTERNS,
  DEFAULT_EXTENSION_PATTERN,
  DEFAULT_INCLUDE_PATTERNS,
  StopProcessError,
  collectAllowedCandidates,
  createDefaultConfig,
  detectLoginPage,
  enforceFileCount,
  evaluateResponseStatus,
  resolveDownloadTarget,
  runDownloader
};

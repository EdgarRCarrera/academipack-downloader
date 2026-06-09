"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

const {
  MAX_FILES,
  MIN_DELAY_MS,
  clampDelayMs,
  clampMaxFiles,
  computeDelayMs,
  createFetchOptions,
  inferDocumentType,
  isAllowedDownloadUrl,
  isAllowedProtocol,
  isInsideAllowedActivityContainer,
  normalizeUrl,
  redactUrl
} = require("../src/core");

function createOptions() {
  return {
    excludePatterns: [],
    extensionPattern: /\.pdf$/i,
    includePatterns: [],
    origin: "https://campus.example.edu"
  };
}

test("accepts a same-origin HTTPS URL", () => {
  const url = normalizeUrl("https://campus.example.edu/files/lesson.pdf");
  assert.equal(isAllowedProtocol(url), true);
  assert.equal(isAllowedDownloadUrl(url, createOptions()), true);
});

test("rejects external URLs", () => {
  const url = normalizeUrl("https://cdn.example.net/files/lesson.pdf");
  assert.equal(isAllowedDownloadUrl(url, createOptions()), false);
});

test("rejects javascript URLs", () => {
  const url = normalizeUrl("javascript:alert(1)", "https://campus.example.edu/course");
  assert.equal(isAllowedProtocol(url), false);
});

test("rejects data URLs", () => {
  const url = normalizeUrl("data:text/plain,hello", "https://campus.example.edu/course");
  assert.equal(isAllowedProtocol(url), false);
});

test("rejects file URLs", () => {
  const url = normalizeUrl("file:///tmp/lesson.pdf", "https://campus.example.edu/course");
  assert.equal(isAllowedProtocol(url), false);
});

test("rejects blob URLs", () => {
  const url = normalizeUrl("blob:https://campus.example.edu/lesson", "https://campus.example.edu/course");
  assert.equal(isAllowedProtocol(url), false);
});

test("rejects ftp URLs", () => {
  const url = normalizeUrl("ftp://campus.example.edu/lesson.pdf", "https://campus.example.edu/course");
  assert.equal(isAllowedProtocol(url), false);
});

test("redactUrl removes query strings", () => {
  const url = normalizeUrl("https://campus.example.edu/files/lesson.pdf?token=abc");
  assert.equal(redactUrl(url), "https://campus.example.edu/files/lesson.pdf");
});

test("redactUrl removes hashes", () => {
  const url = normalizeUrl("https://campus.example.edu/files/lesson.pdf#signed");
  assert.equal(redactUrl(url), "https://campus.example.edu/files/lesson.pdf");
});

test("fetch options never use credentials include", () => {
  assert.notEqual(createFetchOptions().credentials, "include");
});

test("fetch options use credentials same-origin", () => {
  assert.equal(createFetchOptions().credentials, "same-origin");
});

test("only accepts anchors inside allowed activity containers", () => {
  const dom = new JSDOM(`
    <div class="activityname"><a href="/files/lesson.pdf">Lesson</a></div>
    <div><a href="/files/other.pdf">Other</a></div>
  `);

  const allowedAnchor = dom.window.document.querySelector(".activityname a");
  const deniedAnchor = dom.window.document.querySelector("div:not(.activityname) a");

  assert.equal(isInsideAllowedActivityContainer(allowedAnchor, ".activityname"), true);
  assert.equal(isInsideAllowedActivityContainer(deniedAnchor, ".activityname"), false);
});

test("excludes hidden anchors", () => {
  const dom = new JSDOM(`<div class="activityname" hidden><a href="/files/a.pdf">A</a></div>`);
  const anchor = dom.window.document.querySelector("a");
  assert.equal(isInsideAllowedActivityContainer(anchor, ".activityname"), false);
});

test("excludes aria-hidden anchors", () => {
  const dom = new JSDOM(`<div class="activityname" aria-hidden="true"><a href="/files/a.pdf">A</a></div>`);
  const anchor = dom.window.document.querySelector("a");
  assert.equal(isInsideAllowedActivityContainer(anchor, ".activityname"), false);
});

test("excludes script anchors", () => {
  const dom = new JSDOM(`<script><a href="/files/a.pdf">A</a></script>`);
  const anchor = dom.window.document.querySelector("a");
  assert.equal(isInsideAllowedActivityContainer(anchor, ".activityname"), false);
});

test("excludes template anchors", () => {
  const dom = new JSDOM(`<template><a href="/files/a.pdf">A</a></template>`);
  const anchor = dom.window.document.querySelector("a");
  assert.equal(isInsideAllowedActivityContainer(anchor, ".activityname"), false);
});

test("excludes noscript anchors", () => {
  const dom = new JSDOM(`<noscript><a href="/files/a.pdf">A</a></noscript>`);
  const anchor = dom.window.document.querySelector("a");
  assert.equal(isInsideAllowedActivityContainer(anchor, ".activityname"), false);
});

test("document type preview is inferred when possible", () => {
  const url = normalizeUrl("https://campus.example.edu/files/lesson.pdf");
  assert.equal(inferDocumentType(url, "Lesson"), "PDF");
});

test("delay is clamped to the minimum", () => {
  assert.equal(clampDelayMs(100), MIN_DELAY_MS);
  assert.ok(computeDelayMs(100, () => 0) >= MIN_DELAY_MS);
});

test("max files are clamped safely", () => {
  assert.equal(clampMaxFiles(999), MAX_FILES);
});

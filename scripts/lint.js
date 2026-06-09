"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { listRepositoryJavaScriptFiles } = require("../src/core");

const projectRoot = path.resolve(__dirname, "..");
const files = listRepositoryJavaScriptFiles(projectRoot);
let hasFailures = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    hasFailures = true;
    process.stderr.write(result.stderr || result.stdout);
  }
}

if (hasFailures) {
  process.exitCode = 1;
}

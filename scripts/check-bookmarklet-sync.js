"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { renderOutputs } = require("./build");

const projectRoot = path.resolve(__dirname, "..");

async function main() {
  const outputs = await renderOutputs();
  let hasMismatch = false;

  for (const [outputPath, expectedContents] of Object.entries(outputs)) {
    const currentContents = fs.readFileSync(outputPath, "utf8");
    if (currentContents !== expectedContents) {
      console.error(`Outdated generated artifact: ${path.relative(projectRoot, outputPath)}`);
      hasMismatch = true;
    }
  }

  if (hasMismatch) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

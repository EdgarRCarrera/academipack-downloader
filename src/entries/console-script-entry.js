"use strict";

const { runDownloader } = require("../runtime");

runDownloader(window, {
  modeName: "console",
  resolveIntermediatePages: true
});

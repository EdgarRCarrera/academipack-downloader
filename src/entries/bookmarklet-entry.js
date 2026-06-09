"use strict";

const { runDownloader } = require("../runtime");

runDownloader(window, {
  modeName: "bookmarklet",
  resolveIntermediatePages: false
});

const path = require("path");
const esbuild = require("esbuild");

const entry = path.resolve(__dirname, "screenshot-manager.js");
const outfile = path.resolve(__dirname, "../../dist/screenshot.bundle.js");

esbuild
  .build({
    entryPoints: [entry],
    bundle: true,
    outfile: outfile,
    minify: true,
  })
  .catch((err) => {
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  });

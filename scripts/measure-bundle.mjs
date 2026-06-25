import { build } from "tsup";
import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function gzip9(buf) {
  return zlib.gzipSync(buf, { level: 9 }).length;
}

function report(label, file) {
  const buf = fs.readFileSync(file);
  const gz = gzip9(buf);
  console.log(label);
  console.log(`  minified: ${buf.length} bytes (${(buf.length / 1024).toFixed(2)} KB)`);
  console.log(`  gzip-9:   ${gz} bytes (${(gz / 1024).toFixed(2)} KB)`);
}

await build({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: false,
  sourcemap: false,
  clean: true,
  target: "es2022",
  minify: true,
  splitting: true,
  treeshake: true,
  outDir: "dist-min",
});

console.log("=== Published-style ESM (tsup, max minify, deps external) ===");
const esmChunks = fs.readdirSync("dist-min").filter((f) => f.endsWith(".js"));
let esmTotal = 0;
let esmGz = 0;
for (const f of esmChunks) {
  const buf = fs.readFileSync(path.join("dist-min", f));
  const gz = gzip9(buf);
  esmTotal += buf.length;
  esmGz += gz;
  console.log(`  ${f}: min ${buf.length}, gzip ${gz}`);
}
console.log(`  TOTAL ESM chunks: min ${esmTotal}, gzip ${esmGz} (${(esmGz / 1024).toFixed(2)} KB)`);
report("ESM entry (index.js)", "dist-min/index.js");
report("CJS entry (index.cjs)", "dist-min/index.cjs");

console.log("\n=== Consumer SPA bundle (esbuild, IdrClient only, deps inlined) ===");
await esbuild.build({
  stdin: {
    contents: `import { IdrClient } from "./src/index.ts"; export const client = IdrClient.forService("ollama");`,
    resolveDir: process.cwd(),
    sourcefile: "entry.ts",
  },
  outfile: "dist-measure/consumer-idrclient.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "none",
  treeShaking: true,
  drop: ["console", "debugger"],
});
report("IdrClient consumer bundle", "dist-measure/consumer-idrclient.js");

console.log("\n=== Consumer SPA bundle (full public API) ===");
await esbuild.build({
  stdin: {
    contents: `import { IdrClient, mountAuthPanel, registerAuthPanelElement } from "./src/index.ts"; export { IdrClient, mountAuthPanel, registerAuthPanelElement };`,
    resolveDir: process.cwd(),
    sourcefile: "entry-full.ts",
  },
  outfile: "dist-measure/consumer-full.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "none",
  treeShaking: true,
  drop: ["console", "debugger"],
});
report("Full public API consumer bundle", "dist-measure/consumer-full.js");

console.log("\n=== Consumer bundle from published dist-min (Web Crypto, no deps) ===");
await esbuild.build({
  stdin: {
    contents: `import { IdrClient } from "./dist-min/index.js"; export const client = IdrClient.forService("ollama");`,
    resolveDir: process.cwd(),
    sourcefile: "entry-from-dist.ts",
  },
  outfile: "dist-measure/from-dist.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "none",
  treeShaking: true,
  drop: ["console", "debugger"],
});
report("From dist-min/index.js (typical npm consumer)", "dist-measure/from-dist.js");

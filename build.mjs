// Builds the DeepAffex scan module and copies the SDK's runtime assets into public/.
// The NuraLogix SDK is proprietary: it is installed from npm at build time and never committed.
import { build } from "esbuild";
import { cpSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname);
const sdk = path.join(root, "node_modules/@nuralogix.ai/anura-web-core-sdk/lib");
if (!existsSync(sdk)) throw new Error("Run npm install first: @nuralogix.ai/anura-web-core-sdk is missing");

rmSync(path.join(root, "public/dfx-assets"), { recursive: true, force: true });
cpSync(path.join(sdk, "assets"), path.join(root, "public/dfx-assets"), { recursive: true });

// Tavus talking avatar (bundles the Daily call library)
await build({
  entryPoints: [path.join(root, "client/tavus.js")],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  outfile: path.join(root, "public/tavus.js"),
  logLevel: "warning",
  legalComments: "none",
});

// OpenAI GPT-Live voice (no dependencies)
await build({ entryPoints: [path.join(root, "client/live.js")], bundle: true, format: "esm", target: "es2022", minify: true, outfile: path.join(root, "public/live.js"), logLevel: "warning", legalComments: "none" });

await build({
  entryPoints: [path.join(root, "client/dfx-scan.js")],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  outfile: path.join(root, "public/dfx-scan.js"),
  logLevel: "warning",
  legalComments: "none",
});
console.log("built public/dfx-scan.js, public/tavus.js, public/live.js and public/dfx-assets/");

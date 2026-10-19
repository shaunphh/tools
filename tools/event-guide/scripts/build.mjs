import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

import { createHash } from "node:crypto";
import { buildSync } from "esbuild";

const output = new URL("../dist/", import.meta.url);
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

// The GX master, assets/fonts/BarlowGX.ttf, is only the source the two width-pinned instances
// are cut from (notes/event-guide.md): the page never loads it, so it stays out of dist.
const shipped = (file) => !file.endsWith("/BarlowGX.ttf");

for (const path of ["index.html", "styles.css", "assets", "vendor"]) {
  const source = new URL(`../${path}`, import.meta.url);
  if (!existsSync(source)) continue;
  cpSync(source, new URL(path, output), { recursive: true, filter: shipped });
}

// Version changed code and styles so a reload never mixes a new page with cached old controls.
const fingerprint = (contents) => createHash("sha256").update(contents).digest("hex").slice(0, 12);
const script = buildSync({
  entryPoints: [new URL("../app.js", import.meta.url).pathname],
  bundle: true,
  format: "esm",
  write: false,
  outfile: "app.js",
}).outputFiles[0].contents;
const scriptName = `app.${fingerprint(script)}.js`;
writeFileSync(new URL(scriptName, output), script);
let html = readFileSync(new URL("index.html", output), "utf8").replace('src="app.js"', `src="${scriptName}"`);
html = html.replace(/href="((?:vendor\/)?[^"?]+\.css)"/g, (attribute, path) => {
  const original = new URL(path, output);
  if (!existsSync(original)) return attribute;
  const contents = readFileSync(original);
  const versioned = path.replace(/\.css$/, `.${fingerprint(contents)}.css`);
  writeFileSync(new URL(versioned, output), contents);
  return `href="${versioned}"`;
});
writeFileSync(new URL("index.html", output), html);

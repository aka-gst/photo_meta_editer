import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const entrypoints = ["PhotoDate.html", "start.html", "public/PhotoDate.html"];

for (const entrypoint of entrypoints) {
  const html = await readFile(new URL(`../${entrypoint}`, import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0, `${entrypoint}: inline application scripts are missing`);
  scripts.forEach((match, index) => new vm.Script(match[1], { filename: `${entrypoint}#script-${index + 1}` }));
  assert.match(html, /Multi Photo Change Date/);
  assert.match(html, /showDirectoryPicker/);
  assert.match(html, /36867/);
  assert.match(html, /undoHistory/);
  assert.match(html, /removeEntry\(item\.name\)/);
  console.log(`✓ ${entrypoint}`);
}

console.log("Standalone entrypoints are structurally valid.");

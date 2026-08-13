import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readApp = () => readFile(new URL("../start.html", import.meta.url), "utf8");

test("ships as a self-contained HTML application", async () => {
  const html = await readApp();
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<style>[\s\S]*<\/style>/i);
  assert.match(html, /<script>[\s\S]*<\/script>/i);
  assert.doesNotMatch(html, /<script[^>]+src=/i);
});

test("contains the core batch-editing workflow", async () => {
  const html = await readApp();
  for (const capability of ["showDirectoryPicker", "webkitdirectory", "patchVideo", "undoHistory", "movingPhotoIds", "refreshCurrentFolderDates"])
    assert.ok(html.includes(capability), `Missing capability: ${capability}`);
});

test("guards destructive operations", async () => {
  const html = await readApp();
  assert.match(html, /confirm\(`/);
  assert.match(html, /getFileHandle\(item\.name\)/);
  assert.match(html, /removeEntry\(item\.name\)/);
  assert.match(html, /Ошибка перемещения/);
});

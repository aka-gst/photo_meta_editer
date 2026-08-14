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

test("offers a visible select-all-photos action", async () => {
  const html = await readApp();
  assert.match(html, /id="all">✓ Выбрать все фото/);
  assert.match(html, /view\(\)\.forEach\(x=>x\.selected=true\)/);
});

test("supports dragging photos and folders from Finder", async () => {
  const html = await readApp();
  assert.match(html, /getAsFileSystemHandle/);
  assert.match(html, /Отпустите фото или папку/);
  assert.match(html, /application\/x-photo-meta-ids/);
  assert.match(html, /requestAllHandles/);
  assert.match(html, /Временные файлы/);
});

test("explains whether saving changes originals or creates copies", async () => {
  const html = await readApp();
  for (const label of ["Обновить оригиналы", "Сохранить новые файлы", "Скачать новые файлы"])
    assert.ok(html.includes(label), `Missing save-mode label: ${label}`);
  assert.match(html, /selected\.every\(item=>item\.handle\)/);
  assert.match(html, /downloadSelectedCopies/);
  assert.match(html, /Оригиналы не изменены/);
  assert.match(html, /Дата съёмки записана и повторно проверена/);
  assert.match(html, /item\.handle\.getFile\(\),writtenDate=await readEmbeddedPhotoDate/);
  assert.match(html, /readEntry\(exifIfd,36867\)/);
  assert.match(html, /directWriteSupported=window\.isSecureContext/);
  assert.match(html, /Недоступно по обычному HTTP/);
  assert.match(html, /selected\.forEach\(item=>\{item\.selected=false\}\)/);
  assert.match(html, /dateSource==='embedded'/);
  assert.match(html, /EXIF проверен/);
  assert.match(html, /Даты «Создан» и «Изменён» в Finder будут сегодняшними/);
  assert.match(html, /showMobileSaveQueue/);
  assert.match(html, /сохраните их по одному/);
  assert.match(html, /mobileSaveNext/);
  assert.match(html, /nextFileIndex\+1/);
  assert.match(html, /some iOS versions never resolve share/);
  assert.match(html, /Открыть меню/);
  assert.doesNotMatch(html, /saveFile\.textContent='Сохранить'/);
  assert.match(html, /downloadPreparedFile/);
  assert.match(html, /update-action-wrap\[hidden\]\{display:none\}/);
  assert.match(html, /save-group #download\{display:block;width:100%/);
  assert.match(html, /layout\.classList\.toggle\('is-empty',!P\.length\)/);
  assert.match(html, /\.layout\.is-empty\{height:230px\}/);
  assert.match(html, /intervalInput\.value==='0'/);
  assert.match(html, /Новая дата применена к выбранным/);
  assert.match(html, /Оригиналы недоступны для записи/);
  assert.match(html, /date\.addEventListener\('input',enableApplyAfterDateChange\)/);
  assert.match(html, /scrollIntoView/);
  assert.match(html, /Сохраните подготовленные файлы/);
  assert.match(html, /scrollRestoration='manual'/);
  assert.match(html, /addEventListener\('pageshow'/);
  assert.match(html, /height:max\(620px,calc\(100vh - 350px\)\)/);
  assert.match(html, /body\{height:100dvh;overflow:hidden\}/);
  assert.match(html, /\.layout\{height:auto;min-height:0;max-height:none;flex:1 1 auto\}/);
});

test("guards destructive operations", async () => {
  const html = await readApp();
  assert.match(html, /confirm\(`/);
  assert.match(html, /getFileHandle\(item\.name\)/);
  assert.match(html, /removeEntry\(item\.name\)/);
  assert.match(html, /Ошибка перемещения/);
});

test("keeps three undo actions only for writable originals", async () => {
  const html = await readApp();
  assert.match(html, /undoButton\.hidden=mobile/);
  assert.match(html, /undoHistory\.length>3/);
  assert.match(html, /selected\.every\(item=>item\.handle\)/);
  assert.match(html, /Отменить действие/);
  assert.match(html, /\$\('#download'\)\.before\(undoButton\)/);
});

test("loads large Windows folders in memory-safe batches", async () => {
  const html = await readApp();
  assert.match(html, /windowsDesktop=\/Windows\/i\.test\(navigator\.userAgent\)/);
  assert.match(html, /SAFE_INITIAL_BATCH=windowsDesktop\?4:60/);
  assert.match(html, /SAFE_BATCH_INCREMENT=windowsDesktop\?4:30/);
  assert.match(html, /Math\.min\(2,items\.length\)/);
  assert.match(html, /view\(\)\.slice\(0,limit\)\.filter/);
  assert.match(html, /event\.stopPropagation\(\)/);
  assert.match(html, /useModernDrop\?\[\]:transferItems\.map/);
  assert.match(html, /useModernDrop\?await DropImportCore\.requestAllHandles\(transferItems\):\[\]/);
});

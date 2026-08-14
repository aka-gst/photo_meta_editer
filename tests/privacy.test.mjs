import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root=path.resolve(import.meta.dirname,'..');
const sourceHtml=fs.readFileSync(path.join(root,'src/standalone/index.html'),'utf8');
const scriptDir=path.join(root,'src/standalone/scripts');
const applicationCode=fs.readdirSync(scriptDir)
  .filter(name=>name.endsWith('.js'))
  .map(name=>fs.readFileSync(path.join(scriptDir,name),'utf8'))
  .join('\n');

test('blocks all runtime network connections and external resources',()=>{
  assert.match(sourceHtml,/Content-Security-Policy/);
  assert.match(sourceHtml,/default-src 'none'/);
  assert.match(sourceHtml,/connect-src 'none'/);
  assert.match(sourceHtml,/img-src blob: data:/);
  assert.match(sourceHtml,/media-src blob: data:/);
});

test('contains no application API that can upload media',()=>{
  for(const forbidden of [
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bWebSocket\s*\(/,
    /\bsendBeacon\s*\(/,
  ])assert.doesNotMatch(applicationCode,forbidden);
});

test('states the local-only behavior in the visible interface',()=>{
  assert.match(sourceHtml,/не покидают ваше устройство/);
  assert.match(sourceHtml,/Обработка только на устройстве/);
});

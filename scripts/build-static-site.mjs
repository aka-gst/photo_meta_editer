import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(root,'public/PhotoDate.html'),'utf8');
const worker=`const PAGE=${JSON.stringify(html)};\nexport default {async fetch(request){const url=new URL(request.url);if(url.pathname!==\"/\"&&url.pathname!==\"/PhotoDate.html\")return new Response(\"Not found\",{status:404});return new Response(PAGE,{headers:{\"content-type\":\"text/html; charset=utf-8\",\"cache-control\":\"no-store\",\"x-content-type-options\":\"nosniff\"}})}};\n`;
const serverDir=path.join(root,'dist/server'),metadataDir=path.join(root,'dist/.openai');
fs.mkdirSync(serverDir,{recursive:true});fs.mkdirSync(metadataDir,{recursive:true});
fs.writeFileSync(path.join(serverDir,'index.js'),worker);
fs.copyFileSync(path.join(root,'.openai/hosting.json'),path.join(metadataDir,'hosting.json'));
console.log('Built private static PhotoDate site');

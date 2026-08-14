import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source=await readFile(new URL("../src/standalone/scripts/03-drop-import-core.js",import.meta.url),"utf8");
const context={};
vm.createContext(context);
vm.runInContext(source,context,{filename:"03-drop-import-core.js"});
const core=context.DropImportCore;

test("requests every macOS drop handle before the transfer expires",async()=>{
  let sourceOpen=true,calls=0;
  const items=Array.from({length:3},(_,index)=>({
    getAsFileSystemHandle(){
      assert.equal(sourceOpen,true,"handle was requested after DataTransfer expired");
      calls++;
      return Promise.resolve({kind:"file",name:`photo-${index+1}.jpg`});
    }
  }));
  queueMicrotask(()=>{sourceOpen=false});
  const handles=await core.requestAllHandles(items);
  assert.equal(calls,3);
  assert.deepEqual(Array.from(handles,handle=>handle.name),["photo-1.jpg","photo-2.jpg","photo-3.jpg"]);
});

test("keeps all unique dropped files and removes duplicate handle copies",()=>{
  const first={name:"one.jpg",size:100,lastModified:1};
  const second={name:"two.jpg",size:200,lastModified:2};
  const third={name:"three.jpg",size:300,lastModified:3};
  const files=core.mergeFiles([first,second,third],[{...first},{...second},{...third}]);
  assert.equal(files.length,3);
  assert.deepEqual(Array.from(files,file=>file.name),["one.jpg","two.jpg","three.jpg"]);
});

test("places only newly imported photos in the temporary folder",()=>{
  const existing={name:"existing.jpg",folder:"Открытая папка"};
  const imported=[{name:"one.jpg"},{name:"two.jpg"},{name:"three.jpg"}];
  const all=[existing,...imported];
  const result=core.placeInTemporaryFolder(all,1);
  assert.equal(existing.folder,"Открытая папка");
  assert.equal(result.count,3);
  assert.ok(imported.every(item=>item.folder==="Временные файлы"));
});

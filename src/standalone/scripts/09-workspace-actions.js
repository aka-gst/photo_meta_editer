const intervalInput=$('#step');
intervalInput.max='1000';
intervalInput.addEventListener('input',()=>{
  let value=Number(intervalInput.value);
  if(value>1000)intervalInput.value='1000';
  if(value<0)intervalInput.value='0';
});
intervalInput.addEventListener('focus',()=>{
  if(intervalInput.value==='0')intervalInput.value='';
});
intervalInput.addEventListener('blur',()=>{
  if(intervalInput.value==='')intervalInput.value='0';
});
const saveWithMobileCompletion=$('#save').onclick;
$('#save').onclick=async()=>{
  if(Number(intervalInput.value)>1000)intervalInput.value='1000';
  /* superseded save-result wrapper
  const noticeBefore=$('#notice').textContent;
  const noticeBefore=$('#notice').textContent;
  const noticeBefore=$('#notice').textContent;
  await saveWithMobileCompletion();
  const noticeAfter=$('#notice').textContent;
  const saveSucceeded=noticeAfter!==noticeBefore&&noticeAfter&&!/Ошибка|РћС€РёР±РєР°/.test(noticeAfter);
  if(saveSucceeded){P.forEach(item=>item.selected=false);render();updateSelection()}
  const noticeAfter=$('#notice').textContent;
  const saveSucceeded=noticeAfter!==noticeBefore&&noticeAfter&&!/Ошибка|РћС€РёР±РєР°/.test(noticeAfter);
  if(saveSucceeded){P.forEach(item=>item.selected=false);render();updateSelection()}
  const noticeAfter=$('#notice').textContent;
  const saved=noticeAfter!==noticeBefore&&noticeAfter&&!noticeAfter.startsWith('Ошибка');
  */
  const finalNoticeBefore=$('#notice').textContent;
  await saveWithMobileCompletion();
  const finalNoticeAfter=$('#notice').textContent;
  const saved=finalNoticeAfter!==finalNoticeBefore&&finalNoticeAfter&&!finalNoticeAfter.startsWith('\u041e\u0448\u0438\u0431\u043a\u0430');
  if(saved){
    P.forEach(item=>item.selected=false);
    render();updateSelection();
  }
  if(mobile&&saved&&!finalNoticeAfter.startsWith('Подготовлено')){
    $('#notice').className='notice show';
    $('#notice').textContent='Готово';
  }
};
async function readEmbeddedPhotoDate(file){
  if(!/\.jpe?g$/i.test(file.name)&&file.type!=='image/jpeg')return null;
  try{
    const bytes=new Uint8Array(await file.slice(0,524288).arrayBuffer());
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    for(let marker=2;marker+12<bytes.length&&bytes[marker]===255;){
      const type=bytes[marker+1];if(type===218||type===217)break;
      const length=(bytes[marker+2]<<8)+bytes[marker+3],end=marker+2+length;
      if(end>bytes.length||length<2)break;
      const isExif=type===225&&bytes[marker+4]===69&&bytes[marker+5]===120&&bytes[marker+6]===105&&bytes[marker+7]===102;
      if(isExif){
        const tiff=marker+10,little=bytes[tiff]===73;
        const u16=offset=>view.getUint16(offset,little),u32=offset=>view.getUint32(offset,little);
        const readEntry=(ifd,tag)=>{const count=u16(ifd);for(let index=0;index<count;index++){const entry=ifd+2+index*12;if(entry+12>end)break;if(u16(entry)!==tag)continue;const size=u32(entry+4),offset=size<=4?entry+8:tiff+u32(entry+8);if(offset+Math.min(size,19)>end)return null;return String.fromCharCode(...bytes.subarray(offset,offset+Math.min(size-1,19)))}return null};
        const ifd0=tiff+u32(tiff+4),entryCount=u16(ifd0);let exifIfd=null;
        for(let index=0;index<entryCount;index++){const entry=ifd0+2+index*12;if(entry+12>end)break;if(u16(entry)===34665){exifIfd=tiff+u32(entry+8);break}}
        const value=exifIfd&&readEntry(exifIfd,36867),match=value&&/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
        if(match){const [,year,month,day,hour,minute,second]=match.map(Number),dateValue=new Date(year,month-1,day,hour,minute,second);if(year>=1900&&month>=1&&month<=12&&day>=1&&day<=31&&!Number.isNaN(dateValue.getTime()))return dateValue}
      }
      marker=end;
    }
  }catch(error){}
  return null;
}
async function refreshCurrentFolderDates(){
  /* Read only the visible batch. Large Windows folders can otherwise crash the
     renderer while previews and EXIF chunks are allocated at the same time. */
  const items=view().slice(0,limit).filter(item=>!item.embeddedDateChecked);
  let next=0;
  async function worker(){
    while(next<items.length){
      const item=items[next++];
      const embedded=await readEmbeddedPhotoDate(item.file);
      if(embedded){item.date=embedded;item.dateSource='embedded'}
      else item.dateSource='file-modified';
      item.embeddedDateChecked=true;
    }
  }
  /* Two readers keep peak memory low when a Windows folder contains large
     phone/camera originals and Chrome already has many open tabs. */
  await Promise.all(Array.from({length:Math.min(2,items.length)},worker));
  if(items.length){const gallery=$('#gallery'),position=gallery.scrollTop;render();gallery.scrollTop=position}
}
const windowsDesktop=/Windows/i.test(navigator.userAgent);
const SAFE_INITIAL_BATCH=windowsDesktop?4:60,SAFE_BATCH_INCREMENT=windowsDesktop?4:30;
limit=SAFE_INITIAL_BATCH;
$('#gallery').onscroll=()=>{
  const gallery=$('#gallery');
  if(gallery.scrollTop+gallery.clientHeight>gallery.scrollHeight-350&&limit<view().length){
    const position=gallery.scrollTop;
    limit+=SAFE_BATCH_INCREMENT;render();gallery.scrollTop=position;
  }
};
/* Replace the original folder click (which requested 60 previews at once). */
$('#folders').addEventListener('click',event=>{
  const button=event.target.closest('.folder');if(!button)return;
  event.preventDefault();event.stopPropagation();
  const name=button.querySelector('b')?.textContent;
  folder=name==='Все файлы'?'*':name;
  limit=SAFE_INITIAL_BATCH;
  render();$('#gallery').scrollTop=0;refreshCurrentFolderDates();
},{capture:true});
let metadataRefreshScheduled=false;
new MutationObserver(()=>{
  if(metadataRefreshScheduled||!P.some(item=>!item.embeddedDateChecked))return;
  metadataRefreshScheduled=true;
  queueMicrotask(async()=>{
    try{await refreshCurrentFolderDates()}
    finally{metadataRefreshScheduled=false}
  });
}).observe($('#gallery'),{childList:true});
$('#folders').addEventListener('click',event=>{
  if(!event.target.closest('.folder'))return;
  const gallery=$('#gallery');
  gallery.scrollTop=0;
  requestAnimationFrame(()=>{gallery.scrollTop=0});
  refreshCurrentFolderDates();
});
const moveDirectoryHandles=new Map();
walk=async function(dir,path=''){
  const currentPath=path||dir.name;
  moveDirectoryHandles.set(currentPath,dir);
  for await(const [name,handle] of dir.entries()){
    if(handle.kind==='directory')await walk(handle,path?path+' / '+name:name);
    else if(accepted({name,type:''})){
      const file=await handle.getFile();
      P.push({id:crypto.randomUUID(),file,name,folder:currentPath,date:new Date(file.lastModified||Date.now()),selected:false,url:null,handle,sourceDirectoryHandle:dir});
    }
  }
};
const renderBeforeMove=render;
render=function(){
  renderBeforeMove();
  const visible=view().slice(0,limit),cards=$('#gallery').querySelectorAll('.card');
  cards.forEach((card,index)=>{
    const item=visible[index];
    if(!item)return;
    if(!mobile){
      card.draggable=true;
      card.dataset.photoId=item.id;
      card.title='Перетащите фото на папку слева';
    }
    const dateLabel=card.querySelector('.meta span');
    if(dateLabel&&item.embeddedDateChecked){
      const prefix=item.dateSource==='embedded'?'Снято':'Изменено';
      dateLabel.textContent=`${prefix} · ${fmt(item.date)}`;
      dateLabel.title=item.dateSource==='embedded'?'Дата съёмки из метаданных фото':'EXIF-дата отсутствует; показана дата изменения файла';
    }
  });
};
let movingPhotoIds=[];
$('#gallery').addEventListener('dragstart',event=>{
  if(mobile)return;
  const card=event.target.closest('.card');if(!card)return;
  const dragged=P.find(item=>item.id===card.dataset.photoId);if(!dragged)return;
  const group=dragged.selected?view().filter(item=>item.selected):[dragged];
  movingPhotoIds=group.map(item=>item.id);
  event.dataTransfer.effectAllowed='move';
  event.dataTransfer.setData('application/x-photo-meta-ids',movingPhotoIds.join(','));
  event.dataTransfer.setData('text/plain',`${group.length} photo files`);
  card.classList.add('dragging');
});
$('#gallery').addEventListener('dragend',()=>{
  movingPhotoIds=[];
  document.querySelectorAll('.folder.move-target').forEach(button=>button.classList.remove('move-target'));
  document.querySelectorAll('.card.dragging').forEach(card=>card.classList.remove('dragging'));
});
function moveTargetAt(event){
  const button=document.elementFromPoint(event.clientX,event.clientY)?.closest('.folder');
  if(!button)return null;
  const path=button.querySelector('b')?.textContent;
  return path&&moveDirectoryHandles.has(path)?{button,path,handle:moveDirectoryHandles.get(path)}:null;
}
window.addEventListener('dragover',event=>{
  if(!movingPhotoIds.length)return;
  document.querySelectorAll('.folder.move-target').forEach(button=>button.classList.remove('move-target'));
  const target=moveTargetAt(event);
  if(target){target.button.classList.add('move-target');event.dataTransfer.dropEffect='move'}
},{capture:true});
window.addEventListener('drop',async event=>{
  if(!movingPhotoIds.length)return;
  const ids=movingPhotoIds.slice();movingPhotoIds=[];
  document.querySelectorAll('.folder.move-target').forEach(button=>button.classList.remove('move-target'));
  const target=moveTargetAt(event);if(!target)return;
  event.preventDefault();
  const items=ids.map(id=>P.find(item=>item.id===id)).filter(item=>item&&item.folder!==target.path);
  if(!items.length)return;
  const word=items.length===1?'файл':'файлов';
  if(!confirm(`Переместить ${items.length} ${word} в папку «${target.path}»?`))return;
  try{
    const movingNames=new Set();
    for(const item of items){
      if(movingNames.has(item.name))throw Error(`Среди выбранных есть несколько файлов с именем ${item.name}`);
      movingNames.add(item.name);
      if(!item.sourceDirectoryHandle)throw Error(`Нет доступа к исходной папке файла ${item.name}`);
      try{await target.handle.getFileHandle(item.name);throw Error(`В папке «${target.path}» уже есть файл ${item.name}`)}catch(error){if(error.name!=='NotFoundError')throw error}
    }
    for(const item of items){
      if(!item.sourceDirectoryHandle)throw Error(`Нет доступа к исходной папке файла ${item.name}`);
      try{await target.handle.getFileHandle(item.name);throw Error(`В папке «${target.path}» уже есть файл ${item.name}`)}catch(error){if(error.name!=='NotFoundError')throw error}
      const newHandle=await target.handle.getFileHandle(item.name,{create:true});
      const writer=await newHandle.createWritable();await writer.write(item.file);await writer.close();
      await item.sourceDirectoryHandle.removeEntry(item.name);
      if(item.url){URL.revokeObjectURL(item.url);item.url=null}
      item.handle=newHandle;item.sourceDirectoryHandle=target.handle;item.folder=target.path;item.file=await newHandle.getFile();item.selected=false;
    }
    $('#notice').className='notice show';$('#notice').textContent=`Перемещено: ${items.length} ${word}`;
    render();updateSelection();
  }catch(error){
    $('#notice').className='notice show';$('#notice').textContent='Ошибка перемещения: '+error.message;
    render();updateSelection();
  }
},{capture:true});
const moveStyle=document.createElement('style');
moveStyle.textContent='.card[draggable=true]{cursor:grab}.card.dragging{opacity:.45}.folder.move-target{outline:2px solid var(--g);background:linear-gradient(90deg,#183a25,#302047)!important}';
document.head.append(moveStyle);
render();
const undoHistory=[];
const undoButton=document.createElement('button');
undoButton.id='undo';undoButton.textContent='↶ Отменить действие';undoButton.disabled=true;undoButton.hidden=mobile;
$('#download').before(undoButton);
function updateUndoButton(){
  undoButton.disabled=!undoHistory.length;
  undoButton.textContent=undoHistory.length?`↶ Отменить действие · ${undoHistory.length}`:'↶ Отменить действие';
  undoButton.title=undoHistory.length?`Сохранено действий: ${undoHistory.length} из 3`:'Нет действий для отмены';
}
function rememberUndo(action){undoHistory.push(action);if(undoHistory.length>3)undoHistory.shift();updateUndoButton()}
const applyBeforeUndo=$('#apply').onclick;
$('#apply').onclick=event=>{
  const selected=P.filter(item=>item.selected);
  const enteredYear=date.value.slice(0,4),enteredDate=new Date(date.value);
  if(enteredYear.length!==4||Number(enteredYear)>9999||Number.isNaN(enteredDate.getTime()))return applyBeforeUndo.call($('#apply'),event);
  selected.forEach(item=>{if(!item.savedDate)item.savedDate=new Date(item.date)});
  const result=applyBeforeUndo.call($('#apply'),event);
  if(selected.length){
    const originalsAvailable=selected.every(item=>item.handle);
    $('#apply').disabled=true;
    $('#notice').className='notice show save-result';
    $('#notice').innerHTML=originalsAvailable
      ? `<strong>Новая дата применена к выбранным: ${selected.length}</strong><span>Теперь можно скачать новые файлы или обновить выбранные оригиналы.</span>`
      : `<strong>Новая дата применена к выбранным: ${selected.length}</strong><span>Оригиналы недоступны для записи — скачайте новые файлы с изменённой датой.</span>`;
  }
  return result;
};
const enableApplyAfterDateChange=()=>{$('#apply').disabled=!P.some(item=>item.selected)};
date.addEventListener('input',enableApplyAfterDateChange);
intervalInput.addEventListener('input',enableApplyAfterDateChange);
const saveBeforeUndo=$('#save').onclick;
$('#save').onclick=async event=>{
  const selected=P.filter(item=>item.selected),canUndo=selected.length&&selected.every(item=>item.handle);
  const records=canUndo?selected.map(item=>({item,date:new Date(item.savedDate||item.date)})):[];
  let confirmed=false;const nativeConfirm=window.confirm;
  window.confirm=(...args)=>{const result=nativeConfirm.apply(window,args);if(result)confirmed=true;return result};
  try{await saveBeforeUndo.call($('#save'),event)}finally{window.confirm=nativeConfirm}
  const failed=$('#notice').textContent.startsWith('\u041e\u0448\u0438\u0431\u043a\u0430');
  if(confirmed&&records.length&&!failed){
    records.forEach(({item})=>{item.savedDate=new Date(item.date);item.selected=false});
    rememberUndo({type:'dates',records});render();updateSelection();
  }
};
let pendingMoveUndo=null;
$('#gallery').addEventListener('dragstart',()=>{
  queueMicrotask(()=>{pendingMoveUndo=movingPhotoIds.map(id=>P.find(item=>item.id===id)).filter(Boolean).map(item=>({item,folder:item.folder,directory:item.sourceDirectoryHandle}))});
});
window.addEventListener('drop',()=>{
  if(!pendingMoveUndo?.length)return;
  const records=pendingMoveUndo;pendingMoveUndo=null;let attempts=0;
  const detectMove=()=>{
    const moved=records.filter(record=>record.item.folder!==record.folder);
    const finished=moved.length===records.length||$('#notice').textContent.startsWith('\u041e\u0448\u0431\u043a\u0430');
    if(finished){if(moved.length)rememberUndo({type:'move',records:moved});return}
    if(++attempts<600)setTimeout(detectMove,100);
  };
  setTimeout(detectMove,100);
},{capture:true});
async function undoDates(action){
  for(const record of action.records){
    const {item}=record;if(!item.handle)throw Error(`Нет доступа к оригиналу ${item.name}`);
    item.date=new Date(record.date);const blob=await changed(item),writer=await item.handle.createWritable();
    await writer.write(blob);await writer.close();
    if(item.url){URL.revokeObjectURL(item.url);item.url=null}item.file=await item.handle.getFile();item.savedDate=new Date(record.date);item.selected=false;
  }
}
async function undoMove(action){
  for(const {item,directory} of action.records){
    if(!directory||!item.sourceDirectoryHandle)throw Error(`Нет доступа к папке файла ${item.name}`);
    try{await directory.getFileHandle(item.name);throw Error(`В исходной папке уже есть файл ${item.name}`)}catch(error){if(error.name!=='NotFoundError')throw error}
  }
  for(const record of action.records){
    const {item,directory,folder:oldFolder}=record,currentDirectory=item.sourceDirectoryHandle;
    const oldHandle=await directory.getFileHandle(item.name,{create:true}),writer=await oldHandle.createWritable();
    await writer.write(item.file);await writer.close();await currentDirectory.removeEntry(item.name);
    if(item.url){URL.revokeObjectURL(item.url);item.url=null}
    item.handle=oldHandle;item.sourceDirectoryHandle=directory;item.folder=oldFolder;item.file=await oldHandle.getFile();item.selected=false;
  }
}
undoButton.onclick=async()=>{
  const action=undoHistory.at(-1);if(!action)return;
  const label=action.type==='dates'?'вернуть прежние даты':'вернуть файлы в прошлую папку';
  if(!confirm(`Вы уверены, что хотите ${label} для ${action.records.length} файлов?`))return;
  undoButton.disabled=true;
  try{
    if(action.type==='dates')await undoDates(action);else await undoMove(action);
    undoHistory.pop();$('#notice').className='notice show';$('#notice').textContent=`Действие отменено: ${action.records.length} файлов`;render();updateSelection();
  }catch(error){$('#notice').className='notice show';$('#notice').textContent='Ошибка возврата: '+error.message}
  updateUndoButton();
};
$('#viewer').addEventListener('click',()=>{
  $('#viewer').classList.remove('show');
  $('#viewer div').innerHTML='';
});

/* Import files and folders dragged from Finder without navigating away from the app. */
const dropOverlay=document.createElement('div');
dropOverlay.className='drop-overlay';
dropOverlay.innerHTML='<div><b>Отпустите фото или папку</b><span>Файлы останутся на этом устройстве</span></div>';
document.body.append(dropOverlay);

let externalDragDepth=0;
const isInternalPhotoDrag=event=>Array.from(event.dataTransfer?.types||[]).includes('application/x-photo-meta-ids');

function readLegacyDirectory(reader){
  return new Promise((resolve,reject)=>{
    const entries=[];
    const readBatch=()=>reader.readEntries(batch=>{
      if(!batch.length){resolve(entries);return}
      entries.push(...batch);readBatch();
    },reject);
    readBatch();
  });
}

async function importLegacyEntry(entry,path=''){
  if(entry.isDirectory){
    const nextPath=path?`${path} / ${entry.name}`:entry.name;
    const children=await readLegacyDirectory(entry.createReader());
    for(const child of children)await importLegacyEntry(child,nextPath);
    return;
  }
  if(!entry.isFile)return;
  const file=await new Promise((resolve,reject)=>entry.file(resolve,reject));
  if(!accepted(file))return;
  P.push({id:crypto.randomUUID(),file,name:file.name,folder:path||'Медиатека',date:new Date(file.lastModified||Date.now()),selected:false,url:null,handle:null});
}

window.addEventListener('dragenter',event=>{
  if(mobile||isInternalPhotoDrag(event))return;
  event.preventDefault();
  externalDragDepth++;
  dropOverlay.classList.add('show');
},{capture:true});

window.addEventListener('dragover',event=>{
  event.preventDefault();
  if(event.dataTransfer&&!isInternalPhotoDrag(event))event.dataTransfer.dropEffect='copy';
},{capture:true});

window.addEventListener('dragleave',event=>{
  if(mobile||isInternalPhotoDrag(event))return;
  externalDragDepth=Math.max(0,externalDragDepth-1);
  if(!externalDragDepth)dropOverlay.classList.remove('show');
},{capture:true});

window.addEventListener('drop',async event=>{
  dropOverlay.classList.remove('show');externalDragDepth=0;
  if(isInternalPhotoDrag(event))return;
  event.preventDefault();event.stopPropagation();
  if(mobile)return;

  const transferItems=Array.from(event.dataTransfer?.items||[]);
  /* Never invoke both directory APIs for the same DataTransferItem. Some Windows
     Chromium builds can crash the renderer when both handles are requested. */
  const useModernDrop=window.isSecureContext&&transferItems.some(item=>item.getAsFileSystemHandle);
  // Legacy entries must be captured synchronously before DataTransfer expires.
  const legacyEntries=useModernDrop?[]:transferItems.map(item=>item.webkitGetAsEntry?.()).filter(Boolean);
  try{
    const handles=useModernDrop?await DropImportCore.requestAllHandles(transferItems):[];

    const directories=handles.filter(handle=>handle.kind==='directory');
    if(directories.length){
      P.splice(0).forEach(item=>item.url&&URL.revokeObjectURL(item.url));
      for(const directory of directories){
        if(directory.requestPermission)await directory.requestPermission({mode:'readwrite'});
        await walk(directory,directory.name);
      }
      folder='*';limit=typeof SAFE_INITIAL_BATCH==='number'?SAFE_INITIAL_BATCH:4;
      $('#notice').className='notice show';
      $('#notice').textContent=`Добавлено из папки: ${P.length} файлов`;
      render();return;
    }

    const legacyDirectories=legacyEntries.filter(entry=>entry.isDirectory);
    if(legacyDirectories.length){
      P.splice(0).forEach(item=>item.url&&URL.revokeObjectURL(item.url));
      for(const directory of legacyDirectories)await importLegacyEntry(directory);
      folder='*';limit=typeof SAFE_INITIAL_BATCH==='number'?SAFE_INITIAL_BATCH:4;
      $('#notice').className='notice show';
      $('#notice').textContent=`Добавлено из папки: ${P.length} файлов`;
      render();return;
    }

    const transferredFiles=Array.from(event.dataTransfer?.files||[]);
    const handleFiles=await Promise.all(handles.filter(handle=>handle.kind==='file').map(handle=>handle.getFile()));
    const fileList=DropImportCore.mergeFiles(transferredFiles,handleFiles);
    const firstNewItem=P.length;
    const added=addFiles(fileList);
    if(added){
      const temporary=DropImportCore.placeInTemporaryFolder(P,firstNewItem);
      folder=temporary.folderName;
      render();
      $('#notice').className='notice show';
      $('#notice').textContent=`Во «Временные файлы» добавлено: ${added}`;
    }
    if(!added){
      $('#notice').className='notice show';
      $('#notice').textContent='Не найдено поддерживаемых фото или видео';
    }
  }catch(error){
    $('#notice').className='notice show';
    $('#notice').textContent='Не удалось добавить файлы: '+error.message;
  }
},{capture:true});

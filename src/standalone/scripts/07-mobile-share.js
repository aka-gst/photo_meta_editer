/* iPhone: передаём готовые файлы в системное меню «Поделиться» → «Сохранить изображения». */
const iosDevice=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return(crc^0xffffffff)>>>0}
function dosDateTime(date=new Date()){const year=Math.max(1980,date.getFullYear()),time=(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1),day=((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();return{time,day}}
async function makeZip(files){
  const encoder=new TextEncoder(),localParts=[],centralParts=[];let offset=0;
  for(const file of files){
    const name=encoder.encode(file.name),data=new Uint8Array(await file.arrayBuffer()),crc=crc32(data),{time,day}=dosDateTime();
    const local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x0800,true);lv.setUint16(10,time,true);lv.setUint16(12,day,true);lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,name.length,true);local.set(name,30);
    const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint16(12,time,true);cv.setUint16(14,day,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);central.set(name,46);
    localParts.push(local,data);centralParts.push(central);offset+=local.length+data.length;
  }
  const centralSize=centralParts.reduce((sum,part)=>sum+part.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
  return new Blob([...localParts,...centralParts,end],{type:'application/zip'});
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
const desktopSaveHandler=$('#save').onclick;
$('#save').onclick=async()=>{
  if(!mobile)return desktopSaveHandler();
  const items=P.filter(item=>item.selected);if(!items.length)return;
  const year=date.value.slice(0,4),base=new Date(date.value),interval=Number($('#step').value)||0;
  if(year.length!==4||Number(year)<1900||Number(year)>9999||Number.isNaN(base.getTime()))return alert('Укажите корректную дату.');
  if(!confirm(`Подготовить ${items.length} файлов для сохранения в медиатеку?`))return;
  items.forEach((item,index)=>item.date=new Date(base.getTime()+index*interval*60000));
  $('#save').disabled=true;$('#status').textContent='Подготавливаю файлы…';
  try{
    const shareFiles=[];
    for(const item of items){
      const blob=await changed(item),video=item.file.type.startsWith('video/')||/\.(mp4|mov|m4v)$/i.test(item.name),extension=video?(item.name.match(/\.[^.]+$/)?.[0]||'.mp4'):'.jpg';
      shareFiles.push(new File([blob],item.name.replace(/\.[^.]+$/,'')+'_new-date'+extension,{type:blob.type||item.file.type}));
    }
    for(const item of items){if(item.url){URL.revokeObjectURL(item.url);item.url=null}}
    render();
    if(shareFiles.length>1&&iosDevice){
      showMobileSaveQueue(shareFiles);
      $('#notice').className='notice show';
      $('#notice').textContent=`Подготовлено ${shareFiles.length} файлов — сохраните их по одному ниже`;
    }else if(shareFiles.length>1){
      const archive=await makeZip(shareFiles);downloadBlob(archive,`ФотоДата_${shareFiles.length}_файлов.zip`);
      $('#notice').className='notice show';$('#notice').textContent=`Скачан ZIP-архив: ${shareFiles.length} файлов`;
    }else if(iosDevice&&navigator.share&&(!navigator.canShare||navigator.canShare({files:shareFiles}))){
      await navigator.share({files:shareFiles,title:'Multi Photo Change Date'});
      $('#notice').className='notice show';$('#notice').textContent='В меню выберите «Сохранить изображения»';
    }else{
      for(const file of shareFiles)downloadBlob(file,file.name);
      $('#notice').className='notice show';$('#notice').textContent='Файл сохранён в «Загрузки»';
    }
  }catch(error){if(error.name!=='AbortError'){ $('#notice').className='notice show';$('#notice').textContent='Ошибка: '+error.message }}
  updateSelection();
};

function showMobileSaveQueue(files){
  const queue=$('#mobileSaveQueue'),list=$('#mobileSaveList');
  list.innerHTML='';queue.hidden=false;queue.classList.add('attention');
  const downloadPreparedFile=file=>{
    const url=URL.createObjectURL(file),link=document.createElement('a');
    link.href=url;link.download=file.name;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  };
  const canShareFile=file=>iosDevice&&navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}));
  const saveNext=$('#mobileSaveNext');let nextFileIndex=0;
  const updateNextButton=()=>{
    saveNext.disabled=nextFileIndex>=files.length;
    saveNext.textContent=nextFileIndex>=files.length
      ?(iosDevice?'Все меню открыты':'Все файлы скачаны')
      :(iosDevice?`Открыть меню · ${nextFileIndex+1} из ${files.length}`:`Скачать файл · ${nextFileIndex+1} из ${files.length}`);
  };
  saveNext.onclick=()=>{
    if(nextFileIndex>=files.length)return;
    const currentIndex=nextFileIndex,file=files[currentIndex];
    if(!canShareFile(file)){
      downloadPreparedFile(file);list.children[currentIndex]?.classList.add('done');nextFileIndex++;updateNextButton();return;
    }
    /* Advance immediately: some iOS versions never resolve share() after Save Image. */
    nextFileIndex++;updateNextButton();
    navigator.share({files:[file],title:file.name}).then(()=>{
      list.children[currentIndex]?.classList.add('done');
    }).catch(error=>{
      nextFileIndex=Math.min(nextFileIndex,currentIndex);updateNextButton();
      if(error.name==='AbortError')return;
      $('#notice').className='notice show';$('#notice').textContent='Не удалось передать файл: '+error.message;
    });
  };
  updateNextButton();
  files.forEach((file,index)=>{
    const row=document.createElement('div');row.className='mobile-save-item';
    const name=document.createElement('span');name.textContent=`${index+1}. ${file.name}`;
    row.append(name);list.append(row);
  });
  queue.addEventListener('click',()=>queue.classList.remove('attention'),{once:true});
  requestAnimationFrame(()=>{
    queue.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  });
}

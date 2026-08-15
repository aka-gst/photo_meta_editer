/* iPhone: передаём готовые файлы в системное меню «Поделиться» → «Сохранить изображения». */
const iosDevice=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
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
    if(shareFiles.length>1){
      showMobileSaveQueue(shareFiles);
      $('#notice').className='notice show';
      $('#notice').textContent=`Подготовлено ${shareFiles.length} файлов — сохраните их по одному ниже`;
    }else if(iosDevice&&navigator.share&&(!navigator.canShare||navigator.canShare({files:shareFiles}))){
      await navigator.share({files:shareFiles,title:'Multi Photo Change Date'});
      $('#notice').className='notice show';$('#notice').textContent='В меню выберите «Сохранить изображения»';
    }else{
      for(const file of shareFiles){const link=document.createElement('a');link.href=URL.createObjectURL(file);link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),30000)}
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

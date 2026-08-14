/* Explain browser capabilities and make the save action predictable. */
const capabilityNote=$('#capabilityNote');

/* Safari restores the previous scroll position after reload unless disabled. */
if('scrollRestoration' in history)history.scrollRestoration='manual';
window.addEventListener('pageshow',()=>{
  scrollTo({top:0,left:0,behavior:'auto'});
  const gallery=$('#gallery');
  if(gallery)gallery.scrollTop=0;
  requestAnimationFrame(()=>scrollTo(0,0));
});

function currentSaveMode(){
  const selected=P.filter(item=>item.selected);
  if(mobile)return 'mobile-copy';
  if(selected.length&&selected.every(item=>item.handle))return 'originals';
  return window.isSecureContext&&window.showDirectoryPicker?'folder':'download-copy';
}

function updateModeGuidance(){
  const mode=currentSaveMode(),selectedCount=P.filter(item=>item.selected).length;
  if(mode==='mobile-copy'){
    capabilityNote.innerHTML='<strong>Телефон:</strong> дата изменится в новых копиях. Затем откроется системное меню сохранения.';
  }else if(mode==='originals'){
    capabilityNote.innerHTML='<strong>Папка с доступом:</strong> выбранные оригиналы будут изменены после подтверждения.';
  }else if(mode==='folder'){
    capabilityNote.innerHTML='<strong>Компьютер:</strong> добавьте папку и разрешите запись, чтобы менять оригиналы.';
  }else{
    capabilityNote.innerHTML='<strong>Ограниченный режим:</strong> браузер сохранит изменённые копии в «Загрузки».';
  }

  const downloadButton=$('#download'),updateButton=$('#save'),updateWrap=$('#updateActionWrap');
  const directWriteSupported=window.isSecureContext&&Boolean(window.showDirectoryPicker);
  const selectedWritable=Boolean(selectedCount)&&P.filter(item=>item.selected).every(item=>item.handle);
  const updateAvailable=directWriteSupported&&selectedWritable;
  downloadButton.disabled=!selectedCount;
  downloadButton.textContent=mobile?`Сохранить новые файлы${selectedCount?' · '+selectedCount:''}`:`Скачать новые файлы${selectedCount?' · '+selectedCount:''}`;
  updateWrap.hidden=mobile;
  updateButton.disabled=!selectedCount||!updateAvailable;
  updateButton.textContent=selectedCount?`Обновить оригиналы · ${selectedCount}`:'Обновить оригиналы';
  const unavailableReason=!selectedCount?'Сначала выберите фотографии'
    :!window.isSecureContext?'Недоступно по обычному HTTP. Откройте через localhost на этом компьютере или через HTTPS.'
    :!window.showDirectoryPicker?'Этот браузер не поддерживает обновление оригиналов. Используйте Chrome или Edge.'
    :!selectedWritable?'Заново добавьте папку и разрешите браузеру запись в оригиналы.'
    :'Изменить оригиналы в выбранной папке';
  updateWrap.title=unavailableReason;updateButton.title=unavailableReason;
}

const updateSelectionBeforeGuidance=updateSelection;
updateSelection=function(){
  updateSelectionBeforeGuidance();
  updateModeGuidance();
};

new MutationObserver(updateModeGuidance).observe($('#gallery'),{childList:true});
updateModeGuidance();

/* Verify the JPEG produced by the metadata writer before it is saved or shared. */
const changedBeforeResultVerification=changed;
changed=async function(item){
  const blob=await changedBeforeResultVerification(item);
  const isJpeg=blob.type==='image/jpeg'||/\.jpe?g$/i.test(item.name);
  if(isJpeg){
    const verificationFile=new File([blob],item.name,{type:'image/jpeg'});
    const writtenDate=await readEmbeddedPhotoDate(verificationFile);
    item.lastWriteVerified=Boolean(writtenDate&&Math.abs(writtenDate-item.date)<1000);
  }else item.lastWriteVerified=null;
  return blob;
};

const saveBeforeResultMessage=$('#save').onclick;
$('#save').onclick=async event=>{
  const items=P.filter(item=>item.selected),mode=currentSaveMode();
  if(!items.length)return saveBeforeResultMessage.call($('#save'),event);
  items.forEach(item=>{item.lastWriteVerified=undefined});
  const noticeBefore=$('#notice').textContent;
  await saveBeforeResultMessage.call($('#save'),event);
  const notice=$('#notice'),failed=notice.textContent.startsWith('Ошибка');
  const completed=notice.textContent!==noticeBefore&&!failed;
  if(!completed)return;

  const verified=items.filter(item=>item.lastWriteVerified===true).length;
  const unsupported=items.filter(item=>item.lastWriteVerified===null).length;
  const firstDate=items[0]?.date;
  const dateRange=items.length>1&&items.at(-1)?.date-firstDate
    ? `${fmt(firstDate)} — ${fmt(items.at(-1).date)}`
    : fmt(firstDate);
  const preparedForMobile=mode==='mobile-copy'&&notice.textContent.startsWith('Подготовлено');
  const modeText=mode==='originals'
    ? 'Оригиналы обновлены. Дата изменения Finder может стать сегодняшней.'
    : preparedForMobile?'Файлы подготовлены. Для каждого откройте системное меню ниже и выберите место сохранения.'
    : 'Созданы новые копии. Даты «Создан» и «Изменён» в Finder будут сегодняшними.';
  const verificationText=verified
    ? `EXIF проверен в ${verified} из ${items.length} файлов.`
    : unsupported===items.length?'Для видео дата записана без перекодирования.':'Проверьте EXIF готового файла.';

  notice.className='notice show save-result';
  notice.innerHTML=`<strong>Дата съёмки установлена: ${dateRange}</strong><span>${verificationText} ${modeText}</span>`;
};

/* Copies and originals are separate, explicit actions. */
const updateOriginalsHandler=$('#save').onclick;
$('#save').onclick=async event=>{
  const selected=P.filter(item=>item.selected);
  if(!selected.length||!selected.every(item=>item.handle)){
    const message='Нет доступа к оригиналам. Откройте приложение через localhost на этом компьютере, заново нажмите «Добавить папку» и разрешите запись.';
    $('#notice').className='notice show';
    $('#notice').textContent=message;
    alert(message);
    return;
  }
  const noticeBeforeUpdate=$('#notice').textContent;
  await updateOriginalsHandler.call($('#save'),event);
  if($('#notice').textContent===noticeBeforeUpdate||$('#notice').textContent.startsWith('Ошибка'))return;
  const failed=[];
  for(const item of selected){
    try{
      const writtenFile=await item.handle.getFile(),writtenDate=await readEmbeddedPhotoDate(writtenFile);
      item.file=writtenFile;
      if(!writtenDate||Math.abs(writtenDate-item.date)>=1000)failed.push(item.name);
    }catch(error){failed.push(item.name)}
  }
  if(failed.length){
    const message=`Не удалось подтвердить дату съёмки в оригиналах: ${failed.length}. Оригиналы не считаются обновлёнными.`;
    $('#notice').className='notice show';$('#notice').textContent=message;alert(message);return;
  }
  $('#notice').className='notice show save-result';
  $('#notice').innerHTML=`<strong>Оригиналы обновлены: ${selected.length}</strong><span>Дата съёмки записана и повторно проверена в каждом файле.</span>`;
  selected.forEach(item=>{item.selected=false});
  render();updateSelection();
};

async function downloadSelectedCopies(){
  const items=P.filter(item=>item.selected);if(!items.length)return;
  const year=date.value.slice(0,4),base=new Date(date.value),interval=Number($('#step').value)||0;
  if(year.length!==4||Number(year)<1900||Number(year)>9999||Number.isNaN(base.getTime()))return alert('Укажите корректную дату.');
  if(!confirm(`Создать новые файлы для выбранных: ${items.length}?`))return;
  items.forEach((item,index)=>item.date=new Date(base.getTime()+index*interval*60000));
  const button=$('#download');button.disabled=true;$('#status').textContent='Подготавливаю новые файлы…';
  try{
    for(const item of items){
      const blob=await changed(item),video=item.file.type.startsWith('video/')||/\.(mp4|mov|m4v)$/i.test(item.name),extension=video?(item.name.match(/\.[^.]+$/)?.[0]||'.mp4'):'.jpg';
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=item.name.replace(/\.[^.]+$/,'')+'_new-date'+extension;link.click();
      setTimeout(()=>URL.revokeObjectURL(url),30000);await new Promise(resolve=>setTimeout(resolve,300));
    }
    $('#notice').className='notice show save-result';
    $('#notice').innerHTML=`<strong>Подготовлено новых файлов: ${items.length}</strong><span>Оригиналы не изменены. Файлы сохранены через браузер.</span>`;
  }catch(error){$('#notice').className='notice show';$('#notice').textContent='Ошибка: '+error.message}
  updateSelection();
}

const mobileCopyHandler=updateOriginalsHandler;
$('#download').onclick=()=>mobile?mobileCopyHandler.call($('#save')):downloadSelectedCopies();
updateModeGuidance();

/* Сохранение одним действием: применить дату → подтвердить → изменить оригиналы. */
$('#save').onclick=async()=>{
  const items=P.filter(item=>item.selected);
  if(!items.length)return;
  const year=date.value.slice(0,4),base=new Date(date.value),interval=Number($('#step').value)||0;
  if(year.length!==4||Number(year)<1900||Number(year)>9999||Number.isNaN(base.getTime())){
    alert('Укажите корректную дату с четырёхзначным годом от 1900 до 9999.');return;
  }
  const word=items.length===1?'файл':items.length<5?'файла':'файлов';
  if(!confirm(`Вы уверены, что хотите изменить ${items.length} ${word}?`))return;
  items.forEach((item,index)=>item.date=new Date(base.getTime()+index*interval*60000));
  $('#save').disabled=true;$('#status').textContent='Сохраняю изменения…';
  try{
    for(const item of items){
      const blob=await changed(item);
      if(item.handle){
        const writer=await item.handle.createWritable();await writer.write(blob);await writer.close();
        if(item.url){URL.revokeObjectURL(item.url);item.url=null}item.file=await item.handle.getFile();
      }else{
        const link=document.createElement('a'),video=item.file.type.startsWith('video/')||/\.(mp4|mov|m4v)$/i.test(item.name),ext=video?(item.name.match(/\.[^.]+$/)?.[0]||'.mp4'):'.jpg';
        link.href=URL.createObjectURL(blob);link.download=item.name.replace(/\.[^.]+$/,'')+'_new-date'+ext;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),30000);await new Promise(resolve=>setTimeout(resolve,300));
      }
    }
    $('#notice').className='notice show';$('#notice').textContent=`Изменено: ${items.length} ${word}`;
  }catch(error){$('#notice').className='notice show';$('#notice').textContent='Ошибка: '+error.message}
  render();updateSelection();
};

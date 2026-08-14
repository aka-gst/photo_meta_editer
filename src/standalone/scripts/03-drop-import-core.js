/* Pure drag-and-drop helpers. Kept DOM-free so the exact browser logic is unit-testable. */
globalThis.DropImportCore={
  async requestAllHandles(transferItems){
    const requests=Array.from(transferItems,transferItem=>
      transferItem.getAsFileSystemHandle?transferItem.getAsFileSystemHandle():Promise.resolve(null)
    );
    const results=await Promise.allSettled(requests);
    return results
      .filter(result=>result.status==='fulfilled'&&result.value)
      .map(result=>result.value);
  },

  mergeFiles(transferredFiles,handleFiles){
    const unique=new Map();
    for(const file of [...transferredFiles,...handleFiles]){
      const key=`${file.name}\0${file.size}\0${file.lastModified}`;
      if(!unique.has(key))unique.set(key,file);
    }
    return [...unique.values()];
  },

  placeInTemporaryFolder(items,firstNewItem,folderName='Временные файлы'){
    const imported=items.slice(firstNewItem);
    imported.forEach(item=>{item.folder=folderName});
    return {folderName,count:imported.length,items:imported};
  }
};

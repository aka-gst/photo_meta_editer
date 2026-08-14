/* Windows ожидает APP1/EXIF в начале JPEG, сразу после SOI. */
jpegDate=function(buffer,newDate){
  const source=new Uint8Array(buffer);
  if(source[0]!==255||source[1]!==216)throw Error('Файл не является JPEG');
  const parts=[source.slice(0,2),exifSeg(newDate)];
  let position=2;
  while(position+4<source.length&&source[position]===255){
    const marker=source[position+1];
    if(marker===218||marker===217)break;
    const length=(source[position+2]<<8)+source[position+3],end=position+2+length;
    if(end>source.length)break;
    const oldExif=marker===225&&source[position+4]===69&&source[position+5]===120&&source[position+6]===105&&source[position+7]===102;
    if(!oldExif)parts.push(source.slice(position,end));
    position=end;
  }
  parts.push(source.slice(position));
  return new Blob(parts,{type:'image/jpeg'});
};

/* Сохраняем исходную EXIF-ориентацию, чтобы фото не поворачивалось. */
function readOrientation(source){
  try{
    const a=new Uint8Array(source),v=new DataView(source);let p=2;
    while(p+12<a.length&&a[p]===255){const m=a[p+1],len=(a[p+2]<<8)+a[p+3];if(m===225&&a[p+4]===69&&a[p+5]===120&&a[p+6]===105&&a[p+7]===102){const t=p+10,little=a[t]===73,u16=o=>v.getUint16(o,little),u32=o=>v.getUint32(o,little),ifd=t+u32(t+4),count=u16(ifd);for(let i=0;i<count;i++){const e=ifd+2+i*12;if(u16(e)===274)return u16(e+8)}return 1}if(m===218||!len)break;p+=2+len}
  }catch(_){return 1}return 1;
}

exifSeg=function(d,orientation=1){
  const text=new TextEncoder().encode(exif(d)+'\0'),t=new Uint8Array(100),v=new DataView(t.buffer);
  t.set([73,73,42,0]);v.setUint32(4,8,true);v.setUint16(8,3,true);
  const entry=(o,tag,type,count,value)=>{v.setUint16(o,tag,true);v.setUint16(o+2,type,true);v.setUint32(o+4,count,true);if(type===3&&count===1)v.setUint16(o+8,value,true);else v.setUint32(o+8,value,true)};
  entry(10,274,3,1,orientation);entry(22,306,2,20,80);entry(34,34665,4,1,50);v.setUint32(46,0,true);
  v.setUint16(50,2,true);entry(52,36867,2,20,80);entry(64,36868,2,20,80);v.setUint32(76,0,true);t.set(text,80);
  const payload=new Uint8Array(106);payload.set([69,120,105,102,0,0]);payload.set(t,6);const out=new Uint8Array(110);out.set([255,225]);new DataView(out.buffer).setUint16(2,108);out.set(payload,4);return out;
};

jpegDate=function(buffer,newDate){
  const source=new Uint8Array(buffer),orientation=readOrientation(buffer);if(source[0]!==255||source[1]!==216)throw Error('Файл не является JPEG');
  const parts=[source.slice(0,2),exifSeg(newDate,orientation)];let position=2;
  while(position+4<source.length&&source[position]===255){const marker=source[position+1];if(marker===218||marker===217)break;const length=(source[position+2]<<8)+source[position+3],end=position+2+length;if(end>source.length)break;const oldExif=marker===225&&source[position+4]===69&&source[position+5]===120&&source[position+6]===105&&source[position+7]===102;if(!oldExif)parts.push(source.slice(position,end));position=end}
  parts.push(source.slice(position));return new Blob(parts,{type:'image/jpeg'});
};

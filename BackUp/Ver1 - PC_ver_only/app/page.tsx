"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";

type Photo = { id: string; file: File; url: string; date: Date };

function pad(n: number) { return String(n).padStart(2, "0"); }
function exifDate(d: Date) {
  return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function inputDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function makeExifSegment(date: Date) {
  const text = exifDate(date) + "\0";
  const encoder = new TextEncoder();
  const value = encoder.encode(text);
  const tiff = new Uint8Array(86);
  const view = new DataView(tiff.buffer);
  tiff.set([0x49, 0x49, 0x2a, 0x00], 0); view.setUint32(4, 8, true);
  view.setUint16(8, 2, true);
  view.setUint16(10, 0x0132, true); view.setUint16(12, 2, true); view.setUint32(14, 20, true); view.setUint32(18, 62, true);
  view.setUint16(22, 0x8769, true); view.setUint16(24, 4, true); view.setUint32(26, 1, true); view.setUint32(30, 38, true);
  view.setUint32(34, 0, true);
  view.setUint16(38, 2, true);
  view.setUint16(40, 0x9003, true); view.setUint16(42, 2, true); view.setUint32(44, 20, true); view.setUint32(48, 62, true);
  view.setUint16(52, 0x9004, true); view.setUint16(54, 2, true); view.setUint32(56, 20, true); view.setUint32(60, 62, true);
  view.setUint32(64, 0, true); tiff.set(value, 66);
  const payload = new Uint8Array(6 + tiff.length); payload.set([0x45,0x78,0x69,0x66,0,0]); payload.set(tiff, 6);
  const segment = new Uint8Array(payload.length + 4); segment.set([0xff,0xe1]); new DataView(segment.buffer).setUint16(2, payload.length + 2, false); segment.set(payload, 4);
  return segment;
}

async function writeExif(file: File, date: Date) {
  const src = new Uint8Array(await file.arrayBuffer());
  if (src[0] !== 0xff || src[1] !== 0xd8) throw new Error("Поддерживаются JPEG-файлы");
  let pos = 2; const parts: Uint8Array[] = [src.slice(0, 2)];
  while (pos + 4 < src.length && src[pos] === 0xff) {
    const marker = src[pos + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const len = (src[pos + 2] << 8) + src[pos + 3];
    const end = pos + 2 + len;
    const isExif = marker === 0xe1 && src[pos + 4] === 0x45 && src[pos + 5] === 0x78 && src[pos + 6] === 0x69 && src[pos + 7] === 0x66;
    if (!isExif) parts.push(src.slice(pos, end));
    pos = end;
  }
  parts.push(makeExifSegment(date), src.slice(pos));
  return new Blob(parts, { type: "image/jpeg" });
}

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [date, setDate] = useState(inputDate(new Date()));
  const [step, setStep] = useState(0);
  const [drag, setDrag] = useState(false);
  const [status, setStatus] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const jpegOnly = useMemo(() => photos.every(p => /jpe?g$/i.test(p.file.name)), [photos]);

  function addFiles(files: FileList | File[]) {
    const accepted = Array.from(files).filter(f => f.type.startsWith("image/"));
    const base = new Date(date);
    setPhotos(prev => [...prev, ...accepted.map((file, i) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file), date: new Date(base.getTime() + (prev.length + i) * step * 60000) }))]);
    setStatus(accepted.length ? "" : "Выберите файлы изображений");
  }
  function onDateChange(value: string) {
    setDate(value); const base = new Date(value);
    if (!Number.isNaN(base.getTime())) setPhotos(prev => prev.map((p, i) => ({ ...p, date: new Date(base.getTime() + i * step * 60000) })));
  }
  function onStepChange(value: number) {
    setStep(value); const base = new Date(date);
    setPhotos(prev => prev.map((p, i) => ({ ...p, date: new Date(base.getTime() + i * value * 60000) })));
  }
  async function saveAll() {
    if (!photos.length) return;
    if (!jpegOnly) { setStatus("Сохранение EXIF доступно для JPG/JPEG. Удалите остальные форматы."); return; }
    setStatus("Подготавливаю файлы…");
    try {
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i]; const blob = await writeExif(p.file, p.date);
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        const dot = p.file.name.lastIndexOf("."); a.download = `${dot > 0 ? p.file.name.slice(0, dot) : p.file.name}_новая-дата.jpg`;
        a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 30000);
        if (photos.length > 1) await new Promise(r => setTimeout(r, 180));
      }
      setStatus(`Готово: сохранено ${photos.length} ${photos.length === 1 ? "фото" : "фото"}`);
    } catch (e) { setStatus(e instanceof Error ? e.message : "Не удалось сохранить файлы"); }
  }

  return <main>
    <header><div className="brand"><span>Д</span>ФотоДата</div><div className="privacy"><i /> Всё происходит на вашем устройстве</div></header>
    <section className="hero">
      <div className="eyebrow">Пакетный редактор дат</div>
      <h1>Верните фотографиям<br/><em>правильное время.</em></h1>
      <p>Меняйте дату съёмки у одного снимка или целой папки. Быстро, аккуратно и без загрузки в интернет.</p>
    </section>
    <section className="workspace">
      <div className="settings">
        <div className="section-title"><b>01</b><div><h2>Новая дата</h2><p>Она будет записана в данные снимка</p></div></div>
        <label className="date-field"><span>Дата и время</span><input type="datetime-local" value={date} onChange={e => onDateChange(e.target.value)} /></label>
        <label className="step-field"><div><span>Интервал между фото</span><small>Для сохранения порядка снимков</small></div><div><input type="number" min="0" max="1440" value={step} onChange={e => onStepChange(Number(e.target.value))}/><span>мин</span></div></label>
        <div className="note"><strong>Как это работает</strong><p>Первому фото назначится выбранное время. Каждое следующее получит прибавку указанного интервала.</p></div>
      </div>
      <div className="files">
        <div className="section-title"><b>02</b><div><h2>Фотографии</h2><p>{photos.length ? `Добавлено: ${photos.length}` : "JPG и JPEG"}</p></div></div>
        <div className={`drop ${drag ? "drag" : ""}`} onDragOver={(e:DragEvent) => {e.preventDefault(); setDrag(true)}} onDragLeave={() => setDrag(false)} onDrop={(e:DragEvent) => {e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files)}} onClick={() => input.current?.click()}>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e:ChangeEvent<HTMLInputElement>) => e.target.files && addFiles(e.target.files)} />
          <div className="upload-icon">＋</div><h3>Перетащите фото сюда</h3><p>или <u>выберите файлы</u> на компьютере</p>
        </div>
        {photos.length > 0 && <div className="photo-list">{photos.map((p, i) => <div className="photo" key={p.id}>
          <img src={p.url} alt=""/><div className="photo-info"><strong>{p.file.name}</strong><span>{(p.file.size/1024/1024).toFixed(1)} МБ · {exifDate(p.date).replaceAll(":", ".").replace(" ", "  ")}</span></div>
          <button aria-label={`Удалить ${p.file.name}`} onClick={() => {URL.revokeObjectURL(p.url); setPhotos(v => v.filter(x => x.id !== p.id))}}>×</button>
        </div>)}</div>}
      </div>
    </section>
    <div className="action-bar"><div><strong>{photos.length || "Нет"} {photos.length === 1 ? "фотография" : "фотографий"}</strong><span>{status || (photos.length ? "Оригиналы останутся без изменений" : "Добавьте снимки, чтобы начать")}</span></div><button disabled={!photos.length} onClick={saveAll}>Сохранить новые фото <span>→</span></button></div>
    <footer><span>Работает локально в браузере</span><span>Фото никуда не отправляются</span></footer>
  </main>;
}

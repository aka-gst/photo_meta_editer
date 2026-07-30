import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
//#region app/page.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function pad(n) {
	return String(n).padStart(2, "0");
}
function exifDate(d) {
	return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function inputDate(d) {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function makeExifSegment(date) {
	const text = exifDate(date) + "\0";
	const value = new TextEncoder().encode(text);
	const tiff = new Uint8Array(86);
	const view = new DataView(tiff.buffer);
	tiff.set([
		73,
		73,
		42,
		0
	], 0);
	view.setUint32(4, 8, true);
	view.setUint16(8, 2, true);
	view.setUint16(10, 306, true);
	view.setUint16(12, 2, true);
	view.setUint32(14, 20, true);
	view.setUint32(18, 62, true);
	view.setUint16(22, 34665, true);
	view.setUint16(24, 4, true);
	view.setUint32(26, 1, true);
	view.setUint32(30, 38, true);
	view.setUint32(34, 0, true);
	view.setUint16(38, 2, true);
	view.setUint16(40, 36867, true);
	view.setUint16(42, 2, true);
	view.setUint32(44, 20, true);
	view.setUint32(48, 62, true);
	view.setUint16(52, 36868, true);
	view.setUint16(54, 2, true);
	view.setUint32(56, 20, true);
	view.setUint32(60, 62, true);
	view.setUint32(64, 0, true);
	tiff.set(value, 66);
	const payload = new Uint8Array(6 + tiff.length);
	payload.set([
		69,
		120,
		105,
		102,
		0,
		0
	]);
	payload.set(tiff, 6);
	const segment = new Uint8Array(payload.length + 4);
	segment.set([255, 225]);
	new DataView(segment.buffer).setUint16(2, payload.length + 2, false);
	segment.set(payload, 4);
	return segment;
}
async function writeExif(file, date) {
	const src = new Uint8Array(await file.arrayBuffer());
	if (src[0] !== 255 || src[1] !== 216) throw new Error("Поддерживаются JPEG-файлы");
	let pos = 2;
	const parts = [src.slice(0, 2)];
	while (pos + 4 < src.length && src[pos] === 255) {
		const marker = src[pos + 1];
		if (marker === 218 || marker === 217) break;
		const len = (src[pos + 2] << 8) + src[pos + 3];
		const end = pos + 2 + len;
		if (!(marker === 225 && src[pos + 4] === 69 && src[pos + 5] === 120 && src[pos + 6] === 105 && src[pos + 7] === 102)) parts.push(src.slice(pos, end));
		pos = end;
	}
	parts.push(makeExifSegment(date), src.slice(pos));
	return new Blob(parts, { type: "image/jpeg" });
}
function Home() {
	const [photos, setPhotos] = (0, import_react.useState)([]);
	const [date, setDate] = (0, import_react.useState)(inputDate(/* @__PURE__ */ new Date()));
	const [step, setStep] = (0, import_react.useState)(0);
	const [drag, setDrag] = (0, import_react.useState)(false);
	const [status, setStatus] = (0, import_react.useState)("");
	const input = (0, import_react.useRef)(null);
	const jpegOnly = (0, import_react.useMemo)(() => photos.every((p) => /jpe?g$/i.test(p.file.name)), [photos]);
	function addFiles(files) {
		const accepted = Array.from(files).filter((f) => f.type.startsWith("image/"));
		const base = new Date(date);
		setPhotos((prev) => [...prev, ...accepted.map((file, i) => ({
			id: crypto.randomUUID(),
			file,
			url: URL.createObjectURL(file),
			date: new Date(base.getTime() + (prev.length + i) * step * 6e4)
		}))]);
		setStatus(accepted.length ? "" : "Выберите файлы изображений");
	}
	function onDateChange(value) {
		setDate(value);
		const base = new Date(value);
		if (!Number.isNaN(base.getTime())) setPhotos((prev) => prev.map((p, i) => ({
			...p,
			date: new Date(base.getTime() + i * step * 6e4)
		})));
	}
	function onStepChange(value) {
		setStep(value);
		const base = new Date(date);
		setPhotos((prev) => prev.map((p, i) => ({
			...p,
			date: new Date(base.getTime() + i * value * 6e4)
		})));
	}
	async function saveAll() {
		if (!photos.length) return;
		if (!jpegOnly) {
			setStatus("Сохранение EXIF доступно для JPG/JPEG. Удалите остальные форматы.");
			return;
		}
		setStatus("Подготавливаю файлы…");
		try {
			for (let i = 0; i < photos.length; i++) {
				const p = photos[i];
				const blob = await writeExif(p.file, p.date);
				const a = document.createElement("a");
				a.href = URL.createObjectURL(blob);
				const dot = p.file.name.lastIndexOf(".");
				a.download = `${dot > 0 ? p.file.name.slice(0, dot) : p.file.name}_новая-дата.jpg`;
				a.click();
				setTimeout(() => URL.revokeObjectURL(a.href), 3e4);
				if (photos.length > 1) await new Promise((r) => setTimeout(r, 180));
			}
			setStatus(`Готово: сохранено ${photos.length} ${photos.length === 1 ? "фото" : "фото"}`);
		} catch (e) {
			setStatus(e instanceof Error ? e.message : "Не удалось сохранить файлы");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "brand",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Д" }), "ФотоДата"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "privacy",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), " Всё происходит на вашем устройстве"]
		})] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "hero",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "eyebrow",
					children: "Пакетный редактор дат"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
					"Верните фотографиям",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: "правильное время." })
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Меняйте дату съёмки у одного снимка или целой папки. Быстро, аккуратно и без загрузки в интернет." })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "workspace",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "settings",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "section-title",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "01" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Новая дата" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Она будет записана в данные снимка" })] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "date-field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Дата и время" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "datetime-local",
							value: date,
							onChange: (e) => onDateChange(e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "step-field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Интервал между фото" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Для сохранения порядка снимков" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							min: "0",
							max: "1440",
							value: step,
							onChange: (e) => onStepChange(Number(e.target.value))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "мин" })] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "note",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Как это работает" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Первому фото назначится выбранное время. Каждое следующее получит прибавку указанного интервала." })]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "files",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "section-title",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "02" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Фотографии" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: photos.length ? `Добавлено: ${photos.length}` : "JPG и JPEG" })] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `drop ${drag ? "drag" : ""}`,
						onDragOver: (e) => {
							e.preventDefault();
							setDrag(true);
						},
						onDragLeave: () => setDrag(false),
						onDrop: (e) => {
							e.preventDefault();
							setDrag(false);
							addFiles(e.dataTransfer.files);
						},
						onClick: () => input.current?.click(),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								ref: input,
								type: "file",
								accept: "image/jpeg,image/png,image/webp",
								multiple: true,
								hidden: true,
								onChange: (e) => e.target.files && addFiles(e.target.files)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "upload-icon",
								children: "＋"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Перетащите фото сюда" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								"или ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("u", { children: "выберите файлы" }),
								" на компьютере"
							] })
						]
					}),
					photos.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "photo-list",
						children: photos.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "photo",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: p.url,
									alt: ""
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "photo-info",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: p.file.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										(p.file.size / 1024 / 1024).toFixed(1),
										" МБ · ",
										exifDate(p.date).replaceAll(":", ".").replace(" ", "  ")
									] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									"aria-label": `Удалить ${p.file.name}`,
									onClick: () => {
										URL.revokeObjectURL(p.url);
										setPhotos((v) => v.filter((x) => x.id !== p.id));
									},
									children: "×"
								})
							]
						}, p.id))
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "action-bar",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
				photos.length || "Нет",
				" ",
				photos.length === 1 ? "фотография" : "фотографий"
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: status || (photos.length ? "Оригиналы останутся без изменений" : "Добавьте снимки, чтобы начать") })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				disabled: !photos.length,
				onClick: saveAll,
				children: ["Сохранить новые фото ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Работает локально в браузере" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Фото никуда не отправляются" })] })
	] });
}
//#endregion
export { Home as default };

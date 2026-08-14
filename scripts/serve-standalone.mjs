import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { networkInterfaces } from "node:os";

const root = process.cwd();
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT) || 4173;
const types = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".css": "text/css", ".js": "text/javascript" };
const server = createServer(async (request, response) => {
  const relative = request.url === "/" ? "start.html" : decodeURIComponent(request.url.split("?")[0]).replace(/^\/+/, "");
  const file = normalize(join(root, relative));
  if (!file.startsWith(root)) { response.writeHead(403).end("Forbidden"); return; }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("Not a file");
    response.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
  } catch { response.writeHead(404).end("Not found"); }
});

server.on("error", error => {
  if (error.code === "EADDRINUSE") {
    console.error(`Порт ${port} уже занят. Возможно, приложение уже запущено.`);
    console.error(`Откройте http://127.0.0.1:${port}`);
    process.exitCode = 1;
    return;
  }
  throw error;
});

server.listen(port, host, () => {
  console.log(`Этот Mac: http://127.0.0.1:${port}`);
  if (host === "0.0.0.0") {
    const addresses = Object.values(networkInterfaces()).flat()
      .filter(item => item?.family === "IPv4" && !item.internal)
      .map(item => `http://${item.address}:${port}`);
    for (const address of addresses) console.log(`Локальная сеть: ${address}`);
    console.log("Открывайте сетевой адрес только на доверенной домашней Wi-Fi-сети.");
  }
});

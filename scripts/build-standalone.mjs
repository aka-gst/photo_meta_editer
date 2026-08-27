import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(root, "src/standalone");
const entrypoints = ["PhotoDate.html", "start.html", "public/PhotoDate.html"];

const styleFiles = ["base.css", "gallery-scrollbars.css", "sidebar-scrollbars.css", "design.css"];
const scriptFiles = [
  "01-core-gallery.js",
  "02-video-metadata.js",
  "03-drop-import-core.js",
  "03-folder-drop.js",
  "04-save-workflow.js",
  "05-windows-exif.js",
  "06-browser-compatibility.js",
  "07-mobile-share.js",
  "08-photo-metadata.js",
  "09-workspace-actions.js",
  "10-mode-guidance.js",
];

async function extract() {
  const bundle = await readFile(resolve(root, "start.html"), "utf8");
  const styles = [...bundle.matchAll(/<style>([\s\S]*?)<\/style>/gi)].map((match) => match[1].trim());
  const scripts = [...bundle.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((match) => match[1].trim());
  if (styles.length !== styleFiles.length || scripts.length !== scriptFiles.length) {
    throw new Error(`Unexpected bundle shape: ${styles.length} styles, ${scripts.length} scripts`);
  }

  let html = bundle.replace(/<style>[\s\S]*?<\/style>/gi, "").replace(/<script>[\s\S]*?<\/script>/gi, "");
  html = html.replace("</head>", "  <!-- STYLES -->\n</head>").replace("</body>", "  <!-- SCRIPTS -->\n</body>");

  await mkdir(resolve(sourceRoot, "styles"), { recursive: true });
  await mkdir(resolve(sourceRoot, "scripts"), { recursive: true });
  await writeFile(resolve(sourceRoot, "index.html"), html);
  await Promise.all(styleFiles.map((file, index) => writeFile(resolve(sourceRoot, "styles", file), `${styles[index]}\n`)));
  await Promise.all(scriptFiles.map((file, index) => writeFile(resolve(sourceRoot, "scripts", file), `${scripts[index]}\n`)));
}

async function build() {
  const template = await readFile(resolve(sourceRoot, "index.html"), "utf8");
  const styles = await Promise.all(styleFiles.map((file) => readFile(resolve(sourceRoot, "styles", file), "utf8")));
  const scripts = await Promise.all(scriptFiles.map((file) => readFile(resolve(sourceRoot, "scripts", file), "utf8")));
  const bundle = template
    .replace("  <!-- STYLES -->", styles.map((css) => `<style>\n${css.trim()}\n</style>`).join("\n"))
    .replace("  <!-- SCRIPTS -->", scripts.map((js) => `<script>\n${js.trim()}\n</script>`).join("\n"));

  await Promise.all(entrypoints.map(async (entrypoint) => {
    const output = resolve(root, entrypoint);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, bundle);
  }));
  await Promise.all([
    copyFile(resolve(sourceRoot, "favicon.svg"), resolve(root, "favicon.svg")),
    copyFile(resolve(sourceRoot, "favicon.svg"), resolve(root, "public/favicon.svg")),
  ]);
  console.log(`Built ${entrypoints.length} standalone entrypoints from src/standalone`);
}

if (process.argv.includes("--extract")) await extract();
await build();

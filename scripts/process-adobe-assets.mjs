import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function command(name) {
  try {
    return execFileSync("/usr/bin/which", [name], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function cleanSlug(value = "") {
  const clean = value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!clean) throw new Error("A Latin --slug is required.");
  return clean;
}

function formatSize(bytes = 0) {
  const units = ["B", "KB", "MB", "GB"];
  const unit = Math.min(Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** unit);
  return `${value.toFixed(unit === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unit]}`;
}

function pngDimensions(buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return {};
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegDimensions(buffer) {
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2 || offset + length + 2 > buffer.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += length + 2;
  }
  return {};
}

async function metadata(path, format) {
  const [buffer, info] = await Promise.all([readFile(path), stat(path)]);
  const dimensions = format === "PNG" ? pngDimensions(buffer) : format === "JPG" ? jpegDimensions(buffer) : {};
  return {
    format,
    bytes: info.size,
    size: formatSize(info.size),
    width: dimensions.width || null,
    height: dimensions.height || null,
    dimensions: dimensions.width && dimensions.height ? `${dimensions.width} x ${dimensions.height} px` : "",
  };
}

async function renderWithGhostscript(source, outputDir, stem, density) {
  const gs = command("gs");
  if (!gs) throw new Error("Ghostscript is required to preview PDF-compatible AI, EPS, PS, or PDF assets.");
  const common = ["-dSAFER", "-dBATCH", "-dNOPAUSE", "-dUseCropBox", `-r${density}`];
  execFileSync(gs, [...common, "-sDEVICE=pngalpha", `-sOutputFile=${join(outputDir, `${stem}-page-%02d.png`)}`, source], { stdio: "inherit" });
  execFileSync(gs, [...common, "-sDEVICE=jpeg", "-dJPEGQ=92", `-sOutputFile=${join(outputDir, `${stem}-page-%02d.jpg`)}`, source], { stdio: "inherit" });
}

async function renderWithSips(source, outputDir, stem) {
  const sips = command("sips");
  if (!sips) throw new Error("sips is required to preview PSD assets on macOS.");
  execFileSync(sips, ["-s", "format", "png", source, "--out", join(outputDir, `${stem}-page-01.png`)], { stdio: "inherit" });
  execFileSync(sips, ["-s", "format", "jpeg", "-s", "formatOptions", "92", source, "--out", join(outputDir, `${stem}-page-01.jpg`)], { stdio: "inherit" });
}

const inputArg = arg("input");
const folderArg = arg("folder");
const slug = cleanSlug(arg("slug"));
const heroPage = Math.max(Number(arg("hero-page", "1")) || 1, 1);
const density = Math.min(Math.max(Number(arg("density", "180")) || 180, 72), 360);

if (!inputArg || !folderArg) {
  throw new Error("Usage: node scripts/process-adobe-assets.mjs --input /path/file.ai --folder BrandFolder --slug brand-slug [--hero-page 2]");
}

const input = resolve(inputArg);
const brandRoot = resolve(root, folderArg);
if (!existsSync(input)) throw new Error(`Adobe source file not found: ${input}`);
if (!brandRoot.startsWith(root)) throw new Error("--folder must resolve inside the repository.");

const sourceDir = join(brandRoot, "assets", "source");
const imageDir = join(brandRoot, "assets", "brand-images");
const manifestDir = join(brandRoot, "assets", "adobe-assets");
await Promise.all([mkdir(sourceDir, { recursive: true }), mkdir(imageDir, { recursive: true }), mkdir(manifestDir, { recursive: true })]);

const extension = extname(input).toLowerCase();
const sourceName = `${slug}-logo${extension}`;
const sourceCopy = join(sourceDir, sourceName);
await copyFile(input, sourceCopy);

if ([".ai", ".eps", ".ps", ".pdf"].includes(extension)) {
  await renderWithGhostscript(sourceCopy, imageDir, `${slug}-logo`, density);
} else if (extension === ".psd") {
  await renderWithSips(sourceCopy, imageDir, `${slug}-logo`);
} else {
  throw new Error(`Unsupported Adobe source format: ${extension}`);
}

const generatedNames = (await readdir(imageDir))
  .filter((name) => name.startsWith(`${slug}-logo-page-`) && [".png", ".jpg"].includes(extname(name).toLowerCase()))
  .sort();
const pages = new Map();
for (const name of generatedNames) {
  const match = name.match(/page-(\d+)\.(png|jpg)$/i);
  if (!match) continue;
  const page = Number(match[1]);
  const format = match[2].toLowerCase() === "png" ? "PNG" : "JPG";
  const full = join(imageDir, name);
  const item = { path: relative(root, full).replaceAll("\\", "/"), ...(await metadata(full, format)) };
  const record = pages.get(page) || { page };
  record[format.toLowerCase()] = item;
  pages.set(page, record);
}

const selected = pages.get(heroPage) || pages.values().next().value;
if (!selected?.png) throw new Error("Adobe rendering completed without a PNG preview.");
const heroPath = join(imageDir, `${slug}-brand-hero.png`);
await copyFile(resolve(root, selected.png.path), heroPath);

const sourceMeta = await stat(sourceCopy);
const manifest = {
  id: `${slug}-logo-source`,
  slug,
  title: basename(input, extension),
  source: {
    path: relative(root, sourceCopy).replaceAll("\\", "/"),
    format: extension.slice(1).toUpperCase(),
    bytes: sourceMeta.size,
    size: formatSize(sourceMeta.size),
  },
  preview: selected.png,
  hero: { path: relative(root, heroPath).replaceAll("\\", "/"), ...(await metadata(heroPath, "PNG")) },
  exports: [...pages.values()],
  generatedAt: new Date().toISOString(),
  pipeline: extension === ".psd" ? "sips" : "ghostscript",
};

const manifestPath = join(manifestDir, `${slug}-logo.json`);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ manifest: relative(root, manifestPath), pages: pages.size, heroPage: selected.page }, null, 2));

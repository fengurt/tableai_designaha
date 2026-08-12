import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const workDir = join(root, ".tmp", "font-library");
const sourceDir = join(workDir, "source");
const outputDir = join(workDir, "woff2");
const outputPath = join(root, "data", "fonts.json");
const mediaBase = process.env.MEDIA_BASE_URL || "https://media.apuch.art";
const upload = process.argv.includes("--upload");
const verifiedAt = process.env.FONT_VERIFIED_AT || new Date().toISOString().slice(0, 10);

const samples = {
  zh: "高楼宾客似曾识，日光底下无新事。让品牌成为可管理、可调用、可持续进化的系统。中文字体参考 0123456789 IPTrust Agent API MCP",
  en: "Brands become living systems. Build, express, govern, evolve. ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 IPTrust Agent API MCP",
  mono: "IPTrust / Agent / API / MCP / #EFE6D2 / 0123456789 / brand.system.evolve()",
};

const repositories = {
  noto: { repo: "notofonts/noto-cjk", ref: "main" },
  ibm: { repo: "IBM/plex", ref: "master" },
  inter: { repo: "rsms/inter", ref: "master" },
  google: { repo: "google/fonts", ref: "main" },
};

const definitions = [
  {
    id: "noto-sans-sc",
    name: "Noto Sans SC",
    nameZh: "思源黑体",
    family: "Noto Sans SC",
    group: "zh",
    scripts: ["Hans", "Latin"],
    category: { zh: "中文无衬线", en: "Simplified Chinese sans serif" },
    useCases: { zh: "界面、正文、品牌规范", en: "UI, body copy, brand guidelines" },
    sample: samples.zh,
    cssStack: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    license: { spdx: "OFL-1.1", name: "SIL Open Font License 1.1", url: "https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE" },
    source: { publisher: "Noto Fonts", projectUrl: "https://github.com/notofonts/noto-cjk/tree/main/Sans", repository: "noto" },
    files: [{ weight: "100 900", path: "google-fonts/NotoSansSC[wght].ttf" }],
  },
  {
    id: "noto-serif-sc",
    name: "Noto Serif SC",
    nameZh: "思源宋体",
    family: "Noto Serif SC",
    group: "zh",
    scripts: ["Hans", "Latin"],
    category: { zh: "中文衬线", en: "Simplified Chinese serif" },
    useCases: { zh: "标题、出版、文化叙事", en: "Display, publishing, cultural narratives" },
    sample: samples.zh,
    cssStack: '"Noto Serif SC", "Songti SC", SimSun, serif',
    license: { spdx: "OFL-1.1", name: "SIL Open Font License 1.1", url: "https://github.com/notofonts/noto-cjk/blob/main/Serif/LICENSE" },
    source: { publisher: "Noto Fonts", projectUrl: "https://github.com/notofonts/noto-cjk/tree/main/Serif", repository: "noto" },
    files: [{ weight: "100 900", path: "google-fonts/NotoSerifSC[wght].ttf" }],
  },
  {
    id: "ibm-plex-sans-sc",
    name: "IBM Plex Sans SC",
    nameZh: "IBM Plex 简体中文",
    family: "IBM Plex Sans SC",
    group: "zh",
    scripts: ["Hans", "Latin"],
    category: { zh: "中文现代无衬线", en: "Modern Simplified Chinese sans serif" },
    useCases: { zh: "科技品牌、数据界面、专业文档", en: "Technology brands, data UI, professional documents" },
    sample: samples.zh,
    cssStack: '"IBM Plex Sans SC", "PingFang SC", sans-serif',
    license: { spdx: "OFL-1.1", name: "SIL Open Font License 1.1", url: "https://github.com/IBM/plex/blob/master/LICENSE.txt" },
    source: { publisher: "IBM", projectUrl: "https://github.com/IBM/plex", repository: "ibm" },
    files: [
      { weight: "400", path: "packages/plex-sans-sc/fonts/complete/ttf/hinted/IBMPlexSansSC-Regular.ttf" },
      { weight: "600", path: "packages/plex-sans-sc/fonts/complete/ttf/hinted/IBMPlexSansSC-SemiBold.ttf" },
    ],
  },
  {
    id: "inter",
    name: "Inter",
    nameZh: "Inter",
    family: "Inter",
    group: "en",
    scripts: ["Latin", "Greek", "Cyrillic"],
    category: { zh: "英文界面无衬线", en: "Latin UI sans serif" },
    useCases: { zh: "英文界面、产品、屏幕正文", en: "Product UI and screen typography" },
    sample: samples.en,
    cssStack: 'Inter, "Helvetica Neue", Arial, sans-serif',
    license: { spdx: "OFL-1.1", name: "SIL Open Font License 1.1", url: "https://github.com/rsms/inter/blob/master/LICENSE.txt" },
    source: { publisher: "Rasmus Andersson", projectUrl: "https://github.com/rsms/inter", repository: "inter", release: "4.1" },
    files: [{ weight: "100 900", path: "docs/font-files/InterVariable.woff2" }],
  },
  {
    id: "ibm-plex-mono",
    name: "IBM Plex Mono",
    nameZh: "IBM Plex 等宽",
    family: "IBM Plex Mono",
    group: "mono",
    scripts: ["Latin", "Greek", "Cyrillic"],
    category: { zh: "英文等宽", en: "Latin monospace" },
    useCases: { zh: "API、数据、代码、资产编号", en: "APIs, data, code, asset identifiers" },
    sample: samples.mono,
    cssStack: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
    license: { spdx: "OFL-1.1", name: "SIL Open Font License 1.1", url: "https://github.com/IBM/plex/blob/master/LICENSE.txt" },
    source: { publisher: "IBM", projectUrl: "https://github.com/IBM/plex", repository: "ibm" },
    files: [
      { weight: "400", path: "packages/plex-mono/fonts/complete/woff2/IBMPlexMono-Regular.woff2" },
      { weight: "600", path: "packages/plex-mono/fonts/complete/woff2/IBMPlexMono-SemiBold.woff2" },
    ],
  },
  {
    id: "eb-garamond",
    name: "EB Garamond",
    nameZh: "EB Garamond",
    family: "EB Garamond",
    group: "en",
    scripts: ["Latin", "Greek", "Cyrillic"],
    category: { zh: "英文人文衬线", en: "Humanist Latin serif" },
    useCases: { zh: "出版、长文、文化与高端品牌", en: "Publishing, long-form, cultural and premium brands" },
    sample: samples.en,
    cssStack: '"EB Garamond", Garamond, Georgia, serif',
    license: { spdx: "OFL-1.1", name: "SIL Open Font License 1.1", url: "https://github.com/octaviopardo/EBGaramond12/blob/master/OFL.txt" },
    source: { publisher: "Octavio Pardo / Google Fonts", projectUrl: "https://github.com/octaviopardo/EBGaramond12", repository: "google" },
    files: [{ weight: "400 800", path: "ofl/ebgaramond/EBGaramond[wght].ttf" }],
  },
];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function json(url) {
  const response = await fetch(url, { headers: { "User-Agent": "IPTrust-Font-Sync/1.0 (+https://apuch.art)" } });
  if (!response.ok) throw new Error(`request_failed:${response.status}:${url}`);
  return response.json();
}

async function download(url, path) {
  if (existsSync(path)) return readFile(path);
  const response = await fetch(url, { headers: { "User-Agent": "IPTrust-Font-Sync/1.0 (+https://apuch.art)" } });
  if (!response.ok) throw new Error(`download_failed:${response.status}:${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(path, buffer);
  return buffer;
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", env: process.env });
  if (result.status !== 0) throw new Error(`command_failed:${command}:${args.join(" ")}`);
}

await mkdir(sourceDir, { recursive: true });
await mkdir(outputDir, { recursive: true });
await mkdir(dirname(outputPath), { recursive: true });

const revisions = {};
for (const [key, repository] of Object.entries(repositories)) {
  const commit = await json(`https://api.github.com/repos/${repository.repo}/commits/${repository.ref}`);
  revisions[key] = commit.sha;
}

const fonts = [];
for (const definition of definitions) {
  const repository = repositories[definition.source.repository];
  const revision = revisions[definition.source.repository];
  const assets = [];
  for (const [index, file] of definition.files.entries()) {
    const extension = extname(file.path) || ".font";
    const sourcePath = join(sourceDir, `${definition.id}-${index}${extension}`);
    const sourceUrl = `https://raw.githubusercontent.com/${repository.repo}/${revision}/${file.path.replaceAll("[", "%5B").replaceAll("]", "%5D")}`;
    const sourceBuffer = await download(sourceUrl, sourcePath);
    const subsetPath = join(outputDir, `${definition.id}-${String(file.weight).replaceAll(" ", "-")}.woff2`);
    const samplePath = join(workDir, `${definition.group}.txt`);
    await writeFile(samplePath, definition.sample);
    run(process.env.PYFTSUBSET || "pyftsubset", [
      sourcePath,
      `--output-file=${subsetPath}`,
      `--text-file=${samplePath}`,
      "--flavor=woff2",
      "--layout-features=*",
      "--name-IDs=*",
      "--name-legacy",
      "--name-languages=*",
      "--notdef-glyph",
      "--notdef-outline",
      "--recommended-glyphs",
    ]);
    const buffer = await readFile(subsetPath);
    const digest = sha256(buffer);
    const assetId = `font-${definition.id}-${String(file.weight).replaceAll(" ", "-")}`;
    const objectKey = `public/iptrust/${assetId}/${digest}/demo.woff2`;
    const asset = {
      id: assetId,
      weight: file.weight,
      style: "normal",
      mimeType: "font/woff2",
      bytes: buffer.length,
      sha256: digest,
      sourceSha256: sha256(sourceBuffer),
      sourceUrl,
      objectKey,
      mediaUrl: `${mediaBase}/${objectKey}`,
    };
    if (upload) {
      run("npx", ["wrangler", "r2", "object", "put", `iptrust-media-preview/${objectKey}`, "--remote", "--config", "edge/wrangler.toml", "--file", subsetPath, "--content-type", "font/woff2", "--cache-control", "public, max-age=31536000, immutable", "--force"]);
    }
    assets.push(asset);
  }
  fonts.push({
    id: definition.id,
    name: definition.name,
    nameZh: definition.nameZh,
    family: definition.family,
    group: definition.group,
    scripts: definition.scripts,
    category: definition.category,
    useCases: definition.useCases,
    sample: definition.sample,
    cssStack: definition.cssStack,
    weights: definition.files.map((file) => file.weight),
    license: definition.license,
    source: {
      publisher: definition.source.publisher,
      projectUrl: definition.source.projectUrl,
      repository: repository.repo,
      revision,
      release: definition.source.release || revision.slice(0, 12),
    },
    assets,
  });
}

const payload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  verifiedAt,
  name: "IPTrust Open-source Type Library",
  description: {
    zh: "采用开源许可证、允许商业使用与网页嵌入的中英文字体参考。",
    en: "Chinese and Latin type references licensed for commercial use and web embedding.",
  },
  licenseNotice: {
    zh: "字体版权归各自作者所有。商业使用、嵌入、修改与再分发须遵守对应许可证；字体文件不可单独售卖。",
    en: "Copyright remains with each font author. Commercial use, embedding, modification and redistribution must follow the applicable license; font files may not be sold by themselves.",
  },
  fonts,
};

await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, upload, fonts: fonts.length, assets: fonts.reduce((sum, font) => sum + font.assets.length, 0), bytes: fonts.flatMap((font) => font.assets).reduce((sum, asset) => sum + asset.bytes, 0), output: outputPath }, null, 2));

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
  zh: "高楼宾客似曾识，日光底下无新事",
  en: "高楼宾客似曾识，日光底下无新事",
  mono: "高楼宾客似曾识，日光底下无新事",
};

// Keep the existing broad glyph subset stable while presenting a concise specimen.
const subsetSamples = {
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

const googleOfl = (directory) => ({
  spdx: "OFL-1.1",
  name: "SIL Open Font License 1.1",
  url: `https://github.com/google/fonts/blob/main/ofl/${directory}/OFL.txt`,
});

function googleFont({ id, name, nameZh = name, group = "en", scripts = ["Latin"], categoryKey, category, useCases, directory, file, weight = "100 900", publisher = "Google Fonts" }) {
  return {
    id,
    name,
    nameZh,
    family: name,
    group,
    scripts,
    categoryKey,
    category,
    useCases,
    sample: samples[group] || samples.en,
    cssStack: `"${name}", ${categoryKey === "mono" ? '"SFMono-Regular", Consolas, monospace' : categoryKey === "serif" ? 'Georgia, serif' : '"Helvetica Neue", Arial, sans-serif'}`,
    license: googleOfl(directory),
    source: { publisher, projectUrl: `https://fonts.google.com/specimen/${encodeURIComponent(name).replaceAll("%20", "+")}`, repository: "google" },
    files: [{ weight, path: `ofl/${directory}/${file}` }],
  };
}

const definitions = [
  {
    id: "noto-sans-sc",
    name: "Noto Sans SC",
    nameZh: "思源黑体",
    family: "Noto Sans SC",
    group: "zh",
    categoryKey: "sans",
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
    categoryKey: "serif",
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
    categoryKey: "sans",
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
    categoryKey: "sans",
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
    categoryKey: "mono",
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
    categoryKey: "serif",
    scripts: ["Latin", "Greek", "Cyrillic"],
    category: { zh: "英文人文衬线", en: "Humanist Latin serif" },
    useCases: { zh: "出版、长文、文化与高端品牌", en: "Publishing, long-form, cultural and premium brands" },
    sample: samples.en,
    cssStack: '"EB Garamond", Garamond, Georgia, serif',
    license: { spdx: "OFL-1.1", name: "SIL Open Font License 1.1", url: "https://github.com/octaviopardo/EBGaramond12/blob/master/OFL.txt" },
    source: { publisher: "Octavio Pardo / Google Fonts", projectUrl: "https://github.com/octaviopardo/EBGaramond12", repository: "google" },
    files: [{ weight: "400 800", path: "ofl/ebgaramond/EBGaramond[wght].ttf" }],
  },
  googleFont({
    id: "zcool-xiaowei", name: "ZCOOL XiaoWei", nameZh: "站酷小薇体", group: "zh", scripts: ["Hans", "Latin"], categoryKey: "serif",
    category: { zh: "中文展示衬线", en: "Chinese display serif" }, useCases: { zh: "文化标题、包装、短句展示", en: "Cultural display, packaging and short headlines" },
    directory: "zcoolxiaowei", file: "ZCOOLXiaoWei-Regular.ttf", weight: "400", publisher: "ZCOOL / Google Fonts",
  }),
  googleFont({
    id: "zcool-qingke-huangyou", name: "ZCOOL QingKe HuangYou", nameZh: "站酷庆科黄油体", group: "zh", scripts: ["Hans", "Latin"], categoryKey: "display",
    category: { zh: "中文几何展示", en: "Chinese geometric display" }, useCases: { zh: "海报、餐饮、活动与年轻品牌", en: "Posters, food brands, events and youth culture" },
    directory: "zcoolqingkehuangyou", file: "ZCOOLQingKeHuangYou-Regular.ttf", weight: "400", publisher: "ZCOOL / Google Fonts",
  }),
  googleFont({
    id: "ma-shan-zheng", name: "Ma Shan Zheng", nameZh: "马善政毛笔楷书", group: "zh", scripts: ["Hans", "Latin"], categoryKey: "handwriting",
    category: { zh: "中文书写展示", en: "Chinese brush display" }, useCases: { zh: "文化项目、标题与有限字数的品牌表达", en: "Cultural projects, titles and short-form brand expression" },
    directory: "mashanzheng", file: "MaShanZheng-Regular.ttf", weight: "400",
  }),
  googleFont({
    id: "long-cang", name: "Long Cang", nameZh: "龙藏体", group: "zh", scripts: ["Hans", "Latin"], categoryKey: "handwriting",
    category: { zh: "中文书法展示", en: "Chinese calligraphic display" }, useCases: { zh: "传统文化、餐饮题字与短标题", en: "Heritage, food branding and short calligraphic titles" },
    directory: "longcang", file: "LongCang-Regular.ttf", weight: "400",
  }),
  googleFont({
    id: "roboto-flex", name: "Roboto Flex", categoryKey: "sans", category: { zh: "英文可变无衬线", en: "Variable Latin sans serif" },
    useCases: { zh: "响应式界面、产品与复杂排版系统", en: "Responsive UI, products and complex type systems" }, directory: "robotoflex", file: "RobotoFlex[GRAD,XOPQ,XTRA,YOPQ,YTAS,YTDE,YTFI,YTLC,YTUC,opsz,slnt,wdth,wght].ttf",
  }),
  googleFont({
    id: "open-sans", name: "Open Sans", scripts: ["Latin", "Greek", "Cyrillic", "Hebrew"], categoryKey: "sans", category: { zh: "英文易读无衬线", en: "Readable Latin sans serif" },
    useCases: { zh: "长正文、界面与公共信息", en: "Long-form copy, UI and public information" }, directory: "opensans", file: "OpenSans[wdth,wght].ttf",
  }),
  googleFont({
    id: "source-sans-3", name: "Source Sans 3", scripts: ["Latin", "Greek", "Cyrillic"], categoryKey: "sans", category: { zh: "英文专业无衬线", en: "Professional Latin sans serif" },
    useCases: { zh: "品牌系统、编辑排版与数字产品", en: "Brand systems, editorial layouts and digital products" }, directory: "sourcesans3", file: "SourceSans3[wght].ttf", publisher: "Adobe / Google Fonts",
  }),
  googleFont({
    id: "dm-sans", name: "DM Sans", categoryKey: "sans", category: { zh: "英文几何无衬线", en: "Geometric Latin sans serif" },
    useCases: { zh: "消费品牌、产品界面与短标题", en: "Consumer brands, product UI and short display" }, directory: "dmsans", file: "DMSans[opsz,wght].ttf",
  }),
  googleFont({
    id: "work-sans", name: "Work Sans", categoryKey: "sans", category: { zh: "英文屏幕无衬线", en: "Screen-first Latin sans serif" },
    useCases: { zh: "界面、信息设计与品牌正文", en: "UI, information design and brand copy" }, directory: "worksans", file: "WorkSans[wght].ttf",
  }),
  googleFont({
    id: "space-grotesk", name: "Space Grotesk", categoryKey: "display", category: { zh: "英文科技展示", en: "Technical Latin display sans" },
    useCases: { zh: "科技品牌、标题与数据产品", en: "Technology brands, headlines and data products" }, directory: "spacegrotesk", file: "SpaceGrotesk[wght].ttf", weight: "300 700",
  }),
  googleFont({
    id: "playfair-display", name: "Playfair Display", scripts: ["Latin", "Cyrillic"], categoryKey: "serif", category: { zh: "英文高对比衬线", en: "High-contrast Latin serif" },
    useCases: { zh: "出版、文化、酒店与编辑标题", en: "Publishing, culture, hospitality and editorial display" }, directory: "playfairdisplay", file: "PlayfairDisplay[wght].ttf", weight: "400 900",
  }),
  googleFont({
    id: "source-serif-4", name: "Source Serif 4", scripts: ["Latin", "Greek", "Cyrillic"], categoryKey: "serif", category: { zh: "英文正文衬线", en: "Text-focused Latin serif" },
    useCases: { zh: "报告、长文、出版与规范文件", en: "Reports, long-form, publishing and guidelines" }, directory: "sourceserif4", file: "SourceSerif4[opsz,wght].ttf", weight: "200 900", publisher: "Adobe / Google Fonts",
  }),
  googleFont({
    id: "jetbrains-mono", name: "JetBrains Mono", scripts: ["Latin", "Greek", "Cyrillic"], group: "mono", categoryKey: "mono", category: { zh: "英文开发等宽", en: "Developer monospace" },
    useCases: { zh: "代码、API 文档、数据和开发工具", en: "Code, API docs, data and developer tools" }, directory: "jetbrainsmono", file: "JetBrainsMono[wght].ttf", weight: "100 800", publisher: "JetBrains / Google Fonts",
  }),
  googleFont({
    id: "source-code-pro", name: "Source Code Pro", scripts: ["Latin", "Greek", "Cyrillic"], group: "mono", categoryKey: "mono", category: { zh: "英文信息等宽", en: "Information monospace" },
    useCases: { zh: "技术品牌、资产编号、代码与表格", en: "Technical brands, identifiers, code and tables" }, directory: "sourcecodepro", file: "SourceCodePro[wght].ttf", weight: "200 900", publisher: "Adobe / Google Fonts",
  }),
  googleFont({
    id: "google-sans-code", name: "Google Sans Code", scripts: ["Latin", "Greek", "Cyrillic"], group: "mono", categoryKey: "mono", category: { zh: "英文现代等宽", en: "Modern coding monospace" },
    useCases: { zh: "代码、Agent 输出与技术界面", en: "Code, agent output and technical interfaces" }, directory: "googlesanscode", file: "GoogleSansCode[wght].ttf", weight: "300 800",
  }),
];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function request(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "IPTrust-Font-Sync/1.0 (+https://apuch.art)" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`request_failed:${response.status}:${url}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function json(url) {
  return (await request(url)).json();
}

async function download(url, path) {
  if (existsSync(path)) return readFile(path);
  const response = await request(url);
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
    await writeFile(samplePath, subsetSamples[definition.group] || subsetSamples.en);
    await rm(subsetPath, { force: true });
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
    categoryKey: definition.categoryKey,
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
  licenseTypes: [
    {
      spdx: "OFL-1.1",
      name: "SIL Open Font License 1.1",
      commercial: true,
      url: "https://openfontlicense.org/",
      note: {
        zh: "允许商业使用、网页嵌入、修改与再分发；字体文件不可单独售卖，修改字体还须留意保留字体名称条款。",
        en: "Allows commercial use, web embedding, modification and redistribution. Font files may not be sold by themselves; Reserved Font Names may restrict modified naming.",
      },
    },
    {
      spdx: "Apache-2.0",
      name: "Apache License 2.0",
      commercial: true,
      url: "https://www.apache.org/licenses/LICENSE-2.0",
      note: {
        zh: "允许商业使用、修改与分发；再分发时须保留许可证与适用声明，商标权不随许可证授予。",
        en: "Allows commercial use, modification and distribution. Redistributions must retain the license and applicable notices; trademark rights are not granted.",
      },
    },
    {
      spdx: "UFL-1.0",
      name: "Ubuntu Font Licence 1.0",
      commercial: true,
      url: "https://ubuntu.com/legal/font-licence",
      note: {
        zh: "允许商业使用、嵌入、修改与分发；修改版本的命名与再分发须遵守原许可证。",
        en: "Allows commercial use, embedding, modification and distribution. Modified naming and redistribution remain subject to the original license.",
      },
    },
  ],
  directories: [
    { id: "google-fonts", name: "Google Fonts", url: "https://fonts.google.com/", note: { zh: "大规模开源字体目录，可按语言、分类与可变轴筛选。", en: "Large open-source catalog with language, category and variable-axis filters." } },
    { id: "google-fonts-source", name: "Google Fonts Source", url: "https://github.com/google/fonts", note: { zh: "字体文件、元数据和逐字体许可证的官方仓库。", en: "Official repository for files, metadata and per-family licenses." } },
    { id: "fontsource", name: "Fontsource", url: "https://fontsource.org/fonts", note: { zh: "大型开源字体包与可检索目录，提供自托管文件和逐字体许可证信息。", en: "Large searchable open-source catalog with self-hosting packages and per-family license data." } },
    { id: "noto", name: "Noto Fonts", url: "https://fonts.google.com/noto", note: { zh: "覆盖多语言与多书写系统的官方字体集合。", en: "Official collection spanning languages and writing systems." } },
    { id: "ibm-plex", name: "IBM Plex", url: "https://github.com/IBM/plex", note: { zh: "IBM 维护的开源字体家族与源文件。", en: "IBM-maintained open-source family and sources." } },
    { id: "sil-fonts", name: "SIL Fonts", url: "https://software.sil.org/fonts/", note: { zh: "由 SIL 维护、覆盖多语种的 OFL 字体目录。", en: "SIL-maintained OFL catalog with broad script coverage." } },
    { id: "adobe-fonts", name: "Adobe Open Source Fonts", url: "https://github.com/adobe-fonts", note: { zh: "Adobe Source 系列等开源字体的原始项目与发布文件。", en: "Original projects and releases for Adobe's open-source Source families and more." } },
    { id: "league", name: "The League of Moveable Type", url: "https://www.theleagueofmoveabletype.com/", note: { zh: "独立设计师开源字体合集，使用前查看每个项目的许可证。", en: "Independent open-source type foundry; check each project's license before use." } },
    { id: "velvetyne", name: "Velvetyne Type Foundry", url: "https://velvetyne.fr/", note: { zh: "实验性自由字体合集，提供项目源文件与许可证。", en: "Experimental libre type catalog with project sources and licenses." } },
  ],
  fonts,
};

await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, upload, fonts: fonts.length, assets: fonts.reduce((sum, font) => sum + font.assets.length, 0), bytes: fonts.flatMap((font) => font.assets).reduce((sum, asset) => sum + asset.bytes, 0), output: outputPath }, null, 2));

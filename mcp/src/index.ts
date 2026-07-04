import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, relative, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const BRANDS_PATH = resolve(REPO_ROOT, "config/brands.json");

type BrandConfig = {
  slug: string;
  folder: string;
  name: string;
  nativeName?: string;
  description: string;
  officialWebsite?: string;
  primaryGuide?: string;
  mainName?: string;
  mainLanguage?: string;
  display?: Record<string, { name: string; secondaryName?: string; language?: string }>;
  intro?: Record<string, string>;
  business?: Record<string, string>;
  notes?: Record<string, string>;
};

type Guide = {
  path: string;
  title: string;
  format: string;
  primary: boolean;
  text: string;
};

type Token = { $value?: unknown; $type?: string; $description?: string; [k: string]: unknown };

type BrandPayload = BrandConfig & {
  guides: Guide[];
  tokenFiles: string[];
};

function hasCjk(text = "") {
  return /[\u3400-\u9fff]/.test(text);
}

function zhName(brand: BrandConfig) {
  if (hasCjk(brand.name)) return brand.name;
  if (brand.nativeName && hasCjk(brand.nativeName)) return brand.nativeName;
  return brand.name;
}

function enName(brand: BrandConfig) {
  if (!hasCjk(brand.name)) return brand.name;
  if (brand.nativeName && /[A-Za-z]/.test(brand.nativeName)) {
    return brand.nativeName.replace(/\s*[·|｜/]\s*[\u3400-\u9fff].*$/, "").trim() || brand.nativeName;
  }
  return brand.name;
}

function mainLanguage(brand: BrandConfig) {
  if (brand.mainLanguage === "zh" || brand.mainLanguage === "en") return brand.mainLanguage;
  return hasCjk(brand.name) ? "zh" : "en";
}

function mainName(brand: BrandConfig) {
  return mainLanguage(brand) === "zh" ? zhName(brand) : enName(brand);
}

function secondaryName(primary: string, secondary: string) {
  return primary && secondary && primary !== secondary ? secondary : "";
}

function introLines(text = "") {
  return text
    .replace(/^---[\s\S]*?---/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\n+/)
    .map((line) => line.replace(/^#+\s*/, "").replace(/^[-*]\s*/, "").trim())
    .filter((line) => {
      if (!line) return false;
      if (/^(chinese name|english name|english descriptor):/i.test(line)) return false;
      if (/^(brand role|visual direction|agent notes|overview|purpose)$/i.test(line)) return false;
      if (/^use\s+/i.test(line)) return false;
      if (/[`]|\/|\\/.test(line)) return false;
      if (line.length < 18 && !/[。！？.!?]/.test(line)) return false;
      return true;
    });
}

function cjkRatio(text = "") {
  if (!text.length) return 0;
  return (text.match(/[\u3400-\u9fff]/g) || []).length / text.length;
}

function clipSentence(text = "", max = 170) {
  const clean = text.replace(/[#*_`>|]/g, "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const boundary = clean.slice(0, max).search(/[。！？.!?](?!.*[。！？.!?])/);
  if (boundary > 48) return clean.slice(0, boundary + 1);
  return `${clean.slice(0, max - 1).trim()}…`;
}

function liveIntro(brand: BrandConfig, guides: Guide[], lang: "zh" | "en") {
  const primary = guides.find((g) => g.primary) ?? guides[0];
  const lines = introLines(primary?.text || "");
  const fromGuide = lang === "zh"
    ? lines.find((line) => hasCjk(line) && line.length >= 24)
    : lines.find((line) => /[A-Za-z]/.test(line) && line.length >= 44 && cjkRatio(line) < 0.18);
  if (fromGuide && !/placeholder/i.test(fromGuide)) return clipSentence(fromGuide);
  if (lang === "zh") return `${zhName(brand)}的 IP 品牌系统，实时汇总最新规范、颜色、语气、资产与 Agent 可读源文件。`;
  return `${enName(brand)} brand system with live guidelines, colors, voice, assets, and agent-readable source files.`;
}

async function walk(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry === ".DS_Store") continue;
    const full = resolve(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) {
      files.push(...await walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function titleFromPath(path: string) {
  return path
    .split("/")
    .pop()
    ?.replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase()) ?? path;
}

function isGuide(path: string) {
  return [".md", ".html"].includes(extname(path).toLowerCase());
}

function isToken(path: string) {
  return path.includes("/tokens/") && [".json", ".css"].includes(extname(path).toLowerCase());
}

async function loadBrandConfigs(): Promise<BrandConfig[]> {
  return JSON.parse(await readFile(BRANDS_PATH, "utf8"));
}

async function loadBrand(slug: string): Promise<BrandPayload> {
  const configs = await loadBrandConfigs();
  const brand = configs.find((item) => item.slug === slug);
  if (!brand) throw new Error(`Unknown brand "${slug}"`);

  const files = await walk(resolve(REPO_ROOT, brand.folder));
  const guides: Guide[] = [];
  const tokenFiles: string[] = [];

  for (const full of files) {
    const rel = relative(REPO_ROOT, full).replaceAll("\\", "/");
    if (isGuide(rel)) {
      guides.push({
        path: rel,
        title: titleFromPath(rel),
        format: extname(rel).slice(1),
        primary: rel === brand.primaryGuide,
        text: await readFile(full, "utf8"),
      });
    }
    if (isToken(rel)) tokenFiles.push(rel);
  }

  guides.sort((a, b) => Number(b.primary) - Number(a.primary) || a.path.localeCompare(b.path));
  tokenFiles.sort((a, b) => a.localeCompare(b));
  const display = {
    default: { language: mainLanguage(brand), name: mainName(brand) },
    zh: { name: zhName(brand), secondaryName: secondaryName(zhName(brand), enName(brand)) },
    en: { name: enName(brand), secondaryName: secondaryName(enName(brand), zhName(brand)) },
  };
  const intro = {
    zh: liveIntro(brand, guides, "zh"),
    en: liveIntro(brand, guides, "en"),
  };
  const notes = {
    zh: brand.notes?.zh ?? "",
    en: brand.notes?.en ?? "",
  };
  return { ...brand, mainName: mainName(brand), mainLanguage: mainLanguage(brand), display, intro, notes, guides, tokenFiles };
}

function flattenJsonTokens(obj: Record<string, any>, prefix = "", groupType?: string): Record<string, Token> {
  const out: Record<string, Token> = {};
  const type = (obj.$type as string) ?? groupType;
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === "object" && "$value" in val) {
      out[path] = { ...val, $type: (val.$type as string) ?? type };
    } else if (val && typeof val === "object") {
      Object.assign(out, flattenJsonTokens(val, path, type));
    }
  }
  return out;
}

function flattenCssTokens(text: string): Record<string, Token> {
  const out: Record<string, Token> = {};
  for (const match of text.matchAll(/--([a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g)) {
    const name = match[1].replaceAll("-", ".");
    const value = match[2].trim();
    out[name] = {
      $value: value,
      $type: /^#|rgb|oklch|hsl/.test(value) ? "color" : "unknown",
      $description: `CSS custom property --${match[1]}`,
    };
  }
  return out;
}

async function loadTokens(slug: string): Promise<Record<string, Token>> {
  const brand = await loadBrand(slug);
  const out: Record<string, Token> = {};

  for (const rel of brand.tokenFiles) {
    const full = resolve(REPO_ROOT, rel);
    const text = await readFile(full, "utf8");
    if (rel.endsWith(".json")) {
      Object.assign(out, flattenJsonTokens(JSON.parse(text)));
    } else if (rel.endsWith(".css")) {
      Object.assign(out, flattenCssTokens(text));
    }
  }

  return out;
}

const brandConfigs = await loadBrandConfigs();
const server = new McpServer({ name: "tableai-designaha", version: "0.2.0" });

for (const brand of brandConfigs) {
  server.registerResource(
    `${brand.slug}-brand`,
    `brand://${brand.slug}`,
    {
      title: `${brand.name} brand guidelines`,
      description: brand.description,
      mimeType: "application/json",
    },
    async (uri) => {
      const payload = await loadBrand(brand.slug);
      return {
        contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(payload, null, 2) }],
      };
    }
  );
}

server.registerTool(
  "list_brands",
  {
    title: "List Table AI Alliance brands",
    description: "List available brand design systems and placeholder brand folders.",
    inputSchema: {},
  },
  async () => {
    const brands = await Promise.all(brandConfigs.map((brand) => loadBrand(brand.slug)));
    return {
      content: [{
        type: "text",
        text: brands.map((brand) => `${brand.slug}\t${brand.display?.en?.name ?? brand.name}\t${brand.display?.zh?.name ?? brand.nativeName ?? ""}\t${brand.intro?.en ?? brand.description}`).join("\n"),
      }],
    };
  }
);

server.registerTool(
  "get_brand",
  {
    title: "Get a brand design system",
    description: "Return a brand summary, guideline paths, and token file paths.",
    inputSchema: { slug: z.string().describe("Brand slug, e.g. kind, tableai, vanahom") },
  },
  async ({ slug }) => {
    const brand = await loadBrand(slug);
    return {
      content: [{ type: "text", text: JSON.stringify({ ...brand, guides: brand.guides.map(({ text, ...g }) => g) }, null, 2) }],
    };
  }
);

server.registerTool(
  "get_guideline",
  {
    title: "Get brand guideline text",
    description: "Return the primary guideline or a specific guideline path for a brand.",
    inputSchema: {
      slug: z.string().describe("Brand slug"),
      path: z.string().optional().describe("Optional exact guideline path"),
    },
  },
  async ({ slug, path }) => {
    const brand = await loadBrand(slug);
    const guide = path ? brand.guides.find((item) => item.path === path) : brand.guides[0];
    if (!guide) {
      return { content: [{ type: "text", text: `No guideline found for ${slug}${path ? ` at ${path}` : ""}.` }], isError: true };
    }
    return { content: [{ type: "text", text: guide.text }] };
  }
);

server.registerTool(
  "list_tokens",
  {
    title: "List brand tokens",
    description: "List token names for a brand, optionally filtered by dotted group prefix.",
    inputSchema: {
      slug: z.string().describe("Brand slug"),
      group: z.string().optional().describe("Optional token prefix"),
    },
  },
  async ({ slug, group }) => {
    const flat = await loadTokens(slug);
    const names = Object.keys(flat).filter((name) => !group || name.startsWith(group));
    return { content: [{ type: "text", text: names.join("\n") || `No tokens found for ${slug}.` }] };
  }
);

server.registerTool(
  "get_token",
  {
    title: "Get a brand token",
    description: "Resolve a token by dotted name for a brand.",
    inputSchema: {
      slug: z.string().describe("Brand slug"),
      name: z.string().describe("Dotted token name, e.g. color.teal"),
    },
  },
  async ({ slug, name }) => {
    const flat = await loadTokens(slug);
    const token = flat[name];
    if (!token) {
      const suggestions = Object.keys(flat).filter((key) => key.includes(name.split(".").pop() ?? "")).slice(0, 8);
      return {
        content: [{ type: "text", text: `Token "${name}" not found for ${slug}.${suggestions.length ? ` Did you mean: ${suggestions.join(", ")}?` : ""}` }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: JSON.stringify({ slug, name, ...token }, null, 2) }] };
  }
);

server.registerTool(
  "validate_color",
  {
    title: "Validate a color against a brand palette",
    description: "Check whether a hex color is an exact brand token color.",
    inputSchema: {
      slug: z.string().describe("Brand slug"),
      hex: z.string().describe("Hex color, e.g. #0E8C7B"),
    },
  },
  async ({ slug, hex }) => {
    const flat = await loadTokens(slug);
    const target = hex.trim().toLowerCase();
    const colors = Object.entries(flat).filter(([, token]) => token.$type === "color" && typeof token.$value === "string");
    const match = colors.find(([, token]) => String(token.$value).toLowerCase() === target);
    if (match) {
      return { content: [{ type: "text", text: `${hex} is on-brand for ${slug}: ${match[0]} (${match[1].$description ?? ""})` }] };
    }
    const palette = colors.map(([name, token]) => `${name}: ${token.$value}`).join("\n");
    return { content: [{ type: "text", text: `${hex} is not an exact ${slug} brand color.${palette ? ` Use one of:\n${palette}` : " No palette tokens are available yet."}` }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("tableai-designaha MCP failed to start:", err);
  process.exit(1);
});

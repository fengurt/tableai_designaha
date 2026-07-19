import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createDecipheriv, createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, relative, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const BRANDS_PATH = resolve(REPO_ROOT, "config/brands.json");
const IP_SYSTEM_PATH = resolve(REPO_ROOT, "IP-System/ip_sys.md");
const LIBRARY_ROOT = resolve(REPO_ROOT, "data/library");
const PRIVATE_SKILL_PATHS = [
  resolve(REPO_ROOT, "site/api/private/ksamint-skills.enc.json"),
  resolve(REPO_ROOT, "ksamint/private/guofeng-writing-style.enc.json"),
];

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
  classification?: Record<string, Record<string, string[]>>;
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
  assetKey: string;
  guides: Guide[];
  tokenFiles: string[];
};

type BrandKeyInput = {
  assetKey?: string;
  slug?: string;
};

type PrivateSkill = {
  id: string;
  title: string;
  order: number;
  format: string;
  content: string;
};

type PrivateSkillPayload = {
  assetKey: string;
  source: string;
  updatedAt: string;
  skills: PrivateSkill[];
};

type EncryptedPrivateSkills = {
  version: number;
  algorithm: "AES-256-GCM-SHA256";
  iv: string;
  tag: string;
  ciphertext: string;
};

type LibraryOrganization = {
  id: string; slug: string; name: string; nativeName?: string; description?: string;
  officialWebsite?: string; logoUrl?: string; logoSourceUrl?: string; country?: string;
  headquarters?: string; industry?: string; ticker?: string; verificationStatus?: string;
  sourceId: string; sourceUrl: string; sourcePublisher: string; sourceDate?: string;
  fetchedAt?: string; rank?: number; year?: number; metadata?: Record<string, unknown>;
};

type LibraryItem = {
  id: string; slug: string; type: "case" | "report" | "dataset";
  title: { zh?: string; en?: string }; summary?: { zh?: string; en?: string };
  sourceUrl?: string; sourcePublisher?: string; publishedAt?: string; access?: string;
  externalUrl?: string; verificationStatus?: string; metadata?: Record<string, unknown>;
};

type LibraryRelation = {
  id: string; fromType: string; fromId: string; toType: string; toId: string; relation: string; note?: string;
};

const brandKeyInputSchema = {
  assetKey: z.string().optional().describe("IP ID / asset key, e.g. kind, tableai, vanahom"),
  slug: z.string().optional().describe("Deprecated alias for assetKey."),
};

function resolveBrandKey(input: BrandKeyInput) {
  const key = input.assetKey || input.slug;
  if (!key) throw new Error("Missing IP ID / asset key.");
  return key;
}

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
  return { ...brand, assetKey: brand.slug, mainName: mainName(brand), mainLanguage: mainLanguage(brand), display, intro, notes, guides, tokenFiles };
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

function privateSkillSecret() {
  return process.env.KSAMINT_SKILL_KEY || process.env.RESOURCE_ENCRYPTION_KEY || process.env.ADMIN_API_KEY;
}

function decryptPrivateSkills(payload: EncryptedPrivateSkills, secret: string): PrivateSkillPayload {
  if (payload.algorithm !== "AES-256-GCM-SHA256") throw new Error("Unsupported private skill cipher.");
  const key = createHash("sha256").update(secret).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const text = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(text) as PrivateSkillPayload;
}

async function loadPrivateSkills(assetKey = "ksamint") {
  if (assetKey !== "ksamint") throw new Error(`Private skills are not configured for "${assetKey}".`);
  const secret = privateSkillSecret();
  if (!secret) throw new Error("Private skill access requires KSAMINT_SKILL_KEY, RESOURCE_ENCRYPTION_KEY, or ADMIN_API_KEY.");
  const path = PRIVATE_SKILL_PATHS.find((candidate) => existsSync(candidate));
  if (!path) throw new Error("Encrypted ksamint skill payload is not present in this checkout.");
  const encrypted = JSON.parse(await readFile(path, "utf8")) as EncryptedPrivateSkills;
  return decryptPrivateSkills(encrypted, secret);
}

async function readLibraryFile<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(resolve(LIBRARY_ROOT, `${name}.json`), "utf8")) as T;
}

async function loadLibrary() {
  const [sources, organizations, cases, reports, datasets, relations] = await Promise.all([
    readLibraryFile<Record<string, unknown>[]>("sources"),
    readLibraryFile<LibraryOrganization[]>("organizations"),
    readLibraryFile<LibraryItem[]>("cases"),
    readLibraryFile<LibraryItem[]>("reports"),
    readLibraryFile<LibraryItem[]>("datasets"),
    readLibraryFile<LibraryRelation[]>("relations"),
  ]);
  return { sources, organizations, cases, reports, datasets, relations };
}

function publicLibraryItem(item: LibraryItem) {
  return { ...item, fileUrl: undefined, fileKey: undefined };
}

function searchable(value: unknown) {
  return JSON.stringify(value).toLowerCase();
}

const brandConfigs = await loadBrandConfigs();
const server = new McpServer({ name: "tableai-designaha", version: "0.2.0" });

server.registerResource(
  "ip-system",
  "framework://ip-system-v2",
  {
    title: "Brand IP System v2",
    description: "Universal closed-loop framework for defining and governing organization or brand IP systems.",
    mimeType: "text/markdown",
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/markdown", text: await readFile(IP_SYSTEM_PATH, "utf8") }],
  })
);

server.registerResource(
  "public-library",
  "library://index",
  {
    title: "IPTrust public knowledge library",
    description: "Source-backed organizations, cases, reports, datasets, and links to owned IPs.",
    mimeType: "application/json",
  },
  async (uri) => {
    const library = await loadLibrary();
    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify({
          sources: library.sources,
          counts: {
            organizations: library.organizations.length,
            cases: library.cases.length,
            reports: library.reports.length,
            datasets: library.datasets.length,
            relations: library.relations.length,
          },
        }, null, 2),
      }],
    };
  }
);

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
        text: brands.map((brand) => `${brand.assetKey}\t${brand.display?.en?.name ?? brand.name}\t${brand.display?.zh?.name ?? brand.nativeName ?? ""}\t${brand.intro?.en ?? brand.description}`).join("\n"),
      }],
    };
  }
);

server.registerTool(
  "get_brand",
  {
    title: "Get a brand design system",
    description: "Return a brand summary, guideline paths, and token file paths.",
    inputSchema: brandKeyInputSchema,
  },
  async (input) => {
    const assetKey = resolveBrandKey(input);
    const brand = await loadBrand(assetKey);
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
      ...brandKeyInputSchema,
      path: z.string().optional().describe("Optional exact guideline path"),
    },
  },
  async (input) => {
    const assetKey = resolveBrandKey(input);
    const { path } = input;
    const brand = await loadBrand(assetKey);
    const guide = path ? brand.guides.find((item) => item.path === path) : brand.guides[0];
    if (!guide) {
      return { content: [{ type: "text", text: `No guideline found for ${assetKey}${path ? ` at ${path}` : ""}.` }], isError: true };
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
      ...brandKeyInputSchema,
      group: z.string().optional().describe("Optional token prefix"),
    },
  },
  async (input) => {
    const assetKey = resolveBrandKey(input);
    const { group } = input;
    const flat = await loadTokens(assetKey);
    const names = Object.keys(flat).filter((name) => !group || name.startsWith(group));
    return { content: [{ type: "text", text: names.join("\n") || `No tokens found for ${assetKey}.` }] };
  }
);

server.registerTool(
  "get_token",
  {
    title: "Get a brand token",
    description: "Resolve a token by dotted name for a brand.",
    inputSchema: {
      ...brandKeyInputSchema,
      name: z.string().describe("Dotted token name, e.g. color.teal"),
    },
  },
  async (input) => {
    const assetKey = resolveBrandKey(input);
    const { name } = input;
    const flat = await loadTokens(assetKey);
    const token = flat[name];
    if (!token) {
      const suggestions = Object.keys(flat).filter((key) => key.includes(name.split(".").pop() ?? "")).slice(0, 8);
      return {
        content: [{ type: "text", text: `Token "${name}" not found for ${assetKey}.${suggestions.length ? ` Did you mean: ${suggestions.join(", ")}?` : ""}` }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: JSON.stringify({ assetKey, name, ...token }, null, 2) }] };
  }
);

server.registerTool(
  "validate_color",
  {
    title: "Validate a color against a brand palette",
    description: "Check whether a hex color is an exact brand token color.",
    inputSchema: {
      ...brandKeyInputSchema,
      hex: z.string().describe("Hex color, e.g. #0E8C7B"),
    },
  },
  async (input) => {
    const assetKey = resolveBrandKey(input);
    const { hex } = input;
    const flat = await loadTokens(assetKey);
    const target = hex.trim().toLowerCase();
    const colors = Object.entries(flat).filter(([, token]) => token.$type === "color" && typeof token.$value === "string");
    const match = colors.find(([, token]) => String(token.$value).toLowerCase() === target);
    if (match) {
      return { content: [{ type: "text", text: `${hex} is on-brand for ${assetKey}: ${match[0]} (${match[1].$description ?? ""})` }] };
    }
    const palette = colors.map(([name, token]) => `${name}: ${token.$value}`).join("\n");
    return { content: [{ type: "text", text: `${hex} is not an exact ${assetKey} brand color.${palette ? ` Use one of:\n${palette}` : " No palette tokens are available yet."}` }] };
  }
);

server.registerTool(
  "search_library",
  {
    title: "Search the IPTrust knowledge library",
    description: "Search source-backed organizations, cases, reports, and datasets. Results include provenance metadata.",
    inputSchema: {
      query: z.string().min(1).describe("Search text, organization name, industry, title, or topic."),
      type: z.enum(["all", "organization", "case", "report", "dataset"]).optional().describe("Optional library type."),
      source: z.string().optional().describe("Optional source id, e.g. fortune-global-500-2025."),
      limit: z.number().int().min(1).max(100).optional().describe("Maximum results. Defaults to 20."),
    },
  },
  async (input) => {
    const library = await loadLibrary();
    const q = input.query.toLowerCase();
    const limit = input.limit ?? 20;
    const organizations = input.type && !["all", "organization"].includes(input.type) ? [] : library.organizations
      .filter((item) => (!input.source || item.sourceId === input.source) && searchable(item).includes(q))
      .map((item) => ({ type: "organization", ...item }));
    const itemCollections = [library.cases, library.reports, library.datasets].flat()
      .filter((item) => (!input.type || input.type === "all" || item.type === input.type) && searchable(item).includes(q))
      .map(publicLibraryItem);
    return { content: [{ type: "text", text: JSON.stringify([...organizations, ...itemCollections].slice(0, limit), null, 2) }] };
  }
);

server.registerTool(
  "list_library",
  {
    title: "List IPTrust library records",
    description: "List a public library collection with stable ids and provenance.",
    inputSchema: {
      type: z.enum(["organization", "case", "report", "dataset"]).describe("Library collection."),
      source: z.string().optional().describe("Optional organization source id."),
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).optional(),
    },
  },
  async (input) => {
    const library = await loadLibrary();
    const offset = input.offset ?? 0;
    const limit = input.limit ?? 50;
    const collection = input.type === "organization"
      ? library.organizations.filter((item) => !input.source || item.sourceId === input.source)
      : library[`${input.type}s` as "cases" | "reports" | "datasets"].map(publicLibraryItem);
    return { content: [{ type: "text", text: JSON.stringify({ type: input.type, total: collection.length, offset, limit, items: collection.slice(offset, offset + limit) }, null, 2) }] };
  }
);

server.registerTool(
  "get_library_item",
  {
    title: "Get an IPTrust library record",
    description: "Resolve one organization, case, report, or dataset by stable id.",
    inputSchema: {
      type: z.enum(["organization", "case", "report", "dataset"]),
      id: z.string().describe("Stable library id."),
    },
  },
  async (input) => {
    const library = await loadLibrary();
    const collection = input.type === "organization"
      ? library.organizations
      : library[`${input.type}s` as "cases" | "reports" | "datasets"];
    const item = collection.find((entry) => entry.id === input.id || entry.slug === input.id);
    if (!item) return { content: [{ type: "text", text: `Library item "${input.id}" was not found.` }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(input.type === "organization" ? item : publicLibraryItem(item as LibraryItem), null, 2) }] };
  }
);

server.registerTool(
  "get_related",
  {
    title: "Get linked IPTrust records",
    description: "Find cases, reports, datasets, public organizations, or owned IPs linked to one entity.",
    inputSchema: {
      entityType: z.enum(["owned-ip", "organization", "case", "report", "dataset"]),
      entityId: z.string().describe("Stable IP or library id."),
    },
  },
  async (input) => {
    const library = await loadLibrary();
    const relations = library.relations.filter((item) =>
      (item.fromType === input.entityType && item.fromId === input.entityId)
      || (item.toType === input.entityType && item.toId === input.entityId));
    return { content: [{ type: "text", text: JSON.stringify(relations, null, 2) }] };
  }
);

server.registerTool(
  "list_private_skills",
  {
    title: "List protected ksamint skills",
    description: "List encrypted private skill metadata. Content is only available through get_private_skill.",
    inputSchema: {
      assetKey: z.literal("ksamint").optional().describe("Protected IP ID. Currently only ksamint is supported."),
    },
  },
  async (input) => {
    try {
      const payload = await loadPrivateSkills(input.assetKey ?? "ksamint");
      const skills = payload.skills.map(({ content, ...skill }) => skill);
      return { content: [{ type: "text", text: JSON.stringify({ ...payload, skills }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error instanceof Error ? error.message : "Private skills are unavailable." }], isError: true };
    }
  }
);

server.registerTool(
  "get_private_skill",
  {
    title: "Get a protected ksamint skill",
    description: "Decrypt and return one private skill by id. Requires a local private skill secret.",
    inputSchema: {
      assetKey: z.literal("ksamint").optional().describe("Protected IP ID. Currently only ksamint is supported."),
      id: z.string().describe("Private skill id from list_private_skills."),
    },
  },
  async (input) => {
    try {
      const payload = await loadPrivateSkills(input.assetKey ?? "ksamint");
      const skill = payload.skills.find((item) => item.id === input.id);
      if (!skill) {
        return { content: [{ type: "text", text: `Private skill "${input.id}" was not found.` }], isError: true };
      }
      return { content: [{ type: "text", text: JSON.stringify({ assetKey: payload.assetKey, ...skill }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error instanceof Error ? error.message : "Private skill is unavailable." }], isError: true };
    }
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

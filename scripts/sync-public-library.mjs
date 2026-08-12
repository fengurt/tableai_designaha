import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDir = join(root, "data/library");
const enrich = process.argv.includes("--enrich");
const fortuneUrl = "https://fortune.com/ranking/global500/?level=1";
const sasacUrl = "https://wap.sasac.gov.cn/n2588045/n27271785/n27271792/c14159097/content.html";
const fetchedAt = new Date().toISOString();

const sasacNames = [
  "中国核工业集团有限公司", "中国航天科技集团有限公司", "中国航天科工集团有限公司", "中国航空工业集团有限公司",
  "中国船舶集团有限公司", "中国兵器工业集团有限公司", "中国兵器装备集团有限公司", "中国电子科技集团有限公司",
  "中国航空发动机集团有限公司", "中国融通资产管理集团有限公司", "中国石油天然气集团有限公司", "中国石油化工集团有限公司",
  "中国海洋石油集团有限公司", "国家石油天然气管网集团有限公司", "国家电网有限公司", "中国南方电网有限责任公司",
  "中国华能集团有限公司", "中国大唐集团有限公司", "中国华电集团有限公司", "国家电力投资集团有限公司",
  "中国长江三峡集团有限公司", "中国雅江集团有限公司", "国家能源投资集团有限责任公司", "中国电信集团有限公司",
  "中国联合网络通信集团有限公司", "中国移动通信集团有限公司", "中国卫星网络集团有限公司", "中国电子信息产业集团有限公司",
  "中国第一汽车集团有限公司", "东风汽车集团有限公司", "中国一重集团有限公司", "中国机械工业集团有限公司",
  "哈尔滨电气集团有限公司", "中国东方电气集团有限公司", "鞍钢集团有限公司", "中国宝武钢铁集团有限公司",
  "中国矿产资源集团有限公司", "中国铝业集团有限公司", "中国远洋海运集团有限公司", "中国航空集团有限公司",
  "中国东方航空集团有限公司", "中国南方航空集团有限公司", "中国中化控股有限责任公司", "中粮集团有限公司",
  "中国五矿集团有限公司", "中国通用技术（集团）控股有限责任公司", "中国建筑集团有限公司", "中国储备粮管理集团有限公司",
  "中国南水北调集团有限公司", "国家开发投资集团有限公司", "招商局集团有限公司", "华润（集团）有限公司",
  "中国旅游集团有限公司（香港中旅（集团）有限公司）", "中国商用飞机有限责任公司", "中国节能环保集团有限公司", "中国国际工程咨询有限公司",
  "中国诚通控股集团有限公司", "中国中煤能源集团有限公司", "中国煤炭科工集团有限公司", "中国机械科学研究总院集团有限公司",
  "中国钢研科技集团有限公司", "中国化学工程集团有限公司", "中国盐业集团有限公司", "中国建材集团有限公司",
  "中国有色矿业集团有限公司", "中国稀土集团有限公司", "中国资源循环集团有限公司", "中国有研科技集团有限公司",
  "矿冶科技集团有限公司", "中国国际技术智力合作集团有限公司", "中国建筑科学研究院有限公司", "中国中车集团有限公司",
  "中国长安汽车集团有限公司", "中国铁路通信信号集团有限公司", "中国铁路工程集团有限公司", "中国铁道建筑集团有限公司",
  "中国交通建设集团有限公司", "中国信息通信科技集团有限公司", "中国农业发展集团有限公司", "中国林业集团有限公司",
  "中国医药集团有限公司", "中国保利集团有限公司", "中国建设科技有限公司", "中国冶金地质总局",
  "中国煤炭地质总局", "新兴际华集团有限公司", "中国民航信息集团有限公司", "中国航空器材集团有限公司",
  "中国电力建设集团有限公司", "中国能源建设集团有限公司", "中国安能建设集团有限公司",
  "中国黄金集团有限公司", "中国广核集团有限公司", "华侨城集团有限公司", "南光（集团）有限公司（中国南光集团有限公司）",
  "中国电气装备集团有限公司", "中国物流集团有限公司", "中国国新控股有限责任公司", "中国检验认证（集团）有限公司"
];

function stripHtml(value = "") {
  return String(value).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function slugify(value = "") {
  const ascii = value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return ascii || `org-${createHash("sha1").update(value).digest("hex").slice(0, 12)}`;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "IPTrust-Library-Sync/1.0 (+https://apuch.art/library)" } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

function nextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  return match ? JSON.parse(match[1]) : null;
}

function rankingItems(html) {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const payload = JSON.parse(match[1]);
      const candidates = Array.isArray(payload) ? payload : [payload];
      const found = candidates.find((item) => Array.isArray(item?.itemListElement) && item.itemListElement.length >= 500);
      if (found) return found.itemListElement;
    } catch {}
  }
  throw new Error("Fortune Global 500 JSON-LD list was not found.");
}

async function mapLimit(items, limit, mapper) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return output;
}

async function enrichFortune(item) {
  try {
    const html = await fetchText(item.sourceUrl);
    const company = nextData(html)?.props?.pageProps?.company;
    const info = company?.companyInfo || {};
    const website = info.Website || "";
    let fallbackLogoUrl = "";
    try { fallbackLogoUrl = website ? new URL("/favicon.ico", website).href : ""; } catch {}
    return {
      ...item,
      description: stripHtml(company?.description || company?.metaDescription || ""),
      officialWebsite: website,
      logoSourceUrl: "",
      logoSource: "monogram",
      logoProvider: "",
      logoQuality: "fallback",
      logoStatus: "pending",
      logoProvenanceUrl: website,
      fallbackLogoUrl,
      country: info.Country || "",
      headquarters: info.Headquarters || "",
      industry: info.Industry || "",
      ticker: info.Ticker || "",
      metadata: { ceo: info.CEO || "", employees: info["Number of employees"] || "", companyType: info["Company type"] || "" },
    };
  } catch (error) {
    return { ...item, verificationStatus: "ranking-verified", enrichmentError: error.message };
  }
}

await mkdir(dataDir, { recursive: true });
let previousOrganizations = [];
try { previousOrganizations = JSON.parse(await readFile(join(dataDir, "organizations.json"), "utf8")); } catch {}
const previousById = new Map(previousOrganizations.map((item) => [item.id, item]));
const rankingHtml = await fetchText(fortuneUrl);
const fortune = rankingItems(rankingHtml).slice(0, 500).map((entry) => {
  const name = entry.item?.name || `Global 500 #${entry.position}`;
  const id = `fortune-${slugify(name)}`;
  const previous = previousById.get(id) || {};
  return {
    id,
    slug: slugify(name),
    name,
    nativeName: "",
    mainLanguage: "en",
    description: "",
    officialWebsite: "",
    logoUrl: previous.logoUrl || "",
    logoSourceUrl: previous.logoSourceUrl || "",
    logoSource: previous.logoSource || "monogram",
    logoProvider: previous.logoProvider || "",
    logoQuality: previous.logoQuality || "fallback",
    logoStatus: previous.logoStatus || "pending",
    logoProvenanceUrl: previous.logoProvenanceUrl || "",
    fallbackLogoUrl: previous.fallbackLogoUrl || "",
    country: "",
    headquarters: "",
    industry: "",
    ticker: "",
    verificationStatus: "ranking-verified",
    sourceId: "fortune-global-500-2025",
    sourceUrl: entry.item?.["@id"] || fortuneUrl,
    sourcePublisher: "Fortune",
    sourceDate: "2025",
    fetchedAt,
    rank: Number(entry.position),
    year: 2025,
    metadata: {},
  };
});

const fortuneRecords = enrich ? await mapLimit(fortune, 6, enrichFortune) : fortune;
const sasacRecords = sasacNames.map((name, index) => {
  const id = `sasac-${String(index + 1).padStart(3, "0")}`;
  const previous = previousById.get(id) || {};
  return ({
  id,
  slug: `sasac-${String(index + 1).padStart(3, "0")}`,
  name,
  nativeName: "",
  mainLanguage: "zh",
  description: "国务院国资委履行出资人职责的中央企业。",
  officialWebsite: "",
  logoUrl: previous.logoUrl || "",
  logoSourceUrl: previous.logoSourceUrl || "",
  logoSource: previous.logoSource || "monogram",
  logoProvider: previous.logoProvider || "",
  logoQuality: previous.logoQuality || "fallback",
  logoStatus: previous.logoStatus || "pending",
  logoProvenanceUrl: previous.logoProvenanceUrl || sasacUrl,
  fallbackLogoUrl: previous.fallbackLogoUrl || "",
  country: "中国",
  headquarters: "",
  industry: "中央企业",
  ticker: "",
  verificationStatus: "government-verified",
  sourceId: "sasac-central-enterprises-2026",
  sourceUrl: sasacUrl,
  sourcePublisher: "国务院国有资产监督管理委员会",
  sourceDate: "2026-07-11",
  fetchedAt,
  rank: index + 1,
  year: 2026,
  metadata: {},
  });
});

const records = [...fortuneRecords, ...sasacRecords];
await writeFile(join(dataDir, "organizations.json"), `${JSON.stringify(records, null, 2)}\n`);
await writeFile(join(dataDir, "sync.json"), `${JSON.stringify({ fetchedAt, enriched: enrich, counts: { fortuneGlobal500: fortuneRecords.length, sasac: sasacRecords.length, total: records.length }, sources: JSON.parse(await readFile(join(dataDir, "sources.json"), "utf8")) }, null, 2)}\n`);
console.log(`Synced ${records.length} public organizations (${fortuneRecords.length} Fortune, ${sasacRecords.length} SASAC).`);

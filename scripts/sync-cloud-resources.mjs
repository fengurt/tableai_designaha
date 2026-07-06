import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");
const outPath = resolve(repoRoot, "data/cloud-resources.enc.json");
const siteOutPath = resolve(repoRoot, "site/api/cloud-resources.enc.json");
const now = new Date();

function safeJson(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function runJson(command, args, options = {}) {
  const { stdout } = await execFileAsync(command, args, {
    cwd: repoRoot,
    timeout: options.timeout ?? 30000,
    maxBuffer: options.maxBuffer ?? 20 * 1024 * 1024,
    env: { ...process.env, ...(options.env ?? {}) },
  });
  return safeJson(stdout, {});
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const timestamp = Date.parse(dateValue);
  if (Number.isNaN(timestamp)) return null;
  return Math.ceil((timestamp - now.getTime()) / 86400000);
}

function dueStatus(days) {
  if (days == null) return "unknown";
  if (days < 0) return "expired";
  if (days <= 30) return "due_soon";
  if (days <= 90) return "watch";
  return "ok";
}

function withDue(resource, dueDate) {
  const days = daysUntil(dueDate);
  return {
    ...resource,
    dueDate: dueDate || null,
    daysUntilDue: days,
    dueStatus: dueStatus(days),
  };
}

async function readBrands() {
  return safeJson(await readFile(resolve(repoRoot, "config/brands.json"), "utf8"), []);
}

function normalize(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function matchIpCandidates(resources, brands) {
  const domains = resources.filter((item) => item.kind === "domain" || item.kind === "dns_zone");
  return brands.flatMap((brand) => {
    const needles = [brand.slug, brand.name, brand.nativeName]
      .map(normalize)
      .filter((item) => item && item.length >= 3);
    if (!needles.length) return [];

    return domains
      .filter((domain) => {
        const haystack = normalize(domain.name);
        return needles.some((needle) => haystack.includes(needle));
      })
      .map((domain) => ({
        assetKey: brand.slug,
        ipName: brand.name,
        domain: domain.name,
        provider: domain.provider,
        confidence: normalize(domain.name).includes(normalize(brand.slug)) ? "high" : "medium",
        mode: "candidate_only",
      }));
  });
}

async function maybeReadOp(refs = []) {
  for (const ref of refs) {
    try {
      const { stdout } = await execFileAsync("op", ["read", ref], {
        timeout: 7000,
        maxBuffer: 1024 * 1024,
      });
      const value = stdout.trim();
      if (value) return value;
    } catch {
      // Keep trying optional refs.
    }
  }
  return "";
}

async function cloudflareToken() {
  return process.env.CLOUDFLARE_API_TOKEN
    || await maybeReadOp([
      "op://Personal/Cloudflare/api codex",
      "op://Personal/Cloudflare/apikey",
      "op://Personal/Cloudflare/cursor-api-01",
    ]);
}

async function encryptionSecret() {
  return process.env.RESOURCE_ENCRYPTION_KEY
    || process.env.ADMIN_API_KEY
    || await maybeReadOp([
      "op://Personal/TableAI Design Aha Admin API Key/password",
    ]);
}

async function cloudflareRequest(token, path) {
  if (!token) return null;
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success === false) return null;
  return json.result;
}

async function pullCloudflare() {
  const token = await cloudflareToken();
  if (!token) {
    return { connected: false, resources: [], errors: ["cloudflare_token_missing"] };
  }

  const resources = [];
  const errors = [];
  const accounts = await cloudflareRequest(token, "/accounts?per_page=100") || [];
  const zones = await cloudflareRequest(token, "/zones?per_page=100") || [];

  for (const zone of zones) {
    resources.push(withDue({
      provider: "cloudflare",
      kind: "dns_zone",
      name: zone.name,
      id: zone.id,
      status: zone.status,
      account: zone.account?.name || null,
      meta: {
        paused: zone.paused ?? null,
        plan: zone.plan?.name || null,
        nameServers: zone.name_servers || [],
      },
    }, zone.expires_on || zone.expiration_date || null));
  }

  for (const account of accounts) {
    const pages = await cloudflareRequest(token, `/accounts/${account.id}/pages/projects`) || [];
    for (const project of pages) {
      resources.push(withDue({
        provider: "cloudflare",
        kind: "pages_project",
        name: project.name,
        id: project.id,
        status: project.latest_deployment?.latest_stage?.status || null,
        account: account.name,
        meta: {
          domains: project.domains || [],
          subdomain: project.subdomain || null,
          productionBranch: project.production_branch || null,
        },
      }, null));
    }

    const buckets = await cloudflareRequest(token, `/accounts/${account.id}/r2/buckets`) || [];
    for (const bucket of buckets.buckets || buckets) {
      resources.push(withDue({
        provider: "cloudflare",
        kind: "r2_bucket",
        name: bucket.name,
        id: bucket.name,
        status: null,
        account: account.name,
        meta: { creationDate: bucket.creation_date || null },
      }, null));
    }

    const namespaces = await cloudflareRequest(token, `/accounts/${account.id}/storage/kv/namespaces`) || [];
    for (const ns of namespaces) {
      resources.push(withDue({
        provider: "cloudflare",
        kind: "kv_namespace",
        name: ns.title,
        id: ns.id,
        status: null,
        account: account.name,
        meta: {},
      }, null));
    }
  }

  return { connected: true, resources, errors };
}

async function pullTencentDomains() {
  const resources = [];
  const errors = [];

  try {
    let offset = 0;
    const limit = 100;
    while (true) {
      const result = await runJson("tccli", ["domain", "DescribeDomainNameList", "--Offset", String(offset), "--Limit", String(limit)]);
      const domains = result.DomainSet || [];
      for (const domain of domains) {
        resources.push(withDue({
          provider: "tencent",
          kind: "domain",
          name: domain.DomainName,
          id: String(domain.DomainId || domain.DomainName),
          status: domain.BuyStatus || null,
          account: null,
          autoRenew: domain.AutoRenew ?? null,
          meta: {
            tld: domain.Tld || domain.CodeTld || null,
            creationDate: domain.CreationDate || null,
            premium: domain.IsPremium ?? null,
          },
        }, domain.ExpirationDate));
      }
      offset += domains.length;
      if (!domains.length || offset >= Number(result.TotalCount || domains.length)) break;
    }
  } catch (error) {
    errors.push(`tencent_domain_failed:${error.message}`);
  }

  try {
    const result = await runJson("tccli", ["dnspod", "DescribeDomainList", "--Offset", "0", "--Limit", "300"]);
    for (const domain of result.DomainList || []) {
      resources.push(withDue({
        provider: "tencent",
        kind: "dns_zone",
        name: domain.Name,
        id: String(domain.DomainId || domain.Name),
        status: domain.Status || domain.DNSStatus || null,
        account: domain.Owner || null,
        autoRenew: domain.VipAutoRenew ?? null,
        meta: {
          grade: domain.GradeTitle || domain.Grade || null,
          recordCount: domain.RecordCount ?? null,
          effectiveDns: domain.EffectiveDNS || [],
          vipStartAt: domain.VipStartAt || null,
        },
      }, domain.VipEndAt));
    }
  } catch (error) {
    errors.push(`tencent_dnspod_failed:${error.message}`);
  }

  return { connected: resources.length > 0, resources, errors };
}

function summarize(resources) {
  const byProvider = {};
  const byKind = {};
  const due = { expired: 0, due_soon: 0, watch: 0, ok: 0, unknown: 0 };
  for (const item of resources) {
    byProvider[item.provider] = (byProvider[item.provider] || 0) + 1;
    byKind[item.kind] = (byKind[item.kind] || 0) + 1;
    due[item.dueStatus] = (due[item.dueStatus] || 0) + 1;
  }
  return { total: resources.length, byProvider, byKind, due };
}

function encrypt(data, secret) {
  const iv = randomBytes(12);
  const key = createHash("sha256").update(secret).digest();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    schemaVersion: 1,
    encrypted: true,
    algorithm: "AES-256-GCM-SHA256",
    updatedAt: data.updatedAt,
    summary: data.summary,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

const brands = await readBrands();
const [cloudflare, tencent] = await Promise.all([
  pullCloudflare(),
  pullTencentDomains(),
]);

const resources = [...cloudflare.resources, ...tencent.resources]
  .filter((item) => item.name)
  .sort((a, b) => `${a.provider}:${a.kind}:${a.name}`.localeCompare(`${b.provider}:${b.kind}:${b.name}`));
const payload = {
  schemaVersion: 1,
  updatedAt: now.toISOString(),
  providers: {
    cloudflare: { connected: cloudflare.connected, errors: cloudflare.errors },
    tencent: { connected: tencent.connected, errors: tencent.errors },
  },
  summary: summarize(resources),
  resources,
  ipDomainCandidates: matchIpCandidates(resources, brands),
};

const secret = await encryptionSecret();
if (!secret) {
  console.error("Missing RESOURCE_ENCRYPTION_KEY or ADMIN_API_KEY. Refusing to write resource inventory.");
  console.error(JSON.stringify({ providers: payload.providers, summary: payload.summary }, null, 2));
  process.exit(2);
}

const encrypted = encrypt(payload, secret);
await mkdir(dirname(outPath), { recursive: true });
await mkdir(dirname(siteOutPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(encrypted, null, 2)}\n`);
await writeFile(siteOutPath, `${JSON.stringify(encrypted, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  outPath: "data/cloud-resources.enc.json",
  siteOutPath: "site/api/cloud-resources.enc.json",
  summary: encrypted.summary,
  providers: payload.providers,
}, null, 2));

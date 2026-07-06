import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");
const inputPath = process.argv.find((arg) => !arg.startsWith("--") && arg !== process.argv[1] && arg !== process.argv[0]);
const dryRun = process.argv.includes("--dry-run");
const namespace = "guofeng-writing-style";
const assetKey = "ksamint";
const localOutPath = resolve(repoRoot, "ksamint/private/guofeng-writing-style.enc.json");
const siteOutPath = resolve(repoRoot, "site/api/private/ksamint-skills.enc.json");

function slugPart(value = "") {
  return value
    .replace(/^#+\s*/, "")
    .replace(/[「」“”"']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function parsePrivateSkills(markdown) {
  const lines = markdown.split(/\r?\n/);
  const skills = [];
  let heading = "private-skill";
  let inFence = false;
  let buffer = [];

  for (const line of lines) {
    const h = line.match(/^#{1,2}\s+(.+)$/);
    if (!inFence && h) heading = h[1].trim();

    if (!inFence && line.trim() === "```markdown") {
      inFence = true;
      buffer = [];
      continue;
    }

    if (inFence && line.trim() === "```") {
      const index = skills.length + 1;
      const title = heading;
      skills.push({
        id: `${String(index).padStart(2, "0")}-${slugPart(title) || `skill-${index}`}`,
        title,
        order: index,
        format: "markdown",
        content: buffer.join("\n").trim(),
      });
      inFence = false;
      continue;
    }

    if (inFence) buffer.push(line);
  }

  return skills;
}

function encryptionSecret() {
  return process.env.KSAMINT_SKILL_KEY || process.env.RESOURCE_ENCRYPTION_KEY || process.env.ADMIN_API_KEY || "";
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
    assetKey,
    namespace,
    updatedAt: data.updatedAt,
    summary: data.summary,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

if (!inputPath) {
  console.error("Usage: node scripts/encrypt-private-skills.mjs <markdown-file> [--dry-run]");
  process.exit(1);
}

const sourceText = await readFile(resolve(inputPath), "utf8");
const skills = parsePrivateSkills(sourceText);
const payload = {
  schemaVersion: 1,
  assetKey,
  namespace,
  updatedAt: new Date().toISOString(),
  summary: {
    count: skills.length,
    source: "ksamint private skill source",
  },
  skills,
};

if (dryRun) {
  console.log(JSON.stringify({
    ok: true,
    dryRun: true,
    assetKey,
    namespace,
    count: skills.length,
    titles: skills.map(({ id, title }) => ({ id, title })),
  }, null, 2));
  process.exit(0);
}

const secret = encryptionSecret();
if (!secret) {
  console.error("Missing KSAMINT_SKILL_KEY, RESOURCE_ENCRYPTION_KEY, or ADMIN_API_KEY. Refusing to write private skills.");
  console.error(JSON.stringify({ assetKey, namespace, count: skills.length }, null, 2));
  process.exit(2);
}

const encrypted = encrypt(payload, secret);
await mkdir(dirname(localOutPath), { recursive: true });
await mkdir(dirname(siteOutPath), { recursive: true });
await writeFile(localOutPath, `${JSON.stringify(encrypted, null, 2)}\n`);
await writeFile(siteOutPath, `${JSON.stringify(encrypted, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  localOutPath: "ksamint/private/guofeng-writing-style.enc.json",
  siteOutPath: "site/api/private/ksamint-skills.enc.json",
  summary: encrypted.summary,
}, null, 2));

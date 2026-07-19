import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(await readFile(join(root, "data", "assets", "manifest.json"), "utf8"));
const mode = process.argv.includes("--upload") ? "upload" : process.argv.includes("--verify") ? "verify" : "dry-run";
const fromArgument = process.argv.find((value) => value.startsWith("--from="));
const from = Math.max(Number(fromArgument?.split("=")[1] || 1), 1);
const selectedItems = manifest.items.slice(from - 1);
const verifyDir = join(root, ".tmp", "r2-verify");

function wrangler(args, capture = false) {
  const result = spawnSync("npx", ["wrangler", ...args], { cwd: root, stdio: capture ? "pipe" : "inherit", encoding: "utf8", env: process.env });
  if (result.status !== 0) throw new Error(result.stderr || `wrangler_failed:${args.join(" ")}`);
  return result.stdout || "";
}

function bucket(item) { return item.access === "private" ? "iptrust-media" : "iptrust-media-preview"; }

if (mode === "dry-run") {
  for (const item of selectedItems) {
    const path = join(root, item.sourcePath);
    if (!existsSync(path)) throw new Error(`missing_source:${item.sourcePath}`);
    const buffer = await readFile(path);
    const digest = createHash("sha256").update(buffer).digest("hex");
    if (digest !== item.sha256 || buffer.length !== item.bytes) throw new Error(`source_changed:${item.sourcePath}`);
  }
  console.log(JSON.stringify({ ok: true, mode, count: manifest.count, bytes: manifest.totalBytes }, null, 2));
} else if (mode === "upload") {
  let done = 0;
  for (const item of selectedItems) {
    wrangler(["r2", "object", "put", `${bucket(item)}/${item.objectKey}`, "--file", item.sourcePath, "--content-type", item.mimeType, "--remote"]);
    done += 1;
    console.log(`[${from + done - 1}/${manifest.count}] ${item.objectKey}`);
  }
} else {
  await rm(verifyDir, { recursive: true, force: true });
  await mkdir(verifyDir, { recursive: true });
  let done = 0;
  for (const item of selectedItems) {
    const target = join(verifyDir, item.id);
    wrangler(["r2", "object", "get", `${bucket(item)}/${item.objectKey}`, "--file", target, "--remote"], true);
    const buffer = await readFile(target);
    const digest = createHash("sha256").update(buffer).digest("hex");
    if (digest !== item.sha256 || buffer.length !== item.bytes) throw new Error(`remote_mismatch:${item.id}`);
    done += 1;
    console.log(`[${from + done - 1}/${manifest.count}] verified ${item.id}`);
  }
  await rm(verifyDir, { recursive: true, force: true });
  console.log(JSON.stringify({ ok: true, mode, count: done }, null, 2));
}

function sql(value) { return `'${String(value ?? "").replaceAll("'", "''")}'`; }
const timestamp = manifest.generatedAt;
const statements = ["PRAGMA foreign_keys = ON;"];
for (const item of manifest.items) {
  statements.push(`INSERT INTO assets(id,owner_type,owner_id,role,title,access,source_object_key,source_filename,sha256,mime_type,extension,bytes,width,height,status,version,metadata_json,created_at,updated_at) VALUES(${[item.id, item.ownerType, item.ownerId, item.role, item.title, item.access, item.objectKey, item.sourceFilename, item.sha256, item.mimeType, item.extension].map(sql).join(",")},${item.bytes},${item.width ?? "NULL"},${item.height ?? "NULL"},${sql(item.status)},1,${sql(JSON.stringify({ sourcePath: item.sourcePath }))},${sql(timestamp)},${sql(timestamp)}) ON CONFLICT(id) DO UPDATE SET source_object_key=excluded.source_object_key,source_filename=excluded.source_filename,sha256=excluded.sha256,mime_type=excluded.mime_type,extension=excluded.extension,bytes=excluded.bytes,width=excluded.width,height=excluded.height,status=excluded.status,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at;`);
  for (const alias of item.legacyUrls) statements.push(`INSERT INTO asset_aliases(path,asset_id,redirect_status,created_at) VALUES(${sql(alias)},${sql(item.id)},308,${sql(timestamp)}) ON CONFLICT(path) DO UPDATE SET asset_id=excluded.asset_id,redirect_status=308;`);
}
await mkdir(join(root, ".tmp"), { recursive: true });
await writeFile(join(root, ".tmp", "assets-seed.sql"), `${statements.join("\n")}\n`);

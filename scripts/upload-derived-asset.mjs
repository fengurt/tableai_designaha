import { createHash, randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";

const [file, sourceAssetId, role = "preview"] = process.argv.slice(2);
const api = process.env.IPTRUST_API_URL || "https://apuch.art/api/v2";
const token = process.env.IPTRUST_SERVICE_API_KEY;
if (!file || !sourceAssetId || !token) throw new Error("usage: upload-derived-asset.mjs <file> <sourceAssetId> [role]; requires IPTRUST_SERVICE_API_KEY");
const data = await readFile(file);
const info = await stat(file);
const sha256 = createHash("sha256").update(data).digest("hex");
const idempotency = createHash("sha256").update(`${sourceAssetId}:${role}:${sha256}`).digest("hex");
const extension = extname(file).slice(1).toLowerCase();
const mimeType = extension === "png" ? "image/png" : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : extension === "webp" ? "image/webp" : "application/octet-stream";
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Idempotency-Key": `variant-start-${idempotency}` };
const started = await fetch(`${api}/assets/uploads`, { method: "POST", headers, body: JSON.stringify({ sourceAssetId, filename: basename(file), role, access: "public", mimeType, bytes: info.size, sha256 }) });
if (!started.ok) throw new Error(`start_${started.status}:${await started.text()}`);
const upload = (await started.json()).upload;
const partsUrl = `${api}/assets/uploads/${upload.id}/parts/{partNumber}`;
const completeUrl = `${api}/assets/uploads/${upload.id}/complete`;
const parts = [];
for (let offset = 0, partNumber = 1; offset < data.length; offset += upload.partSize, partNumber += 1) {
  const chunk = data.subarray(offset, Math.min(offset + upload.partSize, data.length));
  const response = await fetch(partsUrl.replace("{partNumber}", String(partNumber)), { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Length": String(chunk.length) }, body: chunk });
  if (!response.ok) throw new Error(`part_${partNumber}_${response.status}:${await response.text()}`);
  const part = await response.json();
  parts.push({ partNumber: part.partNumber, etag: part.etag });
}
const completed = await fetch(completeUrl, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Idempotency-Key": `variant-complete-${idempotency}` }, body: JSON.stringify({ parts }) });
if (!completed.ok) throw new Error(`complete_${completed.status}:${await completed.text()}`);
console.log(JSON.stringify(await completed.json()));

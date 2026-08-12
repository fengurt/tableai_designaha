import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalSiteRedirect } from "../edge/src/index.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cases = [
  "https://apuch.art/ip-evolution/",
  "https://apuch.art/ip-evolution%EF%BC%9F",
  "https://apuch.art/ip-evolution？",
];

for (const url of cases) {
  const response = canonicalSiteRedirect(new Request(url));
  if (!response || response.status !== 302) throw new Error(`route_status:${url}:${response?.status}`);
  if (response.headers.get("location") !== "https://apuch.art/ip-evolution") throw new Error(`route_location:${url}:${response.headers.get("location")}`);
  if (response.headers.get("cache-control") !== "private, no-store") throw new Error(`route_cache:${url}`);
}

if (canonicalSiteRedirect(new Request("https://apuch.art/ip-evolution?lang=en"))) throw new Error("ascii_query_redirected");
if (canonicalSiteRedirect(new Request("https://apuch.art/ip-evolution"))) throw new Error("canonical_redirected");

const page = await readFile(join(root, "site", "ip-evolution"), "utf8");
if (!page.includes("<title>IP进化论 | 岁知社 IPTrust</title>")) throw new Error("ip_evolution_title");
if (!page.includes('rel="canonical" href="https://apuch.art/ip-evolution"')) throw new Error("ip_evolution_canonical");
if (!page.includes('id="open-source-type"')) throw new Error("font_library_missing");

const repairPage = await readFile(join(root, "site", "ip-evolution-repair"), "utf8");
if (!repairPage.includes('/ip-evolution?repaired=1')) throw new Error("repair_route_missing");

console.log(JSON.stringify({ ok: true, redirects: cases.length, canonical: "https://apuch.art/ip-evolution" }, null, 2));

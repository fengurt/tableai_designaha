import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalSiteRedirect } from "../edge/src/index.js";
import { mediaDownloadName } from "../edge/src/media.js";

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
if (!page.includes("data-evolution-map")) throw new Error("ip_evolution_map_missing");
const sourceFramework = await readFile(join(root, "IP-System", "ip_sys.md"), "utf8");
const sourceSectionCount = (sourceFramework.match(/^#{2,3}\s/gm) || []).length;
const renderedSectionCount = (page.match(/<h[23] id="ip-system-/g) || []).length;
if (renderedSectionCount !== sourceSectionCount) throw new Error(`ip_evolution_content_loss:${renderedSectionCount}:${sourceSectionCount}`);

const repairPage = await readFile(join(root, "site", "ip-evolution-repair"), "utf8");
if (!repairPage.includes('/ip-evolution?repaired=1')) throw new Error("repair_route_missing");

const homePage = await readFile(join(root, "site", "index.html"), "utf8");
if (!homePage.includes('class="home-entries"')) throw new Error("home_entries_missing");
if (homePage.includes('id="brandGrid"')) throw new Error("home_duplicate_brand_grid");
if (homePage.includes('class="system-entry"')) throw new Error("home_explainer_not_removed");

const aboutPage = await readFile(join(root, "site", "about", "index.html"), "utf8");
if (!aboutPage.includes('class="about-page"')) throw new Error("about_page_missing");
if (!aboutPage.includes('<base href="../">')) throw new Error("about_base_missing");
if (!aboutPage.includes('rel="canonical" href="https://apuch.art/about/"')) throw new Error("about_canonical");
if (!aboutPage.includes('href="mcp"') || !aboutPage.includes('href="agent.json"')) throw new Error("about_agent_docs_missing");

const siteScript = await readFile(join(root, "site", "assets", "site.js"), "utf8");
if (!siteScript.includes("function minimalReferenceText") || !siteScript.includes("data-copy-minimal")) throw new Error("minimal_copy_missing");
if (!siteScript.includes("data-download-asset")) throw new Error("asset_download_missing");
if (!siteScript.includes("function setupEvolutionMap()")) throw new Error("ip_evolution_map_script_missing");
if (siteScript.includes("const heroName = isSidera") || siteScript.includes("const heroEyebrow = isSidera")) throw new Error("brand_display_logic_not_shared");
if (siteScript.includes("setupDirectoryLink")) throw new Error("dynamic_directory_link_regression");

if (mediaDownloadName(new URL("https://media.apuch.art/public/ip/logo/original.png?download=brand-logo.png"), "/public/ip/logo/original.png") !== "brand-logo.png") throw new Error("asset_download_name");
if (mediaDownloadName(new URL("https://media.apuch.art/public/ip/logo/original.png?download=../品牌-logo.png"), "/public/ip/logo/original.png") !== "品牌-logo.png") throw new Error("asset_download_name_safety");
if (mediaDownloadName(new URL("https://media.apuch.art/public/ip/logo/original.png"), "/public/ip/logo/original.png")) throw new Error("asset_inline_response");

const siteCss = await readFile(join(root, "site", "assets", "site.css"), "utf8");
if (!/\.brand-visual img\s*\{[^}]*object-fit:\s*contain/s.test(siteCss)) throw new Error("brand_logo_crop_regression");
if (!/\.brand-asset-link\s*\{[^}]*overflow:\s*hidden/s.test(siteCss)) throw new Error("brand_asset_preview_overflow");
if (!/\.brand-asset img\s*\{[^}]*max-height:\s*100%/s.test(siteCss)) throw new Error("brand_asset_image_bounds");

for (const relativePath of ["index.html", "about/index.html", "brand.html", "ip-evolution", "fonts", "directory/index.html", "admin.html"]) {
  const html = await readFile(join(root, "site", relativePath), "utf8");
  for (const key of ["nav.directory", "evolution.label", "nav.about"]) {
    if (!html.includes(`data-i18n="${key}"`)) throw new Error(`topbar_missing:${relativePath}:${key}`);
  }
}

console.log(JSON.stringify({ ok: true, redirects: cases.length, canonical: "https://apuch.art/ip-evolution", about: "https://apuch.art/about" }, null, 2));

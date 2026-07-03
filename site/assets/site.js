const $ = (selector) => document.querySelector(selector);

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path}`);
  return res.json();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

async function renderIndex() {
  const grid = $("#brandGrid");
  if (!grid) return;
  const brands = await loadJson("api/brands.json");
  grid.innerHTML = brands.map((brand) => `
    <a class="card" href="${brand.url}">
      ${brand.heroImage ? `<img src="${brand.heroImage}" alt="">` : ""}
      <div class="card-body">
        <p class="eyebrow">${escapeHtml(brand.status)}</p>
        <h2>${escapeHtml(brand.name)}</h2>
        <p class="muted">${escapeHtml(brand.nativeName || brand.description)}</p>
        <p>${escapeHtml(brand.primaryExcerpt)}</p>
        <div class="meta">
          <span class="pill">${brand.guideCount} guides</span>
          <span class="pill">${brand.tokenCount} token files</span>
          <span class="pill">JSON API</span>
        </div>
      </div>
    </a>
  `).join("");
}

async function renderBrand() {
  const page = $("#brandPage");
  if (!page) return;
  const slug = new URLSearchParams(location.search).get("brand") || "tableai";
  const brand = await loadJson(`api/brands/${slug}.json`);
  document.title = `${brand.name} · Brand Guidelines`;
  const hero = brand.images?.[0]?.sitePath;
  page.innerHTML = `
    <section class="brand-hero">
      <div>
        <p class="eyebrow">${escapeHtml(brand.status)}</p>
        <h1>${escapeHtml(brand.name)}</h1>
        <p class="muted">${escapeHtml(brand.nativeName || "")}</p>
        <p>${escapeHtml(brand.description)}</p>
        <div class="actions">
          <a class="button" href="${brand.apiUrl}">Open JSON endpoint</a>
          <a class="button ghost" href="${brand.source.github}">Source folder</a>
        </div>
      </div>
      ${hero ? `<img src="${hero}" alt="">` : ""}
    </section>
    <section class="resource-list">
      <div class="resource"><strong>Editable source paths</strong><br>${brand.editablePaths?.map(escapeHtml).join("<br>") || "No guideline files yet."}</div>
      <div class="resource"><strong>Token files</strong><br>${brand.tokens?.map((token) => escapeHtml(token.path)).join("<br>") || "No token files yet."}</div>
    </section>
    ${brand.guides?.map((guide) => `
      <article class="guide">
        <p class="eyebrow">${escapeHtml(guide.format)} · ${escapeHtml(guide.path)}</p>
        <h2>${escapeHtml(guide.title)}</h2>
        <pre>${escapeHtml(guide.text)}</pre>
      </article>
    `).join("") || ""}
  `;
}

renderIndex().catch(console.error);
renderBrand().catch(console.error);
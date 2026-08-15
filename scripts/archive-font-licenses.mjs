import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const catalogPath = join(root, "data", "fonts.json");
const archiveRoot = join(root, "licenses", "fonts");
const stagingRoot = join(root, ".tmp", "font-license-archive-next");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function pinnedGithubUrl(font) {
  const url = new URL(font.license.url);
  const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/[^/]+\/(.+)$/);
  if (!match) throw new Error(`font_license_url:${font.id}`);
  const [, owner, repository, path] = match;
  const licenseRepository = `${owner}/${repository}`;
  if (licenseRepository.toLowerCase() !== font.source.repository.toLowerCase()) {
    throw new Error(`font_license_repository:${font.id}:${licenseRepository}`);
  }
  return `https://raw.githubusercontent.com/${licenseRepository}/${font.source.revision}/${path}`;
}

function provenanceMarkdown(font, archive) {
  const assets = font.assets.map((asset) => [
    `### ${asset.id}`,
    "",
    `- Original font file: ${asset.sourceUrl}`,
    `- Original SHA-256: \`${asset.sourceSha256}\``,
    `- Web specimen SHA-256: \`${asset.sha256}\``,
  ].join("\n")).join("\n\n");

  return `# ${font.name} license provenance

This directory is a version-pinned audit backup for the font used by IPTrust.

- Font ID: \`${font.id}\`
- Family: ${font.family}
- Publisher: ${font.source.publisher}
- Project: ${font.source.projectUrl}
- Source repository: https://github.com/${font.source.repository}
- Source revision: \`${font.source.revision}\`
- License: ${font.license.name} (\`${font.license.spdx}\`)
- Original license page: ${font.license.url}
- Version-pinned license source: ${archive.pinnedSourceUrl}
- Archived license SHA-256: \`${archive.licenseSha256}\`
- Verified: ${archive.verifiedAt}

## Font source files

${assets}

## Commercial-use evidence

The archived license text is the legal grant governing commercial use, embedding,
modification and redistribution. This provenance record is an audit aid and does
not replace the license text in [LICENSE.txt](./LICENSE.txt).
`;
}

await rm(stagingRoot, { recursive: true, force: true });
await mkdir(stagingRoot, { recursive: true });

const manifest = [];
for (const font of catalog.fonts) {
  const pinnedSourceUrl = pinnedGithubUrl(font);
  const response = await fetch(pinnedSourceUrl, { headers: { "user-agent": "IPTrust-Font-License-Archiver/1.0" } });
  if (!response.ok) throw new Error(`font_license_fetch:${font.id}:${response.status}`);
  const licenseBytes = Buffer.from(await response.arrayBuffer());
  if (licenseBytes.length < 500) throw new Error(`font_license_content:${font.id}`);
  const licenseSha256 = sha256(licenseBytes);
  const relativeRoot = `licenses/fonts/${font.id}`;
  const archive = {
    licensePath: `${relativeRoot}/LICENSE.txt`,
    provenancePath: `${relativeRoot}/PROVENANCE.md`,
    licenseUrl: `https://apuch.art/${relativeRoot}/LICENSE.txt`,
    provenanceUrl: `https://apuch.art/${relativeRoot}/PROVENANCE.md`,
    pinnedSourceUrl,
    licenseSha256,
    verifiedAt: catalog.verifiedAt,
  };
  const fontDir = join(stagingRoot, font.id);
  await mkdir(fontDir, { recursive: true });
  await writeFile(join(fontDir, "LICENSE.txt"), licenseBytes);
  const provenance = provenanceMarkdown(font, archive);
  await writeFile(join(fontDir, "PROVENANCE.md"), provenance);
  font.license.archive = archive;
  manifest.push({
    id: font.id,
    family: font.family,
    spdx: font.license.spdx,
    ...archive,
    provenanceSha256: sha256(provenance),
  });
}

await writeFile(join(stagingRoot, "manifest.json"), `${JSON.stringify({
  schemaVersion: 1,
  verifiedAt: catalog.verifiedAt,
  fonts: manifest,
}, null, 2)}\n`);
await rm(archiveRoot, { recursive: true, force: true });
await rename(stagingRoot, archiveRoot);
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

console.log(JSON.stringify({ archived: manifest.length, archiveRoot }, null, 2));

import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const configPath = join(root, "config/site-admin.public.json");
const generatedKey = `ta_admin_${randomBytes(32).toString("base64url")}`;
const adminKey = process.env.TABLEAI_ADMIN_KEY || generatedKey;
const hash = createHash("sha256").update(adminKey).digest("hex");
const config = existsSync(configPath)
  ? JSON.parse(await readFile(configPath, "utf8"))
  : { owner: "fengurt", repo: "tableai_designaha", branch: "main" };

if (process.env.SAVE_TO_1PASSWORD === "1") {
  const template = {
    title: process.env.OP_ITEM_TITLE || "TableAI Design Aha Admin API Key",
    category: "PASSWORD",
    tags: ["tableai-designaha", "admin", "api-key"],
    urls: [{ label: "website", href: process.env.SITE_URL || `https://${config.owner}.github.io/${config.repo}/` }],
    fields: [
      {
        id: "password",
        type: "CONCEALED",
        purpose: "PASSWORD",
        label: "password",
        password_details: { strength: "EXCELLENT" },
        value: adminKey,
      },
      {
        id: "notesPlain",
        type: "STRING",
        purpose: "NOTES",
        label: "notesPlain",
        value: "Admin unlock key for the static Table AI Design Aha admin editor. The public repo stores only the SHA-256 hash.",
      },
    ],
  };
  const op = spawnSync("op", ["item", "create", "--category=password", "-"], {
    input: JSON.stringify(template),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (op.status !== 0) {
    process.stderr.write(op.stderr);
    process.exit(op.status ?? 1);
  }
  process.stdout.write(op.stdout);
  config.adminKeySha256 = hash;
  config.generatedAt = new Date().toISOString();
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log("Saved admin key to 1Password.");
} else {
  config.adminKeySha256 = hash;
  config.generatedAt = new Date().toISOString();
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log("Admin key generated. Set SAVE_TO_1PASSWORD=1 to save it to 1Password.");
  console.log(adminKey);
}

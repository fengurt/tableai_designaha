import { spawnSync } from "node:child_process";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false, ...options });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const branch = process.env.SITE_SYNC_BRANCH || "main";

run("git", ["pull", "--rebase", "origin", branch]);
run("npm", ["run", "build:site"]);
run("git", ["add", "site", "config/site-admin.public.json"]);

const diff = spawnSync("git", ["diff", "--cached", "--quiet"], { stdio: "inherit" });
if (diff.status === 0) {
  console.log("No generated site changes to commit.");
  process.exit(0);
}

run("git", ["commit", "-m", "Sync generated design website"]);
run("git", ["push", "origin", branch]);

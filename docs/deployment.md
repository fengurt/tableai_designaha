# Deployment and Sync

This repo is the canonical source of truth for Table AI Alliance brand design
guidelines.

## One-way sync: GitHub to website

1. Edit source files in brand folders.
2. Run `npm run build:site` locally to preview generated output in `site/`.
3. Push to `main`.
4. `.github/workflows/deploy-pages.yml` builds `site/` and deploys it to GitHub
   Pages.

The expected Pages URL is:

```text
https://fengurt.github.io/tableai_designaha/
```

If Pages is not enabled yet, enable it in GitHub repository settings with
**Build and deployment: GitHub Actions**.

## Website to GitHub sync

The generated `site/admin.html` editor:

1. Unlocks with the generated admin key.
2. Loads editable guideline files from the GitHub Contents API.
3. Saves edits as commits back to the configured branch.
4. GitHub Pages rebuilds after the commit lands.

The static admin key is a browser-side unlock gate. It is useful for shared
operator workflow, but it is not a replacement for server-side authentication.
Saving still requires a GitHub token with write access.

## Admin key

Generate or rotate the admin key:

```bash
SAVE_TO_1PASSWORD=1 npm run provision:admin-key
npm run build:site
```

The raw key is saved in 1Password. The repo only stores
`config/site-admin.public.json`, which contains the SHA-256 hash.

## Manual local sync helper

```bash
npm run sync:site
```

This pulls `origin/main`, rebuilds `site/`, commits generated output if needed,
and pushes back to `origin/main`.

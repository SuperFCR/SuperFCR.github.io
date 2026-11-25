# Academic Homepage & Research Blog Template

A clean, data-driven bilingual academic homepage and static research blog generator designed for GitHub Pages. Edit JSON files for your profile, publications, and experience, write rich technical blog posts with offline KaTeX math and interactive diagrams, and deploy static HTML with zero external font or CDN dependencies.

Originally extracted from [Chaoran Feng's homepage](https://www.falcary.com/) (`SuperFCR/SuperFCR.github.io`, `template` branch).

## ⚡ 5-Minute Quick Start

### 1. Clone the Template

```bash
git clone --single-branch --branch template https://github.com/SuperFCR/SuperFCR.github.io.git my-homepage
cd my-homepage
git branch -m main
git remote set-url origin https://github.com/<your-username>/<your-username>.github.io.git
```

### 2. Install & Build Locally

Requires **Node.js >= 18** and **Python 3.10+**.

```bash
npm install
npm run build
python3 blogs/check.py
python3 -I -m http.server 8000 --bind 127.0.0.1
```

Visit `http://127.0.0.1:8000/` (English), `http://127.0.0.1:8000/zh/` (Chinese), and `http://127.0.0.1:8000/blogs/` (Blog).

### 3. Customize Your Content

| What to change | File / Folder | Notes |
|---|---|---|
| Site URL, profile, papers, news, awards | [config/data.json](config/data.json) | Set `site.url` first (`blogs/check.py` reads it automatically) |
| English UI strings & metadata | [config/locales/en.json](config/locales/en.json) | Page title, meta description, section labels |
| Chinese UI strings & translations | [config/locales/zh-CN.json](config/locales/zh-CN.json) | Positional overrides matching `config/data.json` arrays |
| Portrait, site mark, favicon | [assets/imgs/](assets/imgs/) | Replace `avatar.png`, `logo.svg`, and `favicon.png` |
| Downloadable CV PDF | [assets/files/CV.pdf](assets/files/CV.pdf) | Or clear `personal.cv` in `config/data.json` to hide the CV icon |
| Paper / project figures | [assets/pipelines/](assets/pipelines/) | `build.js` generates hashed WebP thumbnails in `assets/thumbs/` |
| Blog posts & index | [blogs/](blogs/) | Duplicate `blogs/example/` for new posts; register in `blogs/index.html` |

### 4. Deploy to GitHub Pages

1. Commit and push your changes to `main`.
2. In your GitHub repository, open **Settings -> Pages -> Build and deployment**, set **Source** to **Deploy from a branch**, and select `main` / `(root)`.
3. *(Optional)* Add a `CNAME` file in the repo root if you use a custom domain.

## ✨ Key Features

- **Single-source bilingual homepage with unified dark mode**: Compiles `/` and `/zh/` from shared metadata in `config/data.json` plus locale overrides in `config/locales/`, with a light/dark theme toggle synced with `/blogs/` via `assets/js/blog-theme.js`.
- **Curated Projects & filterable Papers**: Promote flagship work with `projectShowcaseIds`, highlight key papers in `selectedPaperIds`, and let readers filter research directions smoothly (`Selected`, `All`, or topic pills).
- **Content-hashed thumbnails & self-hosted fonts**: `build.js` optimizes project figures (`880px` wide) and your avatar (`560px` wide) into `assets/thumbs/*.webp` and cleans up unused thumbnails automatically.
- **Header social bar & QR popovers**: Supports external URLs (`x`) and click-to-toggle QR popovers (`xiaohongshu`, `wechat`) powered by SVG icons in [templates/icons/](templates/icons/).
- **Lil'Log-style bilingual blog**: Includes light/dark themes, sticky desktop accordion TOC, self-hosted KaTeX math (`assets/vendor/katex/`), inline citation hover cards, strict `blogs/check.py` validation, and automatic homepage **Blog** cards (`build.js` reads the newest 3 entries from `blogs/index.html`).
- **GitHub Actions ready**: `.github/workflows/google_scholar_crawler.yaml` syncs Scholar citations and GitHub repo stars; `.github/workflows/blog-check.yml` validates blog edits.

## 📝 Detailed Configuration

### Localization Rules
- Keep shared URLs, authors, venues, image paths, and unique `analyticsId` keys (`^[a-z][a-z0-9_]{0,79}$`) in `config/data.json`.
- Put translated `description` / `content` / `title` overrides at matching array positions in `config/locales/zh-CN.json`.
- Remove any optional field (`personal.googleScholar`, `personal.github`, `personal.cv`, `activities`, or `showNews: false`) cleanly to hide it on the page.

### Writing Blog Posts
- See [blogs/README.md](blogs/README.md) for the complete authoring specification, typography guide, figure workflow, and bilingual alignment rules.
- `blogs/check.py` automatically reads `site.url`, `personal.name`, and `personal.nameChinese` from `config/data.json` so canonical/hreflang checks and author footers adapt to your configuration without editing Python code.
- **Important GitHub Pages note**: Because the repo uses GitHub Pages' default Jekyll pipeline (no `.nojekyll`), avoid placing double curly braces or percent-brace tags inside `.md` files.

### Scholar Citations, GitHub Stars & Analytics (Optional)
- **Scholar & GitHub Stars**: Update `personal.googleScholar` with your real `?user=...` ID and list real `https://github.com/<owner>/<repo>` links in `config/data.json`. Test locally with `python3 google_scholar_crawler/fetch_scholar.py && npm run build`. Until configured, the script skips placeholder IDs/owners cleanly.
- **GA4 Analytics**: Set `analytics.measurementId` in `config/data.json` (leave `""` to disable) and inspect [ANALYTICS.md](ANALYTICS.md) for event definitions. `assets/js/analytics-init.js` automatically skips loading GA tags on `localhost` / `127.0.0.1`.
- **Visitor Map**: Optionally set `footer.visitorTracker` to `{ "pageUrl": "...", "imageUrl": "..." }`, or keep `null` to hide it.

## 📄 License & Acknowledgement

MIT License — free to use, modify, and publish for your own academic or personal site.

Template derived from [Chaoran Feng's Homepage](https://www.falcary.com/), with design inspiration from:

- [Renrui Zhang's Homepage](https://zrrskywalker.github.io/)
- [Song Chen's Homepage](https://song-chen1.github.io)
- [Purshow's Homepage](https://Purshow.github.io)
- [Lil'Log](https://lilianweng.github.io/)

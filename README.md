# Falcary's Academic Homepage & Blog Generator

A data-driven, bilingual personal academic homepage and static research blog generator. Edit JSON files for your profile and publications, write long-form technical notes in HTML, and compile everything into fast static pages ready for GitHub Pages.

Live site: [falcary.com](https://www.falcary.com/). If you build your site on top of this repository, please kindly note the source.

## 🚀 Features

- **Data-driven bilingual homepage with light/dark mode**: One Handlebars template ([templates/index.html](templates/index.html)) builds both the English (`/`) and Chinese (`/zh/`) pages from shared metadata in [config/data.json](config/data.json) and locale overrides in [config/locales/](config/locales/), sharing a persistent light/dark theme toggle ([assets/js/blog-theme.js](assets/js/blog-theme.js)) with the blog.
- **Curated Projects & filterable Papers**: Pin flagship work in **Projects** via `projectShowcaseIds`, highlight selected papers with `selectedPaperIds`, and let readers filter **Selected Research Papers** by research direction (`All`, `Selected`, or topic pills) with live result counts, horizontal mobile scrolling, and full no-JS readability.
- **Automated thumbnails & self-hosted fonts**: `build.js` generates content-hashed WebP thumbnails in [assets/thumbs/](assets/thumbs/) via `sharp`, cleans up stale thumbnails automatically, and bundles self-hosted Inter subsets (`assets/fonts/inter-latin.woff2`) so typography works reliably everywhere.
- **Header social bar & live local clock**: Configurable icons in [templates/icons/](templates/icons/) supporting direct URLs and accessible click-to-toggle QR popovers (such as RedNote or WeChat), paired with a live timezone clock driven by `personal.timeZone`.
- **Integrated Lil'Log-style research blog**: Hand-authored static bilingual posts under [blogs/](blogs/) featuring light/dark mode, a sticky collapsible desktop Table of Contents, self-hosted KaTeX math ([assets/vendor/katex/](assets/vendor/katex/)), inline citation hover preview cards, an automated linter ([blogs/check.py](blogs/check.py)), and an automatic **Latest Blog Posts** 3-card feed on the homepage (parsed from [blogs/index.html](blogs/index.html) via `cheerio`, linking the Chinese homepage to `/zh/` when available).
- **Automated Scholar & GitHub metrics**: Optional GitHub Actions workflow ([.github/workflows/google_scholar_crawler.yaml](.github/workflows/google_scholar_crawler.yaml)) refreshes Google Scholar citation stats and GitHub repository star counts daily or on push, without advancing the page's "Last updated" content timestamp.
- **Optional analytics & visitor map**: Privacy-aware GA4 semantic event tracking ([ANALYTICS.md](ANALYTICS.md)) disabled on localhost previews, plus an optional footer visitor map widget (`footer.visitorTracker`).

## 🌱 Using the `template` Branch

Want to spin up your own academic homepage and blog with this stack? Use the dedicated **`template`** branch — an **orphan branch with a clean, single-commit history** containing the complete bilingual homepage and blog starter skeleton, with all personal information, photos, CV, custom `CNAME`, GA4 ID, and personal blog posts stripped out.

> **Visibility note**: While `SuperFCR/SuperFCR.github.io` is private, external users will only be able to clone the `template` branch once this repository is made public, or when `template` is mirrored to a standalone public template repository (e.g., `git push <public-repo-url> template:main`).

Clone the `template` branch directly and point it to your own GitHub Pages repository:

```bash
git clone --single-branch --branch template https://github.com/SuperFCR/SuperFCR.github.io.git my-homepage
cd my-homepage
git branch -m main
git remote set-url origin https://github.com/<your-username>/<your-username>.github.io.git
```

### Quick 5-Step Customization Checklist

1. **Configure your profile**: Update `site.url`, `personal`, `education`, `projects`, `experiences`, and `awards` in `config/data.json`, plus translations in `config/locales/en.json` and `config/locales/zh-CN.json`.
2. **Replace starter assets**: Swap the starter avatar (`assets/imgs/avatar.png`), logo/favicon (`assets/imgs/logo.svg`, `assets/imgs/favicon.png`), paper thumbnails (`assets/pipelines/`), and CV PDF (`assets/files/`).
3. **Install & build the homepage**: Run `npm install && npm run build` to compile `index.html`, `zh/index.html`, and `assets/thumbs/`.
4. **Customize the blog**: Edit `blogs/index.html`, duplicate `blogs/example/` for new posts (see [blogs/README.md](blogs/README.md)), and validate with `python3 blogs/check.py`.
5. **Deploy on GitHub Pages**: Push `main` to GitHub and enable **Settings -> Pages -> Deploy from a branch (`main` / `(root)`)**.

## 📁 Project Structure

```text
SuperFCR.github.io/
├── .github/workflows/
│   ├── blog-check.yml              # CI check: runs python3 blogs/check.py on blog changes
│   └── google_scholar_crawler.yaml # Daily / on-push Scholar + GitHub stars sync & rebuild
├── config/
│   ├── data.json                   # Shared site config, profile, papers, experience, awards
│   ├── github_data.json            # Cached GitHub star counts (auto-updated by crawler)
│   ├── scholar_data.json           # Cached Google Scholar metrics (auto-updated by crawler)
│   └── locales/
│       ├── en.json                 # English UI labels and metadata
│       └── zh-CN.json              # Chinese UI labels and positional content overrides
├── templates/
│   ├── index.html                  # Shared Handlebars template for / and /zh/
│   ├── partials/
│   │   └── paper.html              # Shared card partial for Projects and Research Papers
│   └── icons/                      # Inline SVG icons (email, scholar, github, cv, blog, x, ...)
├── assets/
│   ├── css/                        # Blog stylesheet (blog.css) and post-specific interactive CSS
│   ├── js/                         # analytics.js, analytics-init.js, blog-*.js, custom visuals
│   ├── fonts/                      # Self-hosted Inter latin subset (woff2) and licenses
│   ├── imgs/                       # Avatar, site logo, favicon, QR codes
│   ├── files/                      # Downloadable CV PDF and hosted paper PDFs
│   ├── logo/                       # Organization logos for Experience cards
│   ├── pipelines/                  # Full-resolution project/paper pipeline figures
│   ├── thumbs/                     # Auto-generated WebP thumbnails (managed by build.js)
│   └── vendor/katex/               # Self-hosted KaTeX CSS, JS, and fonts
├── blogs/
│   ├── README.md                   # Complete blog authoring, bilingual, and style guide
│   ├── check.py                    # Zero-dependency HTML/asset/style validator
│   ├── index.html                  # Blog post index (filterable by type, topic, search)
│   ├── example/                    # Starter template for new EN / EN+ZH blog posts
│   └── <slug>/                     # Individual posts (index.html, optional zh/index.html, cover.webp, figs)
├── google_scholar_crawler/
│   └── fetch_scholar.py            # Fetches Scholar citation stats & GitHub repo stars
├── build.js                        # Merges locales, optimizes images, compiles index.html & zh/index.html
├── package.json                    # Node dependencies (axios, cheerio, fs-extra, handlebars, sharp)
├── ANALYTICS.md                    # GA4 semantic event contract and QA guide
├── CNAME                           # Custom domain for GitHub Pages (falcary.com)
├── index.html                      # Generated English homepage
└── zh/index.html                   # Generated Chinese homepage
```

## 🛠️ Setup, Build & Local Preview

Requires **Node.js >= 18** (Node 22 used in CI) and **Python 3.10+** (standard library only for `blogs/check.py`; `requests` + `beautifulsoup4` for the Scholar/GitHub crawler).

```bash
# 1. Install Node dependencies
npm install

# 2. Build English (/) and Chinese (/zh/) homepages + WebP thumbnails
npm run build

# 3. Validate all blog pages (must report 0 errors before pushing)
python3 blogs/check.py

# 4. Start a local static preview server (never loads production GA4 tags on localhost)
python3 -I -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/` for the English homepage, `http://127.0.0.1:8000/zh/` for Chinese, and `http://127.0.0.1:8000/blogs/` for the blog index.

To refresh cached Google Scholar citations and GitHub star badges locally:

```bash
pip install requests beautifulsoup4
python3 google_scholar_crawler/fetch_scholar.py
npm run build
```

## 🌐 Localization Architecture

The build preserves a single source of truth for research metadata:

- [config/data.json](config/data.json) holds shared structure: URLs, social links, author lists, venues, images, `analyticsId` keys, and arrays (`education`, `news`, `projects`, `experiences`, `awards`).
- [config/locales/en.json](config/locales/en.json) defines English metadata and UI strings.
- [config/locales/zh-CN.json](config/locales/zh-CN.json) defines Chinese UI strings plus a `content` object that overrides only translated fields **by array index**.
- [templates/index.html](templates/index.html) and [templates/partials/paper.html](templates/partials/paper.html) are shared by both locales.
- `build.js` deep-merges each locale override on top of `data.json` by position and compiles `index.html` and `zh/index.html`.

When adding a new publication, insert it in `config/data.json`, add the matching translated `description` at the exact same array index in `config/locales/zh-CN.json`, and run `npm run build`. Links, stars, images, authors, and venues are inherited automatically.

## 📝 Configuration Guide

### Site & Analytics (`site`, `analytics`, `footer`)
- `site.url`: Canonical base URL (e.g., `"https://www.falcary.com/"`), used for `canonical`, `hreflang`, Open Graph tags, and JSON-LD.
- `analytics.measurementId`: Optional GA4 measurement ID (e.g., `"G-XXXXXXXXXX"`). Leave empty (`""`) to disable analytics injection.
- `footer.visitorTracker`: Optional `{ "pageUrl": "...", "imageUrl": "..." }` for a visitor map badge; set to `null` or omit to hide.

### Personal Information (`personal`)
- Identity & affiliation: `name`, `nameChinese`, `title`, `school`, `university`, `location`, `timeZone` (IANA timezone for the live header clock, e.g. `"Asia/Shanghai"`), `email`.
- Media & key links: `profileImage` (path inside `assets/`), `googleScholar`, `github`, `cv`, `blog`.
- `social`: Array of extra social icons referencing SVG basenames in [templates/icons/](templates/icons/). Entries with `"url"` render direct links; entries with `"qr"` (and optional `"account"`) render an accessible click-to-toggle QR popover.

### Research & Showcase (`research`, `projects`, `projectCategories`)
- `research`: Intro text (`research.intro`, HTML supported) and focus bullets (`research.topics`).
- `projectCategories`: Ordered list of category descriptors (`key` and `analyticsArea`). Labels live in `ui.projectGroupLabels`.
- `projectShowcaseIds`: Ordered list of `analyticsId` values promoted into the top-level **Projects** showcase section instead of **Selected Research Papers**.
- `selectedPaperIds`: Curated subset of `analyticsId` values shown by default under **Selected Research Papers** (`Selected` filter); switching to `All` or a topic filter displays the full publication list.
- Each entry in `projects.<category>` requires a unique `analyticsId` (`^[a-z][a-z0-9_]{0,79}$`), `title`, `authors`, `description`, `venue`, `image`, and `links` (`type`, `url`). GitHub repo URLs automatically display `★N` badges when matched in `config/github_data.json`.

### Education, News, Experience, Awards & Activities
- `education`: Array of `{ period, description, note }` (HTML supported).
- `showNews` & `news`: Set `showNews: true` to display the **News** section (`{ date, emoji, content }`).
- `experiences`: Array of `{ title, organization, period, host, logo, emoji }` rendered as a two-column card grid (falls back to `emoji` when `logo` is omitted).
- `awards`: Array of `{ date, content }`.
- `activities`: `{ conference_reviewer, journal_reviewer }`.

## ✍️ Blog System & Latest Posts Feed

Blog posts under [blogs/](blogs/) are hand-written static HTML pages stylized after [Lil'Log](https://lilianweng.github.io/), kept independent from the Handlebars build pipeline so posts can include custom interactive diagrams, inline SVGs, and self-hosted KaTeX equations.

- Full authoring rules, typography conventions, asset rules, and bilingual alignment specs live in [blogs/README.md](blogs/README.md).
- Supported post types: `deep-dive`, `tech-report`, `tutorial`, `paper-notes`, and `tool`.
- `build.js` scans `blogs/index.html` using `cheerio`, takes the newest `3` entries (`LATEST_POST_COUNT = 3`), and renders the **Blog** card section on both homepages (automatically linking the Chinese homepage `/zh/` to `./blogs/<slug>/zh/` whenever a Chinese version exists).
- Always run `python3 blogs/check.py` before committing blog changes — `.github/workflows/blog-check.yml` enforces zero errors in CI.

## ⚙️ GitHub Actions Automation

- [google_scholar_crawler.yaml](.github/workflows/google_scholar_crawler.yaml): Runs daily at `00:00 UTC` (plus on pushes to `main` and `workflow_dispatch`). Executes `google_scholar_crawler/fetch_scholar.py`, rebuilds thumbnails and static HTML via `npm run build`, and commits updated `config/github_data.json`, `config/scholar_data.json`, `index.html`, `zh/index.html`, and `assets/thumbs/` only when generated output changes.
- [blog-check.yml](.github/workflows/blog-check.yml): Validates `blogs/**`, `assets/css/blog.css`, and `assets/js/blog-*.js` with `python3 blogs/check.py` on push and pull requests.

## 🔧 Customization & Build Script Details

- Edit styles directly in the `<style>` block of [templates/index.html](templates/index.html) (homepage) or [assets/css/blog.css](assets/css/blog.css) (blog).
- Add new SVG social/icon entries by placing a clean `<svg>` file in [templates/icons/](templates/icons/) and referencing its basename in `personal.social`.
- `build.js` reads `git log -1` across `config/data.json`, `config/locales/`, and `templates/` so automated daily Scholar/star refreshes do not overwrite the footer's **Last updated** date.
- Thumbnails in `assets/thumbs/` use SHA-1 content-hashed WebP filenames (`880px` wide for project figures, `560px` wide for the avatar) and remove unused files automatically.

## 📊 Analytics

See [ANALYTICS.md](ANALYTICS.md) for the GA4 event contract (`contact_click`, `profile_link_click`, `cv_click`, `language_switch`, `select_content`, `project_impression`, `section_view`), custom dimension setup, and local QA instructions.

## 📄 License

MIT License — feel free to use and adapt this repository for your own homepage!

## 🙋‍♂️ Acknowledgement

This homepage and blog system draws inspiration from:

- [Renrui Zhang's Homepage](https://zrrskywalker.github.io/)
- [Song Chen's Homepage](https://song-chen1.github.io)
- [Purshow's Homepage](https://Purshow.github.io)
- [Lil'Log](https://lilianweng.github.io/) (blog typography, table of contents, and citation layout)

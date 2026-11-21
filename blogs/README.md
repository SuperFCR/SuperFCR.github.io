# Blog 写作规范

线上地址：<https://www.falcary.com/blogs/>。页面是手写的静态 HTML，不经过 `build.js`。版式参考 [Lil'Log](https://lilianweng.github.io/)，配色、背景和宽度沿用主页。

本文件里能机器检查的规则，都写进了 `blogs/check.py`。**push 之前必须跑一遍，0 errors 才能发布**（见「发布前检查」）。push 到 `main` 后 GitHub Actions 也会再跑一次（`.github/workflows/blog-check.yml`）。

## 目录结构

```
blogs/
├── README.md                 # 本文件
├── check.py                  # 规范检查脚本（只用 Python 标准库）
├── index.html                # 文章列表（只有英文）
├── example/                  # 示例文章：新文章从它复制；不上列表页，带 noindex
└── <slug>/                   # 一篇文章一个目录
    ├── index.html            # 英文版（必有）
    ├── zh/index.html         # 中文版（可选）
    ├── cover.webp            # 列表页封面，880×495
    └── fig-*.webp / fig-*.svg  # 文中插图

assets/css/blog.css           # 所有 blog 页面共用的样式（含深色模式）
assets/js/blog-theme.js       # 亮暗切换
assets/js/blog-list.js        # 列表页的类型/主题筛选、搜索和计数
assets/js/blog-post.js        # 文章页增强（桌面端右侧目录、代码复制、阅读进度、图片放大）
assets/imgs/logo.svg          # 站点图标（羽毛），用于顶部导航品牌位
assets/imgs/favicon.png       # 由 logo.svg 生成的 192px PNG，主页和 blog 共用
```

## 新建一篇文章

1. **定 slug**：只用小写字母、数字和连字符，例如 `world-r1`、`v-jepa-2`。发布后不再改，改了旧链接会失效。
2. **复制示例**：`cp -r blogs/example blogs/<slug>`，然后删掉示例的 `cover.webp`、`fig-pipeline.webp`，以及两个版本 `<head>` 里的 `<meta name="robots" content="noindex">`（这一行只给示例页用）。
3. **改 `<head>`**：标题、description、canonical；有中文版时再改 3 个 hreflang 链接。只有英文版时按「双语规则」删掉对应部分。
4. **写正文**：英文版和中文版的章节结构保持一致，`id` 用同一套英文锚点。这样两版目录对得上，切换语言时也不会迷路。
5. **放图片、做封面**：见下面「图片」和「封面」两节。
6. **加到列表页**：在 `blogs/index.html` 里复制一个 `post-entry`，按日期从新到旧放好，同时把 `list-count` 改成新的篇数（例如 `2 posts`）。脚本运行后会重新计数，这里写的是脚本加载前显示的初始值。
7. **检查**：`python3 blogs/check.py` 到 0 errors，再按「发布前检查」里的人工项看一遍，然后 commit 并 push 到 `main`。GitHub Pages 通常一两分钟内就会更新。

列表条目的格式：

```html
<article class="post-entry" data-type="paper-notes">
    <div class="entry-body">
        <div class="entry-top"><span class="post-type type-paper-notes">Paper Notes</span><span class="entry-topics"><span>World Models</span><span>RL</span></span></div>
        <header class="entry-header"><h2>English Title</h2></header>
        <p class="entry-content">One or two sentences on what the post covers.</p>
        <footer class="entry-footer"><span>June 8, 2026</span><span>25 min read</span><span>EN · <span lang="zh-CN">中文</span></span></footer>
    </div>
    <img class="entry-cover" src="./<slug>/cover.webp" width="880" height="495" alt="" loading="lazy">
    <a class="entry-link" href="./<slug>/" aria-label="English Title"></a>
</article>
```

- `data-type` 和类型徽章的 class 必须是下面四种之一，两处一致，也和文章页的徽章一致。
- 主题词 1–2 个，用英文、首字母大写，尽量复用已有的（如 `World Models`、`Representation`、`RL`、`Video Generation`、`3D Vision`、`Coding Agents`）。它们必须是文章页 `post-tags` 的前几个；文章页可以再多加几个。
- 标题和 `aria-label` 都与英文版文章标题完全一致。
- 摘要写 1–2 句，卡片上最多显示两行。
- 页脚三段依次是日期、阅读时间、语言，和文章页的元信息一致。语言只有英文时写 `EN`，有中文版时写 `EN · <span lang="zh-CN">中文</span>`。列表页不写作者。
- 阅读时间：英文按每分钟约 230 词估算，中文按每分钟约 400 字，四舍五入到整数分钟，最少 1 分钟。代码块不计入。脚本会核对，误差超过 1 分钟会报错。

### 列表页只放真实文章

- 不放占位条目，也不放示例文章。页面里出现 `Placeholder`、`TODO`、`TBD`、`Lorem ipsum` 时脚本会报错。
- 篇数少的时候不需要凑数：类型不足两种时，筛选栏会自动隐藏。

## 文章类型

每篇文章只选一种类型。类型决定徽章颜色，列表页可以按类型筛选。

| 类型 | key（`data-type` / `type-*`） | 中文名 | 适用 |
|---|---|---|---|
| Deep Dive | `deep-dive` | 深入探索 | 把一个方向或一串论文串起来讲透的长文 |
| Tech Report | `tech-report` | 技术报告 | 自己项目、实验或复现的记录与结果 |
| Tutorial | `tutorial` | 教程 | 一步步教会读者做某件事 |
| Paper Notes | `paper-notes` | 论文笔记 | 单篇论文的精读笔记 |

文章页在标题上方放同一个徽章：英文版写英文名，中文版写中文名，例如 `<span class="post-type type-deep-dive">深入探索</span>`。

要新增类型：在 `blog.css` 的「Post types」处给浅色和深色各加一行颜色，在列表页加一个筛选按钮，在 `check.py` 的 `TYPES` 里登记，再补进上表。

## 双语规则

英文版必有，中文版可选。只有英文版时（例如 `blogs/pocketrig/`）：不建 `zh/` 目录，删掉 `<head>` 里的三个 `hreflang` 链接和标题上方的语言胶囊，列表条目的语言只写 `EN`。

| | 英文版 `/blogs/<slug>/` | 中文版 `/blogs/<slug>/zh/` |
|---|---|---|
| `<html lang>` | `en` | `zh-CN` |
| `<title>` 后缀 | ` \| Chaoran Feng` | ` \| 冯超然` |
| 资源路径前缀 | `../../` | `../../../` |
| 语言胶囊 | `EN` 带 `aria-current="page"` | `中文` 带 `aria-current="page"` |
| 元信息 | `<span>November 19, 2026</span><span>4 min read</span><span>Chaoran Feng</span>` | `<span>2026 年 11 月 19 日</span><span>3 分钟阅读</span><span>冯超然</span>` |
| 目录标题 | `Table of Contents` | `目录` |
| 文末章节 | `Citation`、`References` | `引用本文`、`参考文献` |
| 图注 | `Fig. 1. …` | `图 1：…` |
| 看原图链接 | `Open full size` | `查看原图` |

- 元信息由三个 `<span>` 组成，分隔符 `|` 由 CSS 加。这样手机上只会在两段之间换行，不会把一段拆成两行。
- 两个版本的日期、类型、章节 `id` 和 `post-tags` 必须一致。
- 顶部导航、面包屑、页脚和文末的主题词标签在两个版本里都保持英文；只有标题上方的类型徽章随语言切换（如 `Deep Dive` / `深入探索`）。
- 中文版中的英文片段（参考文献、BibTeX、英文引用格式）加 `lang="en"`。
- 引用格式（Cited as 和 BibTeX）两个版本都用英文标题和英文版网址。

## 可用组件

所有样式都写在 `blog.css` 里。正文里不要写 `style="..."` 或 `<style>`，也不要引入新颜色。

| 组件 | 写法 |
|---|---|
| 二级/三级标题 | `<h2 id="method">Method<a class="anchor" href="#method" aria-hidden="true">#</a></h2>`，`h3` 同理；`id` 用小写英文和连字符 |
| 目录 | `<details class="toc">`，按顺序列出正文所有 `h2`/`h3`，默认折叠 |
| 引用块 | `<blockquote><p>…</p></blockquote>` |
| 提示框 | `<div class="callout"><p>…</p></div>`（可选 `callout-tip` / `callout-warn`） |
| 行内代码 / 代码块 | `<code>…</code>`；`<pre><code>…</code></pre>`，代码块里的 `<`、`>`、`&` 要转义 |
| 表格 | 外面套 `<div class="table-wrap">`，表头放在 `<thead>` 里，最优结果用 `<td class="best">`。单元格会自动换行，表头和行内代码不换行；每格尽量写短，宽屏上不应出现横向滚动 |
| 插图 | `<figure><img src="./fig-x.webp" width="…" height="…" alt="…" loading="lazy"><figcaption>Fig. 1. …</figcaption></figure>`，编号从 1 连续递增 |
| SVG 插图 | 同上，并在图注**最后**加 `<a href="./fig-x.svg">Open full size</a>`（中文版是 `<a href="../fig-x.svg">查看原图</a>`），让手机读者打开矢量原图放大看 |
| 引用格式 | `<div class="citation">`，里面放 Cited as 引用块和 BibTeX 代码块 |
| 参考文献 | `<ol class="references">` |
| 类型徽章 | `<span class="post-type type-<key>">…</span>`，放在标题上方 |
| 文末 | 最后两节固定是 `h2#citation` 和 `h2#references`；之后是 `post-tags` 和 `paginav` |

暂不支持数学公式。需要时再在 `blog.css` 和页面里统一接入 KaTeX，不要在单篇文章里临时引入。

## 图片

- 放在文章自己的目录里，不要直接引用 `assets/thumbs/`：那里的文件名带哈希，`npm run build` 会删掉主页不再用到的缩略图。
- 照片、截图、论文图用 WebP，宽 1800px。自己画的架构图、流程图用 SVG（例如 `blogs/pocketrig/fig-architecture.svg`），放大不糊。不用 PNG/JPG。
- 单张尽量小于 300KB（超过时脚本给警告），超过 1MB 的不能进仓库（报错）。
- `<img>` 的 `width`、`height` 写文件的真实像素尺寸（SVG 写它的 `width`/`height` 属性），比例不对脚本会报错。这两个属性用来避免加载时页面跳动。
- 正文列宽约 900px，手机上只有约 350px。宽图在手机上会缩得很小：图里的字在 1600px 宽的画布上不要小于 18px，信息太密的图拆成两张，或者至少加上「看原图」链接。
- 深色模式下，图片会显示在浅色底板上并稍微压暗，白底的论文图不用另外处理。
- 转换示例（在仓库根目录运行，用的是已安装的 sharp）：

```bash
node -e "require('sharp')('in.png').resize({ width: 1800 }).webp({ quality: 85 }).toFile('blogs/<slug>/fig-method.webp')"
```

## 封面

- 固定 **880×495（16:9）** 的 WebP，放在 `blogs/<slug>/cover.webp`。列表页按 16:9 裁切显示，尺寸不对会被裁掉边缘，脚本也会报错。
- 封面在电脑上只显示约 240px 宽，要在这个尺寸下也看得清：一个主体，或者三四个大图标，加几个大字（880px 画布上不小于 30px）。**不要直接把论文 pipeline 图或文章里的架构图缩小当封面**，缩小后只剩一团噪点。
- 封面不写文章标题：标题就在卡片左边，重复了反而显得挤。
- 配色沿用站点：深蓝 `#205488`，类型色（`blog.css` 的「Post types」），浅底 `#eaf1f8` → `#f6efe4` 渐变。
- 推荐先画 SVG 再转 WebP，例如（`FONTCONFIG_FILE` 让 sharp 找到系统字体）：

```bash
FONTCONFIG_FILE=$HOME/.local/lib/chromium-deps/fonts.conf node -e "require('sharp')('cover.svg', { density: 144 }).resize({ width: 880 }).webp({ quality: 88 }).toFile('blogs/<slug>/cover.webp')"
```

## 改样式或脚本之后

GitHub Pages 给静态文件设了 10 分钟缓存。页面引用 `blog.css`、`blog-theme.js`、`blog-list.js`、`blog-post.js` 时都带着版本号，例如 `blog.css?v=20261121`。改了这些文件之后，要把所有 blog 页面里的版本号统一换成新的，否则读者的浏览器可能拿新页面配旧样式，页面会显示错乱。

版本号用当天日期 `YYYYMMDD`；同一天第二次改就加 `.2`，第三次加 `.3`，依此类推。在仓库根目录运行（把 `OLD`、`NEW` 换成实际的版本号）：

```bash
grep -rl --include='*.html' 'v=OLD' blogs | xargs sed -i 's/v=OLD/v=NEW/g'
```

所有页面不是同一个版本号时，脚本会报错。

## 不要做的事

- 不要引用 Google Fonts 或境外 CDN 上的脚本和字体，国内常常打不开。字体只用 `assets/fonts/` 里的。
- 这个 README 和其他 Markdown 文件里不要出现两个连续的左花括号或「左花括号加百分号」。GitHub Pages 用 Jekyll 渲染 Markdown，会把它们当成 Liquid 模板语法，可能导致整个站点构建失败。
- 已发布文章的 slug 和章节 `id` 不要改，别人可能链接到了具体章节。

## 本地预览

在仓库根目录运行：

```bash
python3 -I -m http.server 8000 --bind 127.0.0.1 --directory .
```

然后打开 <http://localhost:8000/blogs/>。

## 发布前检查

先跑脚本，必须 0 errors：

```bash
python3 blogs/check.py
```

它检查：`<head>`（标题后缀、description、canonical、hreflang、示例页的 noindex）、类型徽章、元信息格式和阅读时间、目录与章节 `id`、最后两节、引用网址、插图（`figure`/`figcaption`、编号、`width`/`height` 与文件比例、格式与大小、SVG 的看原图链接）、表格包裹、内联样式、外部资源、本地链接、占位文字、中英文版一致性、列表条目与文章页一致、封面尺寸、排序、篇数、`?v=` 版本号统一，以及 Markdown 里的 Liquid 语法。

脚本看不到的，要人工过一遍：

- [ ] 浅色和深色模式都看过一遍（点站名旁的月亮/太阳）。
- [ ] 手机宽度（390px）下看列表页和文章页：没有横向滚动条，元信息换行整齐，插图里的字看得清或有看原图链接。
- [ ] 封面在列表页的小尺寸下看得清，和其他封面放在一起不显得杂乱。
- [ ] 有中文版时，两个版本的语言胶囊互相跳转正确。
- [ ] 点一下对应的类型筛选按钮，确认这篇能被筛出来（类型不少于两种时才有筛选栏）。

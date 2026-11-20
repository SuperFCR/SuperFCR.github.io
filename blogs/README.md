# Blog 写作规范

线上地址：<https://www.falcary.com/blogs/>。页面是手写的静态 HTML，不经过 `build.js`。版式参考 [Lil'Log](https://lilianweng.github.io/)，配色、背景和宽度沿用主页。

## 目录结构

```
blogs/
├── README.md                 # 本文件
├── index.html                # 文章列表（只有英文）
└── <slug>/                   # 一篇文章一个目录
    ├── index.html            # 英文版（默认）
    ├── zh/index.html         # 中文版
    ├── cover.webp            # 列表页封面
    └── fig-*.webp            # 文中插图

assets/css/blog.css           # 所有 blog 页面共用的样式（含深色模式）
assets/js/blog-theme.js       # 亮暗切换
assets/js/blog-list.js        # 列表页的类型筛选和计数
assets/imgs/logo.svg          # 站点图标（羽毛），也是列表页顶部的大图标
assets/imgs/favicon.png       # 由 logo.svg 生成的 192px PNG，主页和 blog 共用
```

`blogs/example/` 是一篇完整的示例文章，用到了下面所有组件。新文章从它复制。

## 新建一篇文章

1. **定 slug**：只用小写字母、数字和连字符，例如 `world-r1`、`v-jepa-2`。发布后不再改，改了旧链接会失效。
2. **复制示例**：`cp -r blogs/example blogs/<slug>`，然后删掉示例的 `cover.webp` 和 `fig-pipeline.webp`。
3. **改两个版本的 `<head>`**：标题、description，以及 4 个链接里的 `example`（canonical 和 3 个 hreflang）。
4. **写正文**：英文版和中文版的章节结构保持一致，`id` 用同一套英文锚点。这样两版目录对得上，切换语言时也不会迷路。
5. **放图片**：见下面「图片」一节。
6. **加到列表页**：在 `blogs/index.html` 的筛选按钮下面复制一个 `post-entry`，放在最上面（按日期从新到旧）。筛选按钮的计数和右侧的文章数由 `blog-list.js` 自动统计，不用手改。
7. **本地预览**，按「发布前检查」逐项过一遍，然后 commit 并 push 到 `main`。GitHub Pages 通常一两分钟内就会更新。

列表条目的格式：

```html
<article class="post-entry" data-type="paper-notes">
    <div class="entry-body">
        <div class="entry-top"><span class="post-type type-paper-notes">Paper Notes</span><span class="entry-topics"><span>World Models</span><span>RL</span></span></div>
        <header class="entry-header"><h2>English Title</h2></header>
        <p class="entry-content">One or two sentences on what the post covers.</p>
        <footer class="entry-footer">June 8, 2026&nbsp;&nbsp;|&nbsp;&nbsp;25 min read&nbsp;&nbsp;|&nbsp;&nbsp;Chaoran Feng&nbsp;&nbsp;|&nbsp;&nbsp;<span class="entry-langs">EN · <span lang="zh-CN">中文</span></span></footer>
    </div>
    <img class="entry-cover" src="./<slug>/cover.webp" alt="" loading="lazy">
    <a class="entry-link" href="./<slug>/" aria-label="English Title"></a>
</article>
```

- `data-type` 和类型徽章的 class 必须是下面四种之一，两处保持一致。
- 主题词 1–2 个，用英文、首字母大写，尽量复用已有的（如 `World Models`、`Representation`、`RL`、`Video Generation`、`3D Vision`）。
- 摘要写 1–2 句，卡片上最多显示两行。
- 阅读时间：英文按每分钟约 230 词估算，中文按每分钟约 400 字，四舍五入到整数分钟。

## 文章类型

每篇文章只选一种类型。类型决定徽章颜色，列表页可以按类型筛选。

| 类型 | key（`data-type` / `type-*`） | 中文名 | 适用 |
|---|---|---|---|
| Deep Dive | `deep-dive` | 深入探索 | 把一个方向或一串论文串起来讲透的长文 |
| Tech Report | `tech-report` | 技术报告 | 自己项目、实验或复现的记录与结果 |
| Tutorial | `tutorial` | 教程 | 一步步教会读者做某件事 |
| Paper Notes | `paper-notes` | 论文笔记 | 单篇论文的精读笔记 |

文章页在标题上方放同一个徽章：英文版写英文名，中文版写中文名，例如 `<span class="post-type type-deep-dive">深入探索</span>`。

要新增类型：在 `blog.css` 的「Post types」处给浅色和深色各加一行颜色，在列表页加一个筛选按钮，再补进上表。

## 双语规则

| | 英文版 `/blogs/<slug>/` | 中文版 `/blogs/<slug>/zh/` |
|---|---|---|
| `<html lang>` | `en` | `zh-CN` |
| 资源路径前缀 | `../../` | `../../../` |
| 语言胶囊 | `EN` 带 `aria-current="page"` | `中文` 带 `aria-current="page"` |
| 元信息 | `Date: November 19, 2026 \| Estimated Reading Time: 4 min \| Author: Chaoran Feng` | `日期：2026 年 11 月 19 日 \| 预计阅读时间：3 分钟 \| 作者：冯超然` |
| 目录标题 | `Table of Contents` | `目录` |
| 文末章节 | `Citation`、`References` | `引用本文`、`参考文献` |

- 顶部导航、面包屑、页脚和文末的主题词标签在两个版本里都保持英文；只有标题上方的类型徽章随语言切换（如 `Deep Dive` / `深入探索`）。
- 中文版中的英文片段（参考文献、BibTeX、英文引用格式）加 `lang="en"`。
- 引用格式（Cited as 和 BibTeX）两个版本都用英文标题和英文版网址。

## 可用组件

所有样式都写在 `blog.css` 里。正文里不要写 `style="..."`，也不要引入新颜色。

| 组件 | 写法 |
|---|---|
| 二级/三级标题 | `<h2 id="method">Method<a class="anchor" href="#method" aria-hidden="true">#</a></h2>`，`h3` 同理 |
| 目录 | `<details class="toc">`，内容和正文的 `h2`/`h3` 一一对应，默认折叠 |
| 引用块 | `<blockquote><p>…</p></blockquote>` |
| 行内代码 / 代码块 | `<code>…</code>`；`<pre><code>…</code></pre>`，代码块里的 `<`、`>`、`&` 要转义 |
| 表格 | 外面套 `<div class="table-wrap">`，表头放在 `<thead>` 里，最优结果用 `<td class="best">` |
| 插图 | `<figure><img src="./fig-x.webp" width="…" height="…" alt="…" loading="lazy"><figcaption>Fig. 1. …</figcaption></figure>`，中文版图注写成 `图 1：…` |
| 引用格式 | `<div class="citation">`，里面放 Cited as 引用块和 BibTeX 代码块 |
| 参考文献 | `<ol class="references">` |
| 类型徽章 | `<span class="post-type type-<key>">…</span>`，放在标题上方 |
| 文末 | `post-tags`（和列表页的主题词一致）和 `paginav`（上一篇/下一篇） |

暂不支持数学公式。需要时再在 `blog.css` 和页面里统一接入 KaTeX，不要在单篇文章里临时引入。

## 图片

- 放在文章自己的目录里，不要直接引用 `assets/thumbs/`：那里的文件名带哈希，`npm run build` 会删掉主页不再用到的缩略图。
- 统一用 WebP：插图宽 1800px，封面宽 880px，单张尽量小于 300KB，避免超过 1MB 的文件进入仓库。
- 转换示例（在仓库根目录运行，用的是已安装的 sharp）：

```bash
node -e "require('sharp')('in.png').resize({ width: 1800 }).webp({ quality: 85 }).toFile('blogs/<slug>/fig-method.webp')"
```

- `<img>` 要写 `width` 和 `height`，避免加载时页面跳动。
- 深色模式下，图片会显示在浅色底板上并稍微压暗，白底的论文图不用另外处理。

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

- [ ] 两个版本都能打开，语言胶囊互相跳转正确。
- [ ] 目录里的每个链接都能跳到对应章节。
- [ ] 图片、封面都能显示，没有 404。
- [ ] 浅色和深色模式都看过一遍（点站名旁的月亮/太阳）。
- [ ] 手机宽度下没有横向滚动条（表格和代码块只在自己的框内滚动）。
- [ ] 列表页条目的日期、阅读时间、类型和主题词与文章页一致；点一下对应的类型筛选按钮，确认这篇能被筛出来。
- [ ] 删除列表页里不再需要的占位条目。

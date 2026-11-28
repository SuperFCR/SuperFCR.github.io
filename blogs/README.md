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
assets/js/blog-post.js        # 文章页增强（桌面端左侧自动手风琴目录、代码复制、阅读进度、图片放大、行内引用悬浮卡片、避头标点保护）
assets/imgs/logo.svg          # 站点图标（星芒轨道），用于顶部导航品牌位
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
| Tool | `tool` | 工具 | 自己开发并可直接使用的工具、插件或工作流 |

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
- 中文版中，术语遵循真实机器学习工程语境的表达习惯：论文原题、模型/方法名以及业内通用的完整英文术语、训练阶段名与固定复合词（如 `Math RLVR`、`Broad-Domain RLVR`、`General SFT`、`Coding SFT`、`Model Merging`、`Reward Hacking`、`Pre-Training / Mid-Training / Post-Training`、`Scaling Law`、`Looped Transformer`、`Looped MoE`、`Flow Matching`、`KV Cache`、`Loss Mask`、`Router Replay`、`Speculative Decoding`、`Attention Sink`、`Logit-lens / Tuned-lens`、`XSA`、`Input Injection`）直接保留完整英文，**禁止生硬直译或拆成半中半英拼接词**（例如「数学 RLVR」「广域 RLVR」「通用 SFT」「领域 SFT」「模型融合 RL」「循环 Transformer」「非嵌入参数」「排他自注意力」「算术强度」「留一配置群」「封闭域」「奖励黑客」）；仅在普通叙述动词及完全定型的基础译词（如「预训练」「微调」「推理」「去重」「过拟合」）处用中文，自然混排表述（如「非 embedding 参数」「长上下文 checkpoint」）全篇保持前后一致。
- 引用格式（Cited as 和 BibTeX）两个版本都用英文标题和英文版网址。

### 内容与写作视角

- **语言习惯（个人笔记语感与反 AI 腔）**：以作者个人梳理论文与工程实践的平实笔记口吻写作（先讲动机直觉再落细节，长短句自然交替；如写「Marin 团队在实现时对每层施加精确修正」）。禁止夸张公众号/AI 套话（如「惊艳」「一举拉穿」「腰斩」「恶性膨胀」「暗雷」「排雷」「深坑」「飙升」「暴跌」「砸到」「冲上」「完胜」「稳步攀」「彻底根治」「全量公开」「断崖式」），禁止套路化 AI 句式（机械三段式排比、「不仅……而且……更标志着……」拔高腔、英文版过长破折号连串），也**不要把 `.py` 文件名、行号或内部函数名当句子主语**（避免「`train.py#L346` 施加修正」「`sources.py` 登记了…」「`eval.py` 计算…」等表达）。具体源码路径只放进 `<pre><code>` 示例注释和文末参考文献 `#ref-*`。
- **行内 `<code>` 只保留给真正的代码符号**：变量名、函数/方法名、配置键与键值设定（如 `lr=4e-6`、`shuffle: false`）、命令行参数、字面特殊 token 以及完整模型/仓库 ID 才用 `<code>`；普通数字、百分比、步数、倍率、上下文长度、数值区间与常规模型/基准名（如 `12.8%`、`67.1B`、`262K`、`1.3`、`16K → 32K → 48K`）直接写成正文或数学公式，不在正文和表格里贴满灰底数字块。
- **少套嵌套括号、不重复搬运相邻表格数字**：密集消融数据与配置参数交由紧邻表格或插图承载，正文用短句讲清原理直觉、因果权衡、核心结论与边界；避免在单个句子里堆叠多层嵌套括号或连串分号。
- **GitHub Issue 编号下沉到参考文献**：正文、表格与图注优先通过行内 `[N]` 悬浮引用卡溯源，不在运行文本中频繁夹带 `(#xxxx)` Issue 编号（`<pre><code>` 代码注释与文末 `#ref-*` 除外）。
- **深入一手来源，不省略核心细节**：撰写技术教程或论文精读时必须核对**原始网页、官方博客、模型卡、arXiv HTML 与一手 Issues**，不要仅凭浓缩 PDF 或二手摘要略过关键公式推导、消融设计与真实实验数字。
- **严谨的事实边界与实验区分（不夸大、不倒推、不混谈）**：
  - 如实写清负结果、统计口径与未验证边界（例如调度 token 位置数 ≠ 有效监督 token、配置上下文 ≠ 实测长窗能力、开发集反复选型 ≠ 独立测试分数、非匹配对照不可硬比）。
  - 现行新文档或新管线规则必须明标为当前实现，不得倒推为早期模型已经采用。
  - 原理或作用层次不同的工程机制（如冻结 balancing bias vs. captured-route replay）必须拆开表述；同一方向存在多轮定位不同的实验时，配简明对照表区分「起点—任务—算法与规模—结果用途」。
- **结构克制，只嵌主线、不写凑数结语**：
  - 不在正文末尾另立泛泛的「工程要点总结 / Takeaways」章节，主体讲透后直接接 `Citation` 与 `References`。
  - 后续补充经筛选的高价值实验时，优先无痕嵌入既有对应小节，不按 Issue/论文列表硬切零散小节；进行中未定论的消融或仅偶发于特定驱动版本的底层 Bug 宁缺毋滥。

### 段落、排版与视觉样式

- **版式与克制玻璃态风格**：文章页采用**居中阅读主轴**（`680px` 舒适读宽；`≥1360px` 宽屏下图片与宽表适度外扩，桌面主轴水平居中输入偏置 `centerShift = 0`），配**左侧轻量自动手风琴目录（Quiet Left Auto-Accordion TOC）**与**吸顶顶部导航栏**。浮层控件（滚动后的吸顶顶栏、引用预览卡 `.cite-card`、语言切换胶囊、列表筛选/搜索框、回到顶部、代码复制按钮）统一使用**克制的 Apple 半透明毛玻璃质感**，严格沿用站点既有浅暖纸色与深蓝主色，不改主色调。
- **并列要点必须换行/列点**：正文中出现 `（1）…；（2）…；（3）…`、`第一…第二…`、`其一…其二…`、`First, ... Second, ...` 或 3 项及以上并列结论/机制时，不要用分号硬塞进单个 `<p>` 段落，改为简短引导句配 `<ul>` 或 `<ol>` 列表；`.callout` 框内同理适用。
- **控制单段与单条长度**：叙事段落一般不超过 3–4 句（中文约 150–250 字以内），同一条 `<li>` 避免同时硬塞两篇独立论文或两个完整机制；有明显转折或两组不同实验时另起新段。
- **标题单行、杜绝孤立标点与移动端溢出**：
  - 桌面端 `h2` / `h3` 标题与左侧 TOC 条目尽量简洁，保持单行不折行。
  - 正文与列表严格避免行首出现孤立标点（如第二行开头只剩单个句号/逗号，尤其紧跟 `<code>`、KaTeX 公式与 `[N]` 之后，需依赖 `blog.css`/`blog-post.js` 保护并在预览确认）。
  - HTML 正文中严禁出现原生 Markdown 反引号，一律改用 `<code>...</code>`；遇到超长 `<code>` 字符串（如长仓库名、模型名、分支路径）时按需插入 `<wbr>`，确保 `390px` 手机端无横向滚动条。

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
| 行内引用 | 正文中需要引用处写 `<a class="cite" href="#ref-1">[1]</a>`，鼠标悬浮或聚焦弹出参考文献预览卡 |
| 参考文献 | `<ol class="references">`，启用行内引用时每项带 `id="ref-1"` 和 `data-brief="…"` |
| 类型徽章 | `<span class="post-type type-<key>">…</span>`，放在标题上方 |
| 文末 | 最后两节固定是 `h2#citation` 和 `h2#references`；之后是 `post-tags` 和 `paginav` |

已内置本地托管的 **KaTeX**（`assets/vendor/katex/`，`auto-render` 配合 `$...$` 行内公式与 `$$...$$` 块级公式，禁止引入外部 CDN）。关键机制与 Scaling 推导的公式应写详细并明确定义每个符号，块级公式宽度控制在 `680px` 阅读列内不溢出，发布前须确认 KaTeX 严格渲染 `0` 报错。

### 行内引用与悬浮预览卡片

正文与文末参考文献采用**单一数据源**关联，不在正文里重复粘贴论文链接或摘要：

```html
<!-- 正文行内标注 -->
<p>This structure pairs Column- and Row-Parallel layers<a class="cite" href="#ref-2">[2]</a>.</p>

<!-- 文末参考文献列表（<ol class="references">）：英文版写英文 data-brief，中文版写中文 data-brief -->
<ol class="references">
    <li id="ref-2" data-brief="Proposes intra-layer Column/Row-Parallel MLP and MHA...">
        <a href="https://arxiv.org/abs/1909.08053" target="_blank" rel="noopener">Megatron-LM: ...</a>.
        Shoeybi et al., NVIDIA, 2019 (arXiv:1909.08053).
    </li>
</ol>
```

- **交互行为（由 `blog-post.js` 自动增强）**：
  - 当 `<li id="ref-N">` 含外部 `<a>` 链接时，桌面端直接点击正文的 `[N]` 可直接跳转访问原文（新标签页打开）；若该条参考无外链，则平滑滚动并高亮定位到 `#ref-N`。
  - 鼠标悬浮或键盘聚焦到 `[N]` 时，在旁边弹出参考文献预览卡片（`.cite-card`），显示编号、来源域 / `arXiv` 徽章、可点击跳转的标题、作者出处、`data-brief` 简介，以及「Open source / 访问原文」和「References / 定位引用」快捷操作。
  - 移动端点击 `[N]` 时先在底部弹出预览卡供查看简介或选择打开原文 / 定位文末，不直接跳走打断阅读。
  - 可选属性：`data-source` 可覆盖来源标签，`data-title` 可覆盖卡片标题；支持URL 参数 `?cite_demo=1` 固定展开第 1 条预览卡用于截图检查。
- **克制引用原则（避免视觉噪音）**：每条文献仅在**首次出现**、**最核心的专属章节/定义处**，以及**插图图注（`<figcaption>`）标注原图出处**时加行内引用 `[N]`；同一章节内不要每段或每条 `<li>` 重复挂号，文末启示、总结 callout 与综述对照表也不再重复标注。
- **脚本校验**：一旦页面使用 `a.cite` 或 `ref-*` id，`check.py` 会核对 `<ol class="references">` 中 `id="ref-1"` 到 `ref-N` 顺序完整、每项都有非空 `data-brief`，每处 `<a class="cite" href="#ref-N">[N]</a>` 编号与目标匹配，且中英文版引用用法和条目数一致。

## 图片

- 放在文章自己的目录里，不要直接引用 `assets/thumbs/`：那里的文件名带哈希，`npm run build` 会删掉主页不再用到的缩略图。
- 照片、截图、论文图用 WebP，宽 1800px。自己画的架构图、流程图用 SVG（例如 `blogs/pocketrig/fig-architecture.svg`），放大不糊。不用 PNG/JPG。
- 单张尽量小于 300KB（超过时脚本给警告），超过 1MB 的不能进仓库（报错）。
- `<img>` 的 `width`、`height` 写文件的真实像素尺寸（SVG 写它的 `width`/`height` 属性），比例不对脚本会报错。这两个属性用来避免加载时页面跳动。
- 正文阅读宽度为 `680px`（宽屏 `≥1360px` 下插图与宽表适度外扩），手机上仅约 `350px`。宽图在手机上会缩得很小：图里的字在 1600px 宽的画布上不要小于 18px，信息太密的图拆成两张，或者至少加上「看原图」链接。
- **重要实验与对比结论必配图/表**：涉及核心机制消融、训练曲线或新串入的实验发现时，不要只用文字平铺——应同时拉取原文/官方博客/模型卡关键实验图并配合简洁对照表呈现实证数据。
- 深色模式下，图片会显示在浅色底板上并稍微压暗，白底的论文图不用另外处理。
- 转换示例（在仓库根目录运行，用的是已安装的 sharp）：

```bash
node -e "require('sharp')('in.png').resize({ width: 1800 }).webp({ quality: 85 }).toFile('blogs/<slug>/fig-method.webp')"
```

### 拉取论文原图（优先 arXiv HTML）

- **盘点并优先查 HTML / 官方原图而非截 PDF**：撰写前先清点原文、arXiv HTML（`https://arxiv.org/html/<id>` `<object type="image/svg+xml" data="...">` 或 `<img>`）、官方博客与 HuggingFace 模型卡中的全部核心图表，避免遗漏（例如关键消融曲线或机制示意图），清晰度远高于 PDF 截图。
- **一律自托管转本地 WebP，不要外链原站，也不要把 arXiv 原 SVG 直接当 `<img>`**：
  - 禁止外链外部图片 URL（防盗链、链接失效、国内访问不稳定及深色模式不可控）。
  - arXiv HTML 导出的 `.svg` 常带 `pt` 单位（如 `width="480pt"` 会导致 `check.py` 无法解析尺寸）、体积常超 300KB，且往往没有白底（深色模式下对比度变差），因此统一转成白底本地 `.webp` 放入 `blogs/<slug>/`。
- **转换配方（高 DPI 栅格化 + 白底 + 20px 均匀留白）**：

```bash
FONTCONFIG_FILE=$HOME/.local/lib/chromium-deps/fonts.conf node -e "
require('sharp')('paper-fig.svg', { density: 288 })
  .flatten({ background: '#ffffff' })
  .resize({ width: 1400, withoutEnlargement: true })
  .extend({ top: 20, bottom: 20, left: 20, right: 20, background: '#ffffff' })
  .webp({ quality: 86, effort: 5 })
  .toFile('blogs/<slug>/fig-example.webp')
"
```

- 若单张体积大于 250KB，可降到 `quality: 80`；需要把论文多张原图并排拼合时，可先分别 `flatten` + `resize` 成 PNG buffer，再用 `sharp({ create: ... }).composite([...])` 拼到同一张白底画布后再输出 `.webp`。
- 转换后务必实际看图核对有无缺字、公式乱码或裁边；若复杂 SVG 被 `librsvg` 漏渲染元素，改用 `~/.local/lib/chromium-deps/shot.sh` 截图后再用 `sharp` 压成 `.webp`。
- 论文原图转出的 `.webp` 必须在图注注明出处（`Source: ...` / `来源：...`），且不要加 `.svg` 专用的 `Open full size` / `查看原图` 链接。

## 封面

所有文章列表页封面统一采用**编辑部孔版印刷科学几何插画（Archival Risograph Scientific Illustration）**体系，确保列表页 7+ 篇文章在浅色与深色模式下呈现一致的出版物画册质感（类似 Anthropic Research / Stripe Press / Quanta Magazine）。

### 1. 尺寸与文件规范

- 固定 **880×495（16:9）** 的 WebP，存放于 `blogs/<slug>/cover.webp`，单张 `< 300 KB`（通常 50–120 KB）。列表页按 16:9 显示，尺寸不对会被裁切且 `blogs/check.py` 会报错。
- **不放任何文字、字母、数字、数学符号、假字或 UI 边框**：文章标题、类型和元信息已位于卡片左侧，封面只承载纯视觉几何隐喻；不再使用扁平 PPT 流程图、圆角文字胶囊或直接把论文 pipeline 缩小当封面。

### 2. 统一视觉语言（四色 + 暖棉纸）

| 视觉要素 | 色值 / 材质 | 职责 |
|---|---|---|
| 纸张底色 | 暖米白棉纸 `#f6f3ea` | 极轻纸张肌理与充足留白，无边框、无卡片投影 |
| 普鲁士深蓝 | `#205488` | 核心几何体、精细建筑/数学线框、主结构与流线 |
| 哑光青绿 | `#0f766e` | 半透明次级层次、测地线/流形带、辅助通道与叠色 |
| 陶土赭橙 | `#c2410c` | 单一高对比焦点（反射面、对齐带、反馈环或主传输束，克制使用） |
| 冷石板灰 | `#64748b` | 圆规辅助弧、十字准星、坐标网格与半调网点阴影（halftone dots） |

- **构图原则**：每篇文章只提炼 **1 个核心机理的几何隐喻**（例如：QK-Norm 用超球面浑仪与反射平面；Looped Transformer 用堆叠核心板与正反双环回路；Distributed Training 用 2×2 切片立方体与对角通信带；Flow Matching RL 用网点高斯云经流线分叉收敛至目标环），确保在列表页 `240px–420px` 宽度下依然一眼可辨。

### 3. 生图 Prompt 模板与转码入库

使用图像生成工具（如内置 `image-generator`）生成 16:9 样图时，复用以下英文锚点模板，并将既有任意一篇封面（如 `blogs/qk-norm-geometry/cover.webp`）作为风格参考，只替换 `[SUBJECT]` 部分：

```text
Generate a single 16:9 widescreen editorial cover illustration matching the EXACT
visual style, warm cream-ivory cotton paper texture, line weight, halftone shading,
and color palette of blogs/qk-norm-geometry/cover.webp (Anthropic Research / Stripe
Press / Quanta Magazine modern risograph scientific illustration).

STRICT STYLE ANCHOR:
- Background: warm cream-ivory cotton archival paper (#f6f3ea) with very subtle paper
  grain, clean generous negative space, NO border or frame.
- Palette ONLY: deep Prussian blue (#205488), muted translucent teal (#0f766e), bold
  terracotta-ochre (#c2410c), and fine slate-gray (#64748b) geometric compass /
  construction lines and stippled halftone dot shading.
- Strictly ZERO text, ZERO letters, ZERO numbers, ZERO symbols, ZERO UI chrome.

SUBJECT:
[Describe one clear geometric/architectural metaphor for the post's core mechanism.]
```

出图后先目检确认**无残留文字/乱码、无外框、纸色和四色比例与既有封面一致**，再用 `sharp` 统一压成 `880×495` WebP：

```bash
node -e "
require('sharp')('raw-cover.jpg')
  .resize(880, 495, { fit: 'cover', position: 'centre' })
  .webp({ quality: 86, effort: 6 })
  .toFile('blogs/<slug>/cover.webp')
"
```

## 改样式或脚本之后

GitHub Pages 给静态文件设了 10 分钟缓存。页面引用 `blog.css`、`blog-theme.js`、`blog-list.js`、`blog-post.js` 时都带着版本号，例如 `blog.css?v=20261121.5`。改了这些文件之后，要把所有 blog 页面里的版本号统一换成新的，否则读者的浏览器可能拿新页面配旧样式，页面会显示错乱。

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

它检查：`<head>`（标题后缀、description、canonical、hreflang、示例页的 noindex）、类型徽章、元信息格式和阅读时间、目录与章节 `id`、最后两节、引用网址、行内引用与参考简介、正文残留裸反引号（`` ` ``）以及行文卫生警告（`.py#L` 行号拟人化、半翻译/机翻术语、夸张 AI/营销词、正文内联 `#xxxx` Issue 编号、纯百分比/规模/倍率数字 `<code>` 块）、插图（`figure`/`figcaption`、编号、`width`/`height` 与文件比例、格式与大小、SVG 的看原图链接）、表格包裹、内联样式、外部资源、本地链接、占位文字、中英文版一致性、列表条目与文章页一致、封面尺寸、排序、篇数、`?v=` 版本号统一，以及 Markdown 里的 Liquid 语法。

脚本看不到的，要人工或无头浏览器（建议对重要改动以本地 Chromium 测 `1440 / 1280 / 1024 / 768 / 390` 五档视口）过一遍：

- [ ] 浅色和深色模式都看过一遍（点站名旁的月亮/太阳）。
- [ ] 通读语感与语言习惯：无半中半英强行拼接术语、无夸张 AI/公众号腔、无密集嵌套括号与满屏灰底数字块。
- [ ] 多视口渲染无横向溢出（尤其 `390px` 手机端 `hasHScroll = false`）、桌面主轴严格居中（`centerShift = 0`）、`h2`/`h3` 与 TOC 单行不折行。
- [ ] 无 KaTeX 公式报错、无破图、无第二行开头孤立标点（`orphanPunctCount = 0`），新增图表截图已实际目检且字体清晰。
- [ ] 封面在列表页的小尺寸下看得清，和其他封面放在一起不显得杂乱。
- [ ] 有中文版时，两个版本的语言胶囊互相跳转正确。
- [ ] 点一下对应的类型筛选按钮，确认这篇能被筛出来（类型不少于两种时才有筛选栏）。

#!/usr/bin/env python3
"""Check every blog page against blogs/README.md.

Run from anywhere:  python3 blogs/check.py
Exit status is 1 when there are errors; warnings alone do not fail.
Standard library only, so it runs the same locally and in CI.
"""

import json
import re
import struct
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote

BLOGS = Path(__file__).resolve().parent
ROOT = BLOGS.parent
_CONFIG = json.loads((ROOT / 'config' / 'data.json').read_text(encoding='utf-8'))
SITE = _CONFIG['site']['url'].rstrip('/')
_EN_AUTHOR = _CONFIG['personal']['name']
_ZH_AUTHOR = _CONFIG['personal'].get('nameChinese') or _EN_AUTHOR
NOT_LISTED = {'example'}  # reachable template pages that stay off the list

TYPES = {  # key: (English badge, Chinese badge)
    'deep-dive': ('Deep Dive', '深入探索'),
    'tech-report': ('Tech Report', '技术报告'),
    'tutorial': ('Tutorial', '教程'),
    'paper-notes': ('Paper Notes', '论文笔记'),
    'tool': ('Tool', '工具'),
}
LANG = {
    'en': dict(html='en', suffix=f' | {_EN_AUTHOR}', author=_EN_AUTHOR,
               date=r'(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}',
               read=r'(\d+) min read', fig=r'Fig\. (\d+)\. ', full='Open full size', rate=230),
    'zh': dict(html='zh-CN', suffix=f' | {_ZH_AUTHOR}', author=_ZH_AUTHOR,
               date=r'\d{4} 年 \d{1,2} 月 \d{1,2} 日',
               read=r'(\d+) 分钟阅读', fig=r'图 (\d+)：', full='查看原图', rate=400),
}
MONTHS = 'January February March April May June July August September October November December'.split()
VERSIONED = ('blog.css', 'blog-theme.js', 'blog-list.js', 'blog-post.js')
COVER_SIZE = (880, 495)
KB = 1024

BAD_ZH_TERMS = (
    '数学 RLVR', '广域 RLVR', '通用 SFT', '领域 SFT', '模型融合 RL',
    '循环 Transformer', '非嵌入参数', '排他自注意力', '算术强度',
    '留一配置群', '封闭域', '奖励黑客',
)
BAD_ZH_HYPE = (
    '惊艳', '一举拉穿', '腰斩', '恶性膨胀', '暗雷', '排雷', '深坑',
    '砸到', '完胜', '稳步攀', '彻底根治', '全量公开', '断崖式',
)
INLINE_ISSUE_RE = re.compile(r'(?<![&\w="])#\d{3,6}\b')
NUMERIC_CODE_RE = re.compile(
    r'^[~<>±+\-]?\d[\d.,]*(?:%|[KMBT]|×|\s*pp|\s*nats|\s*B/tok)'
    r'(?:\s*[→↔–-]\s*[~<>±+\-]?\d[\d.,]*(?:%|[KMBT]|×|\s*pp)?)?$'
)

errors, warnings = [], []


def err(path, msg):
    errors.append(f'{path.relative_to(ROOT)}: {msg}')


def warn(path, msg):
    warnings.append(f'{path.relative_to(ROOT)}: {msg}')


# ---------- a tiny DOM ----------
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}


class Node:
    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []

    @property
    def classes(self):
        return (self.attrs.get('class') or '').split()

    def text(self):
        return ''.join(c if isinstance(c, str) else c.text() for c in self.children)

    def iter(self):
        for c in self.children:
            if isinstance(c, Node):
                yield c
                yield from c.iter()

    def find_all(self, tag=None, cls=None, **attrs):
        return [n for n in self.iter()
                if (tag is None or n.tag == tag) and (cls is None or cls in n.classes)
                and all(n.attrs.get(k) == v for k, v in attrs.items())]

    def find(self, *a, **k):
        found = self.find_all(*a, **k)
        return found[0] if found else None

    def ancestors(self):
        n = self.parent
        while n is not None:
            yield n
            n = n.parent


class Builder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = self.cur = Node('#root', {}, None)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.cur)
        self.cur.children.append(node)
        if tag not in VOID:
            self.cur = node

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, attrs, self.cur))

    def handle_endtag(self, tag):
        n = self.cur
        while n is not None and n.tag != tag:
            n = n.parent
        if n is not None and n.parent is not None:
            self.cur = n.parent

    def handle_data(self, data):
        self.cur.children.append(data)


def parse(path):
    b = Builder()
    b.feed(path.read_text(encoding='utf-8'))
    return b.root


def clean(s):
    return re.sub(r'\s+', ' ', s).strip()


# ---------- image sizes ----------
def image_size(path):
    data = path.read_bytes()
    if path.suffix == '.svg':
        head = data[:2000].decode('utf-8', 'replace')
        w = re.search(r'<svg[^>]*\swidth="([\d.]+)"', head)
        h = re.search(r'<svg[^>]*\sheight="([\d.]+)"', head)
        return (round(float(w.group(1))), round(float(h.group(1)))) if w and h else None
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II', data[16:24])
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        kind = data[12:16]
        if kind == b'VP8X':
            return (int.from_bytes(data[24:27], 'little') + 1, int.from_bytes(data[27:30], 'little') + 1)
        if kind == b'VP8 ':
            w, h = struct.unpack('<HH', data[26:30])
            return (w & 0x3FFF, h & 0x3FFF)
        if kind == b'VP8L':
            bits = int.from_bytes(data[21:25], 'little')
            return ((bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1)
    return None


def check_file_size(page, file):
    size = file.stat().st_size
    if size > 1024 * KB:
        err(page, f'{file.name} is {size // KB} KB; keep files under 1 MB')
    elif size > 300 * KB:
        warn(page, f'{file.name} is {size // KB} KB; aim for under 300 KB')


# ---------- shared checks ----------
def local_target(page, ref):
    ref = unquote(re.split(r'[?#]', ref, maxsplit=1)[0])
    if not ref:
        return None
    target = (page.parent / ref).resolve()
    if target.is_dir():
        target = target / 'index.html'
    return target


def check_common(page, dom, versions):
    for n in dom.iter():
        if 'style' in n.attrs:
            err(page, f'inline style on <{n.tag}>; put styles in assets/css/blog.css')
        if n.tag == 'style':
            err(page, '<style> element; put styles in assets/css/blog.css')
        for attr in ('href', 'src'):
            ref = n.attrs.get(attr)
            if not ref or ref.startswith(('#', 'mailto:')):
                continue
            if re.match(r'^[a-z]+:', ref):
                if n.tag in ('script', 'link') and n.attrs.get('rel') not in ('canonical', 'alternate'):
                    err(page, f'external resource {ref}; serve scripts, styles and fonts from this site')
                continue
            target = local_target(page, ref)
            if target and not target.exists():
                err(page, f'broken link {ref}')
            name = ref.split('?')[0].rsplit('/', 1)[-1]
            if name in VERSIONED:
                m = re.search(r'\?v=([\w.-]+)', ref)
                versions.setdefault(m.group(1) if m else '(none)', set()).add(page.relative_to(ROOT).as_posix())
    text = dom.text()
    for word in ('Placeholder', 'Lorem ipsum', 'TODO', 'TBD'):
        if word in text:
            err(page, f'page still contains "{word}"')


# ---------- article pages ----------
def check_article(page, slug, lang, has_zh):
    L = LANG[lang]
    dom = parse(page)
    info = {'page': page}
    html = dom.find('html')
    if not html or html.attrs.get('lang') != L['html']:
        err(page, f'<html lang> must be "{L["html"]}"')

    url = f'{SITE}/blogs/{slug}/' + ('zh/' if lang == 'zh' else '')
    head = dom.find('head') or dom
    desc = head.find('meta', name='description')
    if not desc or not clean(desc.attrs.get('content', '')):
        err(page, 'missing <meta name="description">')
    canonical = head.find('link', rel='canonical')
    if not canonical or canonical.attrs.get('href') != url:
        err(page, f'canonical must be {url}')
    alternates = {n.attrs.get('hreflang'): n.attrs.get('href') for n in head.find_all('link', rel='alternate')}
    if has_zh:
        want = {'en': f'{SITE}/blogs/{slug}/', 'zh-CN': f'{SITE}/blogs/{slug}/zh/', 'x-default': f'{SITE}/blogs/{slug}/'}
        if alternates != want:
            err(page, 'needs the three hreflang links (en, zh-CN, x-default)')
        switch = dom.find(cls='lang-switch')
        current = [a for a in (switch.find_all('a') if switch else []) if 'aria-current' in a.attrs]
        if len(current) != 1 or clean(current[0].text()) != ('EN' if lang == 'en' else '中文'):
            err(page, 'language pill must mark the current language with aria-current="page"')
    else:
        if alternates:
            err(page, 'English-only post: remove the hreflang links')
        if dom.find(cls='lang-switch'):
            err(page, 'English-only post: remove the language pill')
    if slug in NOT_LISTED and not head.find('meta', name='robots', content='noindex'):
        err(page, 'template page needs <meta name="robots" content="noindex">')

    title = head.find('title')
    title = clean(title.text()) if title else ''
    if not title.endswith(L['suffix']):
        err(page, f'<title> must end with "{L["suffix"]}"')
    h1 = dom.find('h1', cls='post-title')
    info['title'] = clean(h1.text()) if h1 else ''
    if not h1 or info['title'] != title[:-len(L['suffix'])]:
        err(page, '<h1 class="post-title"> must match <title> without the suffix')

    header = dom.find('header', cls='post-header') or dom
    badges = header.find_all('span', cls='post-type')
    keys = [c[5:] for b in badges for c in b.classes if c.startswith('type-')]
    if len(badges) != 1 or len(keys) != 1 or keys[0] not in TYPES:
        err(page, f'needs one type badge: one of {", ".join("type-" + k for k in TYPES)}')
    else:
        info['type'] = keys[0]
        want = TYPES[keys[0]][0 if lang == 'en' else 1]
        if clean(badges[0].text()) != want:
            err(page, f'type badge must read "{want}"')

    meta = dom.find(cls='post-meta')
    parts = [clean(n.text()) for n in meta.children if isinstance(n, Node)] if meta else []
    if len(parts) != 3 or not re.fullmatch(L['date'], parts[0]) or not re.fullmatch(L['read'], parts[1]) or parts[2] != L['author']:
        example = f'<span>November 20, 2026</span><span>10 min read</span><span>{_EN_AUTHOR}</span>' if lang == 'en' \
            else f'<span>2026 年 11 月 20 日</span><span>10 分钟阅读</span><span>{_ZH_AUTHOR}</span>'
        err(page, f'post-meta must be {example}')
    else:
        info['date'] = parse_date(parts[0], lang)
        info['read'] = int(re.fullmatch(L['read'], parts[1]).group(1))

    content = dom.find('div', cls='post-content')
    if not content:
        err(page, 'missing <div class="post-content">')
        return info

    # reading time
    if 'read' in info:
        prose = clean(' '.join(text_without(content, {'pre'})))
        amount = len(re.findall(r"[A-Za-z0-9][\w'’.-]*", prose)) if lang == 'en' else len(re.findall(r'[\u4e00-\u9fff]', prose))
        minutes = max(1, round(amount / L['rate']))
        if abs(minutes - info['read']) > 1:
            err(page, f'reading time says {info["read"]} min, the text is about {minutes} min')

    # headings and table of contents
    heads = [n for n in content.iter() if n.tag in ('h2', 'h3')]
    ids = []
    for h in heads:
        hid = h.attrs.get('id', '')
        if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', hid):
            err(page, f'<{h.tag}> "{clean(h.text())}" needs a lowercase English id')
            continue
        anchor = h.find('a', cls='anchor')
        if not anchor or anchor.attrs.get('href') != f'#{hid}':
            err(page, f'<{h.tag} id="{hid}"> needs <a class="anchor" href="#{hid}">')
        ids.append(hid)
    if len(ids) != len(set(ids)):
        err(page, 'duplicate heading ids')
    if [h.attrs.get('id') for h in heads if h.tag == 'h2'][-2:] != ['citation', 'references']:
        err(page, 'the last two sections must be h2#citation and h2#references')
    toc = dom.find('details', cls='toc')
    toc_ids = [a.attrs.get('href', '')[1:] for a in toc.find_all('a')] if toc else []
    if toc_ids != ids:
        err(page, 'table of contents must list every h2/h3 id in order')
    info['ids'] = ids
    citation = content.find(cls='citation')
    if not citation or f'{SITE}/blogs/{slug}/' not in citation.text():
        err(page, f'citation block must cite the English URL {SITE}/blogs/{slug}/')

    # figures
    number = 0
    for img in content.find_all('img'):
        src = img.attrs.get('src', '')
        fig = next((a for a in img.ancestors() if a.tag == 'figure'), None)
        if fig is None:
            err(page, f'{src}: images go inside <figure> with a <figcaption>')
            continue
        for attr in ('width', 'height', 'alt'):
            if not img.attrs.get(attr):
                err(page, f'{src}: missing {attr}')
        if img.attrs.get('loading') != 'lazy':
            err(page, f'{src}: add loading="lazy"')
        file = local_target(page, src)
        if not file or not file.exists():
            continue
        if file.parent != BLOGS / slug:
            err(page, f'{src}: keep figures in blogs/{slug}/')
        if file.suffix not in ('.webp', '.svg'):
            err(page, f'{src}: use WebP for pictures or SVG for diagrams')
        check_file_size(page, file)
        size = image_size(file)
        if size and img.attrs.get('width', '').isdigit() and img.attrs.get('height', '').isdigit():
            w, h = int(img.attrs['width']), int(img.attrs['height'])
            if abs(w / h - size[0] / size[1]) > 0.01:
                err(page, f'{src}: width/height {w}x{h} do not match the file ({size[0]}x{size[1]})')
        cap = fig.find('figcaption')
        if not cap:
            err(page, f'{src}: missing <figcaption>')
            continue
        number += 1
        m = re.match(L['fig'], clean(cap.text()))
        if not m or int(m.group(1)) != number:
            err(page, f'{src}: caption must start with "' + ('Fig. %d. ' if lang == 'en' else '图 %d：') % number + '"')
        if file.suffix == '.svg':
            links = [a for a in cap.find_all('a') if local_target(page, a.attrs.get('href', '')) == file]
            last = cap.children[-1] if cap.children else None
            if not links or clean(links[-1].text()) != L['full'] or links[-1] is not last:
                err(page, f'{src}: end the caption with <a href="{src}">{L["full"]}</a>')

    for table in content.find_all('table'):
        if table.parent is None or 'table-wrap' not in table.parent.classes:
            err(page, 'wrap every <table> in <div class="table-wrap">')
        if not table.find('thead'):
            err(page, 'put the table header in <thead>')

    # inline citations and references
    refs_ol = content.find('ol', cls='references')
    ref_items = [c for c in refs_ol.children if isinstance(c, Node) and c.tag == 'li'] if refs_ol else []
    cites = content.find_all('a', cls='cite')
    has_ref_ids = any(li.attrs.get('id') for li in ref_items)
    ref_map = {}
    if cites or has_ref_ids:
        if not refs_ol:
            err(page, 'inline citations require <ol class="references">')
        for idx, li in enumerate(ref_items, 1):
            want_id = f'ref-{idx}'
            if li.attrs.get('id') != want_id:
                err(page, f'references item #{idx} must have id="{want_id}"')
            else:
                ref_map[want_id] = li
            if not clean(li.attrs.get('data-brief', '')):
                err(page, f'<li id="{want_id}"> needs a non-empty data-brief="..." for the citation hover card')
        for a in cites:
            if refs_ol and refs_ol in list(a.ancestors()):
                err(page, 'do not place a.cite inside <ol class="references">')
            href = a.attrs.get('href', '')
            m = re.fullmatch(r'#ref-([1-9]\d*)', href)
            if not m:
                err(page, f'citation link "{href}" must have href="#ref-N"')
                continue
            target_id = f'ref-{m.group(1)}'
            if target_id not in ref_map:
                err(page, f'citation {href} does not match any <li id="{target_id}"> in <ol class="references">')
            label = clean(a.text())
            if label != f'[{m.group(1)}]':
                err(page, f'citation {href} text "{label}" must be "[{m.group(1)}]"')
    info['has_cites'] = bool(cites)
    info['ref_count'] = len(ref_items)

    # prose hygiene: no raw Markdown backticks outside <pre>/<code>, and no file.py#L123 line refs in prose
    prose_raw = ''.join(text_without(content, {'pre', 'code', 'script', 'style'}))
    if '`' in prose_raw:
        err(page, 'prose contains stray Markdown backtick "`"; use <code>...</code> instead')

    prose_no_refs = ''.join(text_without(content, {'pre', 'script', 'style'}, skip_node=lambda n: n is refs_ol))
    m_line = re.search(r'[A-Za-z0-9_/-]+\.py#L\d+', prose_no_refs)
    if m_line:
        warn(page, f'avoid code-line reference "{m_line.group(0)}" as prose subject; cite via [N] and keep paths in References')

    if lang == 'zh':
        term_hits = [t for t in BAD_ZH_TERMS if t in prose_no_refs]
        if term_hits:
            warn(page, f'avoid half-translated/machine-translated terms ({", ".join(term_hits)}); keep standard English ML terms')
        hype_hits = [h for h in BAD_ZH_HYPE if h in prose_no_refs]
        if hype_hits:
            warn(page, f'avoid hyped/AI-style phrasing ({", ".join(hype_hits)}); keep a calm technical-notes tone')

    issue_hits = list(dict.fromkeys(m.group(0) for m in INLINE_ISSUE_RE.finditer(prose_no_refs)))
    if issue_hits:
        warn(page, f'avoid inline issue numbers ({", ".join(issue_hits[:5])}); cite via [N] and keep issue links in References')

    num_code_hits = []
    for code in content.find_all('code'):
        if any(a.tag == 'pre' or a is refs_ol for a in code.ancestors()):
            continue
        txt = clean(code.text())
        if NUMERIC_CODE_RE.fullmatch(txt):
            num_code_hits.append(txt)
    num_code_hits = list(dict.fromkeys(num_code_hits))
    if num_code_hits:
        warn(page, f'avoid <code> around plain numbers/metrics ({", ".join(num_code_hits[:5])}); reserve <code> for code symbols/configs')

    tags = dom.find('ul', cls='post-tags')
    info['tags'] = [clean(li.text()) for li in tags.find_all('li')] if tags else []
    if not info['tags']:
        err(page, 'missing post-tags in the post footer')
    return info


def text_without(node, skip, skip_node=None):
    for c in node.children:
        if isinstance(c, str):
            yield c
        elif c.tag not in skip and not (skip_node and skip_node(c)):
            yield from text_without(c, skip, skip_node)


def parse_date(s, lang):
    if lang == 'en':
        month, day, year = re.fullmatch(r'(\w+) (\d+), (\d+)', s).groups()
        return (int(year), MONTHS.index(month) + 1, int(day))
    return tuple(int(x) for x in re.findall(r'\d+', s))


# ---------- list page ----------
def check_list(page, posts):
    dom = parse(page)
    entries = dom.find_all('article', cls='post-entry')
    seen, dates = set(), []
    for entry in entries:
        link = entry.find('a', cls='entry-link')
        href = link.attrs.get('href', '') if link else ''
        m = re.fullmatch(r'\./([a-z0-9]+(?:-[a-z0-9]+)*)/', href)
        if not m:
            err(page, f'entry link "{href}" must look like ./<slug>/')
            continue
        slug = m.group(1)
        if slug in NOT_LISTED:
            err(page, f'{slug} is a template page; keep it off the list')
            continue
        if slug not in posts:
            err(page, f'entry ./{slug}/ has no post')
            continue
        if slug in seen:
            err(page, f'{slug} is listed twice')
        seen.add(slug)
        post = posts[slug]['en']
        where = f'entry {slug}'

        key = entry.attrs.get('data-type')
        badge = entry.find('span', cls='post-type')
        if key not in TYPES or not badge or f'type-{key}' not in badge.classes or clean(badge.text()) != TYPES[key][0]:
            err(page, f'{where}: data-type and badge must be the same valid type')
        elif key != post.get('type'):
            err(page, f'{where}: type {key} differs from the post ({post.get("type")})')
        topics = entry.find(cls='entry-topics')
        topics = [clean(s.text()) for s in topics.find_all('span')] if topics else []
        if not 1 <= len(topics) <= 2:
            err(page, f'{where}: use one or two topics')
        elif post.get('tags', [])[:len(topics)] != topics:
            err(page, f'{where}: topics {topics} must be the first post-tags of the post {post.get("tags")}')
        h2 = entry.find('h2')
        if not h2 or clean(h2.text()) != post.get('title'):
            err(page, f'{where}: title differs from the post')
        if link.attrs.get('aria-label') != post.get('title'):
            err(page, f'{where}: aria-label must be the post title')
        summary = entry.find('p', cls='entry-content')
        if not summary or not clean(summary.text()):
            err(page, f'{where}: missing summary')

        footer = entry.find('footer', cls='entry-footer')
        parts = [clean(n.text()) for n in footer.children if isinstance(n, Node)] if footer else []
        langs = 'EN · 中文' if 'zh' in posts[slug] else 'EN'
        want = [f'{MONTHS[post["date"][1] - 1]} {post["date"][2]}, {post["date"][0]}' if 'date' in post else '?',
                f'{post.get("read", "?")} min read', langs]
        if parts != want:
            err(page, f'{where}: footer must be ' + ''.join(f'<span>{p}</span>' for p in want))
        if 'date' in post:
            dates.append(post['date'])

        cover = entry.find('img', cls='entry-cover')
        src = cover.attrs.get('src') if cover else None
        if src != f'./{slug}/cover.webp':
            err(page, f'{where}: cover must be ./{slug}/cover.webp')
        elif (BLOGS / slug / 'cover.webp').exists():
            file = BLOGS / slug / 'cover.webp'
            if image_size(file) != COVER_SIZE:
                err(page, f'{where}: cover must be {COVER_SIZE[0]}x{COVER_SIZE[1]}, got {image_size(file)}')
            if (cover.attrs.get('width'), cover.attrs.get('height')) != tuple(map(str, COVER_SIZE)):
                err(page, f'{where}: cover <img> needs width="{COVER_SIZE[0]}" height="{COVER_SIZE[1]}"')
            check_file_size(page, file)

    for slug in posts:
        if slug not in seen and slug not in NOT_LISTED:
            err(page, f'post {slug} is missing from the list')
    if dates != sorted(dates, reverse=True):
        err(page, 'entries must be ordered from newest to oldest')
    count = dom.find(cls='list-count')
    n = len(entries)
    if not count or clean(count.text()) != f'{n} {"post" if n == 1 else "posts"}':
        err(page, f'list-count must read "{n} {"post" if n == 1 else "posts"}"')


def main():
    versions = {}
    posts = {}
    for d in sorted(p for p in BLOGS.iterdir() if p.is_dir()):
        en = d / 'index.html'
        if not en.exists():
            continue
        if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', d.name):
            err(d, 'slug must use lowercase letters, digits and hyphens')
        zh = d / 'zh' / 'index.html'
        posts[d.name] = {'en': check_article(en, d.name, 'en', zh.exists())}
        check_common(en, parse(en), versions)
        if zh.exists():
            posts[d.name]['zh'] = check_article(zh, d.name, 'zh', True)
            check_common(zh, parse(zh), versions)
            a, b = posts[d.name]['en'], posts[d.name]['zh']
            if a.get('ids') != b.get('ids'):
                err(zh, 'section ids must match the English version')
            if a.get('date') != b.get('date') or a.get('type') != b.get('type'):
                err(zh, 'date and type must match the English version')
            if a.get('tags') != b.get('tags'):
                err(zh, 'post-tags must match the English version')
            if a.get('has_cites') or b.get('has_cites'):
                if a.get('has_cites') != b.get('has_cites'):
                    err(zh, 'inline citation usage must match the English version')
                if a.get('ref_count') != b.get('ref_count'):
                    err(zh, 'reference list count must match the English version')
        if not (d / 'cover.webp').exists() and d.name not in NOT_LISTED:
            err(d, 'missing cover.webp')

    index = BLOGS / 'index.html'
    check_list(index, posts)
    check_common(index, parse(index), versions)

    if len(versions) > 1:
        detail = '; '.join(f'v={v} in {", ".join(sorted(p))}' for v, p in sorted(versions.items()))
        errors.append(f'blogs: blog.css / blog-*.js must use one ?v= everywhere ({detail})')

    for md in BLOGS.rglob('*.md'):
        text = md.read_text(encoding='utf-8')
        if '{' + '{' in text or '{' + '%' in text:
            err(md, 'contains Liquid syntax; GitHub Pages runs Jekyll and the build may fail')

    for w in warnings:
        print(f'warning: {w}')
    for e in errors:
        print(f'error: {e}')
    listed = sum(1 for s in posts if s not in NOT_LISTED)
    print(f'{len(posts)} post folders ({listed} listed), {len(errors)} errors, {len(warnings)} warnings')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())

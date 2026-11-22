// Article reading enhancements: desktop sticky TOC + ScrollSpy, code copy buttons,
// reading progress bar, image lightbox, anchor copy, back-to-top, hash-preserving lang switch,
// self-hosted KaTeX math rendering, and inline citation hover cards.
(() => {
    const isZh = document.documentElement.lang === 'zh-CN';
    const L = isZh
        ? {
            copy: '复制',
            copied: '已复制',
            top: '返回顶部',
            linkCopied: '已复制链接',
            openSource: '访问原文 ↗',
            jumpRef: '定位引用 ↓',
            close: '关闭',
            refLabel: '参考资料',
            citeCard: '参考文献预览',
        }
        : {
            copy: 'Copy',
            copied: 'Copied',
            top: 'Back to top',
            linkCopied: 'Copied',
            openSource: 'Open source ↗',
            jumpRef: 'References ↓',
            close: 'Close',
            refLabel: 'Reference',
            citeCard: 'Reference preview',
        };

    const copyText = async (text) => {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
    };

    // 1. Reading progress bar inside sticky header
    const header = document.querySelector('body > header');
    const content = document.querySelector('.post-content');
    let progressEl = null;
    if (header && content) {
        progressEl = document.createElement('div');
        progressEl.className = 'read-progress';
        progressEl.setAttribute('aria-hidden', 'true');
        header.appendChild(progressEl);
    }

    // 2. Desktop sticky TOC auto-open + ScrollSpy
    const toc = document.querySelector('details.toc');
    const desktopMq = window.matchMedia('(min-width: 960px)');
    const syncToc = () => {
        if (!toc) return;
        if (desktopMq.matches) toc.open = true;
    };
    syncToc();
    desktopMq.addEventListener('change', syncToc);

    const tocLinks = toc ? Array.from(toc.querySelectorAll('a[href^="#"]')) : [];
    const sections = tocLinks
        .map((a) => ({ a, el: document.getElementById(a.getAttribute('href').slice(1)) }))
        .filter((s) => s.el);

    let currentId = '';
    const updateScrollState = () => {
        if (progressEl && content) {
            const rect = content.getBoundingClientRect();
            const total = Math.max(1, content.offsetHeight - window.innerHeight * 0.65);
            const passed = Math.min(total, Math.max(0, -rect.top + 48));
            progressEl.style.width = `${(passed / total) * 100}%`;
        }
        if (sections.length) {
            const offset = 72;
            let active = sections[0];
            for (const s of sections) {
                if (s.el.getBoundingClientRect().top <= offset) active = s;
                else break;
            }
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24) {
                active = sections[sections.length - 1];
            }
            currentId = active.el.id;
            for (const s of sections) s.a.classList.toggle('is-active', s === active);
        }
        if (backTop) backTop.classList.toggle('is-visible', window.scrollY > 420);
    };

    // 3. Back-to-top button
    const backTop = document.createElement('button');
    backTop.type = 'button';
    backTop.className = 'back-top';
    backTop.setAttribute('aria-label', L.top);
    backTop.title = L.top;
    backTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(backTop);

    let ticking = false;
    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
            updateScrollState();
            ticking = false;
        });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateScrollState();

    // 4. Code block Copy buttons
    for (const pre of document.querySelectorAll('.post-content pre')) {
        const wrap = document.createElement('div');
        wrap.className = 'code-block';
        pre.parentNode.insertBefore(wrap, pre);
        wrap.appendChild(pre);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'copy-btn';
        btn.textContent = L.copy;
        btn.addEventListener('click', async () => {
            try {
                await copyText(pre.textContent || '');
                btn.textContent = L.copied;
                btn.classList.add('is-copied');
                window.setTimeout(() => {
                    btn.textContent = L.copy;
                    btn.classList.remove('is-copied');
                }, 1600);
            } catch (_) { /* clipboard blocked */ }
        });
        wrap.appendChild(btn);
    }

    // 5. Heading # anchor copy permalink
    for (const anchor of document.querySelectorAll('.post-content a.anchor')) {
        anchor.addEventListener('click', async () => {
            const href = anchor.getAttribute('href') || '';
            if (!href.startsWith('#')) return;
            const url = `${window.location.origin}${window.location.pathname}${href}`;
            try {
                await copyText(url);
                const prev = anchor.textContent;
                anchor.textContent = L.linkCopied;
                anchor.classList.add('is-copied');
                window.setTimeout(() => {
                    anchor.textContent = prev;
                    anchor.classList.remove('is-copied');
                }, 1400);
            } catch (_) { /* ignore */ }
        });
    }

    // 6. Figure image lightbox
    let lightbox = null;
    const closeLightbox = () => {
        if (!lightbox) return;
        lightbox.remove();
        lightbox = null;
    };
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeLightbox();
    });
    for (const img of document.querySelectorAll('.post-content figure img')) {
        img.classList.add('is-zoomable');
        img.addEventListener('click', () => {
            closeLightbox();
            lightbox = document.createElement('div');
            lightbox.className = 'lightbox';
            lightbox.setAttribute('role', 'dialog');
            lightbox.setAttribute('aria-modal', 'true');
            const big = document.createElement('img');
            big.src = img.currentSrc || img.src;
            big.alt = img.alt || '';
            lightbox.appendChild(big);
            const figcap = img.closest('figure')?.querySelector('figcaption');
            if (figcap) {
                const cap = document.createElement('div');
                cap.className = 'lightbox-caption';
                cap.textContent = figcap.textContent.replace(/\s*(Open full size|查看原图)\s*$/, '').trim();
                lightbox.appendChild(cap);
            }
            lightbox.addEventListener('click', closeLightbox);
            document.body.appendChild(lightbox);
        });
    }

    // 7. Preserve section anchor when toggling EN <-> ZH
    for (const link of document.querySelectorAll('.lang-switch a:not([aria-current])')) {
        link.addEventListener('click', () => {
            const hash = window.location.hash || (currentId ? `#${currentId}` : '');
            if (hash) {
                const base = link.getAttribute('href').split('#')[0];
                link.setAttribute('href', `${base}${hash}`);
            }
        });
    }

    // 8. Self-hosted KaTeX math rendering
    if (typeof window.renderMathInElement === 'function' && content) {
        window.renderMathInElement(content, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '\\[', right: '\\]', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
            ],
            ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
            throwOnError: false,
        });
    }

    // Glue trailing punctuation onto short inline math/code (+ adjacent citations) to avoid orphaned line-start marks
    if (content) {
        const trailPunctRe = /^([。，；：！？）、.,;:!?)\]]+)/;
        for (const el of content.querySelectorAll('.katex, code')) {
            if (el.closest('.katex-display, pre, .nowrap-tail')) continue;
            let anchor = el;
            while (
                anchor.parentNode &&
                anchor.parentNode.nodeType === 1 &&
                anchor.parentNode !== content &&
                !anchor.nextSibling &&
                !anchor.previousSibling &&
                anchor.parentNode.matches('span:not([class]), a, strong, em')
            ) {
                anchor = anchor.parentNode;
            }
            let tailEnd = anchor;
            while (tailEnd.nextSibling && tailEnd.nextSibling.nodeType === 1 && tailEnd.nextSibling.matches('a.cite')) {
                tailEnd = tailEnd.nextSibling;
            }
            const next = tailEnd.nextSibling;
            if (next && next.nodeType === 3) {
                const m = next.nodeValue.match(trailPunctRe);
                if (m && el.getBoundingClientRect().width < 320) {
                    const rest = next.splitText(m[1].length);
                    const wrap = document.createElement('span');
                    wrap.className = 'nowrap-tail';
                    anchor.parentNode.insertBefore(wrap, anchor);
                    while (wrap.nextSibling && wrap.nextSibling !== rest) {
                        wrap.appendChild(wrap.nextSibling);
                    }
                }
            }
        }
    }

    // 9. Inline citation hover cards & direct source access
    const citeLinks = content
        ? Array.from(content.querySelectorAll('a.cite[href^="#ref-"]'))
        : [];
    if (citeLinks.length) {
        const cleanText = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const refMap = new Map();

        for (const li of content.querySelectorAll('ol.references > li[id^="ref-"]')) {
            const id = li.id;
            const num = id.replace(/^ref-/, '');
            const brief = cleanText(li.getAttribute('data-brief') || '');
            const anchors = Array.from(li.querySelectorAll('a[href]'));
            const anchor = anchors.find((a) => /^https?:\/\//i.test(a.getAttribute('href') || '')) || anchors[0] || null;
            const url = anchor ? anchor.getAttribute('href') : '';

            let source = cleanText(li.getAttribute('data-source') || '');
            if (!source && url) {
                const arxivMatch = url.match(/arxiv\.org\/abs\/([^/?#]+)/i);
                if (arxivMatch) {
                    source = `arXiv:${arxivMatch[1]}`;
                } else {
                    try {
                        source = new URL(url, window.location.href).hostname.replace(/^www\./, '');
                    } catch (_) {
                        source = L.refLabel;
                    }
                }
            }
            if (!source) source = L.refLabel;

            let title = cleanText(li.getAttribute('data-title') || '');
            let meta = '';
            if (title) {
                meta = cleanText(li.textContent);
            } else if (anchor) {
                title = cleanText(anchor.textContent);
                const clone = li.cloneNode(true);
                const idx = anchors.indexOf(anchor);
                const cloneAnchor = idx >= 0 ? clone.querySelectorAll('a[href]')[idx] : null;
                if (cloneAnchor) cloneAnchor.remove();
                meta = cleanText(clone.textContent)
                    .replace(/\.\s*\./g, '.')
                    .replace(/\s+([.,;:，。；：])/g, '$1')
                    .replace(/^[.,;:，。：\s]+/, '')
                    .trim();
            } else {
                const full = cleanText(li.textContent);
                const split = full.match(/^(.{4,90}?)(?:：\s*|\.\s+)(.+)$/);
                if (split) {
                    title = cleanText(split[1]);
                    meta = cleanText(split[2]);
                } else {
                    title = full;
                }
            }

            refMap.set(id, { id, num, url, source, title, meta, brief });
        }

        const card = document.createElement('aside');
        card.className = 'cite-card';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-label', L.citeCard);
        document.body.appendChild(card);

        let activeTrigger = null;
        let hideTimer = null;
        let highlightTimer = null;
        let lastPointerType = '';
        let isDemoPinned = false;
        let openScrollY = 0;

        const clearTimers = () => {
            if (hideTimer) {
                window.clearTimeout(hideTimer);
                hideTimer = null;
            }
        };

        const closeCard = () => {
            clearTimers();
            isDemoPinned = false;
            if (activeTrigger) {
                activeTrigger.classList.remove('is-active');
                activeTrigger = null;
            }
            card.classList.remove('is-open');
        };

        const jumpToRef = (refId) => {
            closeCard();
            const target = document.getElementById(refId);
            if (!target) return;
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            for (const item of content.querySelectorAll('ol.references > li.is-highlighted')) {
                item.classList.remove('is-highlighted');
            }
            void target.offsetWidth;
            target.classList.add('is-highlighted');
            if (highlightTimer) window.clearTimeout(highlightTimer);
            highlightTimer = window.setTimeout(() => {
                target.classList.remove('is-highlighted');
            }, 2400);
        };

        const renderCard = (ref) => {
            card.textContent = '';

            const head = document.createElement('div');
            head.className = 'cite-card-head';

            const num = document.createElement('span');
            num.className = 'cite-card-num';
            num.textContent = `[${ref.num}]`;
            head.appendChild(num);

            const src = document.createElement('span');
            src.className = 'cite-card-source';
            src.textContent = ref.source;
            head.appendChild(src);

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'cite-card-close';
            closeBtn.setAttribute('aria-label', L.close);
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                closeCard();
            });
            head.appendChild(closeBtn);
            card.appendChild(head);

            if (ref.url) {
                const titleLink = document.createElement('a');
                titleLink.className = 'cite-card-title';
                titleLink.href = ref.url;
                titleLink.target = '_blank';
                titleLink.rel = 'noopener';
                titleLink.textContent = ref.title;
                card.appendChild(titleLink);
            } else {
                const titleDiv = document.createElement('div');
                titleDiv.className = 'cite-card-title';
                titleDiv.textContent = ref.title;
                card.appendChild(titleDiv);
            }

            if (ref.meta) {
                const metaEl = document.createElement('p');
                metaEl.className = 'cite-card-meta';
                metaEl.textContent = ref.meta;
                card.appendChild(metaEl);
            }

            if (ref.brief) {
                const briefEl = document.createElement('p');
                briefEl.className = 'cite-card-brief';
                briefEl.textContent = ref.brief;
                card.appendChild(briefEl);
            }

            const foot = document.createElement('div');
            foot.className = 'cite-card-foot';

            if (ref.url) {
                const openLink = document.createElement('a');
                openLink.className = 'cite-card-open';
                openLink.href = ref.url;
                openLink.target = '_blank';
                openLink.rel = 'noopener';
                openLink.textContent = L.openSource;
                foot.appendChild(openLink);
            }

            const jumpLink = document.createElement('a');
            jumpLink.className = 'cite-card-jump';
            jumpLink.href = `#${ref.id}`;
            jumpLink.textContent = L.jumpRef;
            jumpLink.addEventListener('click', (event) => {
                event.preventDefault();
                jumpToRef(ref.id);
            });
            foot.appendChild(jumpLink);
            card.appendChild(foot);
        };

        const positionCard = (trigger) => {
            if (window.innerWidth <= 768) {
                card.style.left = '';
                card.style.top = '';
                return;
            }
            const rect = trigger.getBoundingClientRect();
            const cw = card.offsetWidth;
            const ch = card.offsetHeight;
            const gap = 8;
            const pad = 12;

            let top = rect.bottom + gap;
            if (top + ch > window.innerHeight - pad && rect.top - gap - ch >= pad) {
                top = rect.top - gap - ch;
            } else {
                top = Math.min(Math.max(pad, top), Math.max(pad, window.innerHeight - ch - pad));
            }
            const left = Math.min(
                Math.max(pad, window.innerWidth - cw - pad),
                Math.max(pad, rect.left - cw * 0.18),
            );
            card.style.left = `${Math.round(left)}px`;
            card.style.top = `${Math.round(top)}px`;
        };

        const openCard = (trigger, pinDemo = false) => {
            const ref = refMap.get(trigger.dataset.ref || '');
            if (!ref) return;
            clearTimers();
            if (activeTrigger && activeTrigger !== trigger) {
                activeTrigger.classList.remove('is-active');
            }
            activeTrigger = trigger;
            activeTrigger.classList.add('is-active');
            isDemoPinned = pinDemo;
            openScrollY = window.scrollY;
            renderCard(ref);
            card.classList.add('is-open');
            positionCard(trigger);
        };

        const scheduleClose = () => {
            if (isDemoPinned) return;
            clearTimers();
            hideTimer = window.setTimeout(closeCard, 160);
        };

        const isCoarsePointer = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

        for (const a of citeLinks) {
            const refId = (a.getAttribute('href') || '').slice(1);
            const ref = refMap.get(refId);
            if (!ref) continue;
            a.dataset.ref = refId;
            a.setAttribute('aria-haspopup', 'dialog');
            if (ref.url) {
                a.setAttribute('href', ref.url);
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener');
            }

            a.addEventListener('pointerdown', (event) => {
                lastPointerType = event.pointerType || '';
            });
            a.addEventListener('mouseenter', () => openCard(a));
            a.addEventListener('focus', () => openCard(a));
            a.addEventListener('mouseleave', scheduleClose);
            a.addEventListener('blur', () => {
                window.setTimeout(() => {
                    if (!card.contains(document.activeElement) && document.activeElement !== a && !isDemoPinned) {
                        closeCard();
                    }
                }, 100);
            });
            a.addEventListener('click', (event) => {
                if (lastPointerType === 'touch' || isCoarsePointer()) {
                    event.preventDefault();
                    if (activeTrigger === a && card.classList.contains('is-open')) closeCard();
                    else openCard(a);
                } else if (!ref.url) {
                    event.preventDefault();
                    jumpToRef(ref.id);
                }
            });
        }

        card.addEventListener('mouseenter', clearTimers);
        card.addEventListener('mouseleave', scheduleClose);

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && card.classList.contains('is-open')) closeCard();
        });
        document.addEventListener('click', (event) => {
            if (!card.classList.contains('is-open')) return;
            if (card.contains(event.target)) return;
            if (event.target instanceof Element && event.target.closest('a.cite')) return;
            closeCard();
        });
        window.addEventListener('resize', () => {
            if (activeTrigger && card.classList.contains('is-open')) positionCard(activeTrigger);
        }, { passive: true });
        window.addEventListener('scroll', () => {
            if (!activeTrigger || !card.classList.contains('is-open') || isDemoPinned) return;
            if (Math.abs(window.scrollY - openScrollY) > 40) closeCard();
            else positionCard(activeTrigger);
        }, { passive: true });

        const demoParam = new URLSearchParams(window.location.search).get('cite_demo');
        if (demoParam && /^[1-9]\d*$/.test(demoParam)) {
            const target = citeLinks.find((el) => el.dataset.ref === `ref-${demoParam}`) || citeLinks[0];
            if (target) {
                const showDemo = () => {
                    const r = target.getBoundingClientRect();
                    if (r.top < 72 || r.bottom > window.innerHeight - 180) {
                        const targetTop = window.scrollY + r.top - Math.max(96, window.innerHeight * 0.28);
                        window.scrollTo({ top: Math.max(0, targetTop), behavior: 'instant' });
                    }
                    openCard(target, true);
                };
                if (document.readyState === 'complete') window.requestAnimationFrame(showDemo);
                else window.addEventListener('load', () => window.requestAnimationFrame(showDemo), { once: true });
            }
        }
    }
})();

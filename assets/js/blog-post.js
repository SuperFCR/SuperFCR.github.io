// Article reading enhancements: desktop sticky TOC + ScrollSpy, code copy buttons,
// reading progress bar, image lightbox, anchor copy, back-to-top, and hash-preserving lang switch.
(() => {
    const isZh = document.documentElement.lang === 'zh-CN';
    const L = isZh
        ? { copy: '复制', copied: '已复制', top: '返回顶部', linkCopied: '已复制链接' }
        : { copy: 'Copy', copied: 'Copied', top: 'Back to top', linkCopied: 'Copied' };

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
})();

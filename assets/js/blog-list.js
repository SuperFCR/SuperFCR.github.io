// Blog list filtering by type, topic tag (?tag=...) and optional keyword search.
// Counts and topic chips are read directly from the <article class="post-entry"> cards.
(() => {
    const list = document.querySelector('.post-list');
    const entries = Array.from(document.querySelectorAll('.post-entry[data-type]'));
    if (!entries.length) return;

    const bar = document.querySelector('.type-filters');
    const buttons = bar ? Array.from(bar.querySelectorAll('.type-filter')) : [];
    const total = document.querySelector('.list-count');
    const tagChip = document.querySelector('.active-tag');
    const tagChipText = tagChip ? tagChip.querySelector('.active-tag-name') : null;
    const tagChipClear = tagChip ? tagChip.querySelector('.active-tag-clear') : null;
    const search = document.querySelector('.list-search');
    const empty = document.querySelector('.list-empty');
    const emptyReset = empty ? empty.querySelector('button') : null;

    const counts = {};
    const meta = entries.map((entry) => {
        const type = entry.dataset.type;
        counts[type] = (counts[type] || 0) + 1;
        const topicNodes = Array.from(entry.querySelectorAll('.entry-topics > span'));
        const topics = topicNodes.map((n) => n.textContent.trim());
        const extraTags = (entry.dataset.tags || '').split(',').map((s) => s.trim()).filter(Boolean);
        const allTags = new Set([...topics, ...extraTags].map((t) => t.toLowerCase()));
        const text = [
            entry.querySelector('h2')?.textContent || '',
            entry.querySelector('.entry-content')?.textContent || '',
            ...topics,
            ...extraTags,
        ].join(' ').toLowerCase();

        for (const node of topicNodes) {
            node.classList.add('is-topic-btn');
            node.setAttribute('role', 'button');
            node.setAttribute('tabindex', '0');
            const name = node.textContent.trim();
            const pick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                state.tag = state.tag.toLowerCase() === name.toLowerCase() ? '' : name;
                syncUrl();
                render();
            };
            node.addEventListener('click', pick);
            node.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') pick(event);
            });
        }
        return { entry, type, allTags, text };
    });

    for (const button of buttons) {
        const type = button.dataset.filter;
        const count = type === 'all' ? entries.length : (counts[type] || 0);
        const countEl = button.querySelector('.count');
        if (countEl) countEl.textContent = count;
        button.hidden = count === 0;
    }

    const hasMultipleTypes = Object.keys(counts).length >= 2;
    if (bar) bar.hidden = !hasMultipleTypes;
    if (search) search.hidden = entries.length < 4;
    const head = document.querySelector('.list-head');

    const params = new URLSearchParams(window.location.search);
    const validTypes = new Set(['all', ...Object.keys(counts)]);
    const initType = params.get('type') || 'all';
    const state = {
        type: validTypes.has(initType) ? initType : 'all',
        tag: (params.get('tag') || '').trim(),
        query: (params.get('q') || '').trim(),
    };
    if (search && state.query) search.value = state.query;

    const syncUrl = () => {
        const next = new URLSearchParams();
        if (state.type !== 'all') next.set('type', state.type);
        if (state.tag) next.set('tag', state.tag);
        if (state.query) next.set('q', state.query);
        const qs = next.toString();
        const url = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
        try { window.history.replaceState(null, '', url); } catch (_) { /* ignore */ }
    };

    const render = () => {
        const tagLower = state.tag.toLowerCase();
        const qLower = state.query.toLowerCase();
        const visible = [];

        for (const item of meta) {
            const matchType = state.type === 'all' || item.type === state.type;
            const matchTag = !tagLower || item.allTags.has(tagLower);
            const matchQuery = !qLower || item.text.includes(qLower);
            const show = matchType && matchTag && matchQuery;
            item.entry.hidden = !show;
            item.entry.classList.remove('is-featured');
            if (show) visible.push(item.entry);
        }

        // Showcase the first card when unfiltered (default landing) or when only 1 card matches.
        const unfiltered = state.type === 'all' && !state.tag && !state.query;
        if (list) {
            list.classList.add('js-ready');
            const useFeatured = visible.length > 0 && (unfiltered || visible.length === 1);
            list.classList.toggle('has-featured', useFeatured);
            if (useFeatured) visible[0].classList.add('is-featured');
        }

        for (const button of buttons) {
            button.setAttribute('aria-pressed', String(button.dataset.filter === state.type));
        }
        if (tagChip && tagChipText) {
            tagChip.hidden = !state.tag;
            tagChipText.textContent = state.tag;
        }
        if (head) head.hidden = !hasMultipleTypes && !state.tag && (!search || search.hidden);
        if (total) total.textContent = `${visible.length} ${visible.length === 1 ? 'post' : 'posts'}`;
        if (empty) empty.hidden = visible.length > 0;
    };

    if (bar) {
        bar.addEventListener('click', (event) => {
            const button = event.target.closest('.type-filter');
            if (!button) return;
            state.type = button.dataset.filter;
            syncUrl();
            render();
        });
    }

    if (tagChipClear) {
        tagChipClear.addEventListener('click', () => {
            state.tag = '';
            syncUrl();
            render();
        });
    }

    if (search) {
        search.addEventListener('input', () => {
            state.query = search.value.trim();
            syncUrl();
            render();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === '/' && !search.hidden && document.activeElement !== search
                && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) {
                event.preventDefault();
                search.focus();
            }
        });
    }

    if (emptyReset) {
        emptyReset.addEventListener('click', () => {
            state.type = 'all';
            state.tag = '';
            state.query = '';
            if (search) search.value = '';
            syncUrl();
            render();
        });
    }

    render();
})();

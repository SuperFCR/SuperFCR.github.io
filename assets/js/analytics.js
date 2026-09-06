(() => {
    if (window.homepageAnalytics) return;
    const pageLanguage = document.documentElement.lang || 'en';
    const track = (name, parameters = {}) => {
        if (typeof window.gtag === 'function') {
            window.gtag('event', name, { ...parameters, page_language: pageLanguage });
        }
    };
    window.homepageAnalytics = { track };
    const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const usableLink = (link) => {
        const href = link.getAttribute('href')?.trim();
        return href && !href.startsWith('#') && /^(https?:|mailto:)/.test(link.href);
    };
    const projectParameters = (card) => ({
        content_id: card.dataset.contentId,
        research_area: card.closest('.project-group')?.dataset.researchArea || 'unknown'
    });

    // click covers mouse/touch/keyboard; auxclick adds middle-button navigation.
    const onClick = (event) => {
        if (event.type === 'auxclick' && event.button !== 1) return;
        const link = event.target.closest?.('a');
        if (!link || !usableLink(link)) return;
        if (link.matches('.language-option')) {
            const target = link.dataset.analyticsChannel;
            if (target && target !== pageLanguage) {
                track('language_switch', { channel: target, from_language: pageLanguage, to_language: target });
            }
        } else if (link.getAttribute('href').startsWith('mailto:')) {
            track('contact_click', { channel: 'email', link_position: link.closest('.bio-text-box') ? 'bio' : 'header' });
        } else if (link.dataset.analyticsEvent === 'profile_link_click') {
            const parameters = { channel: link.dataset.analyticsChannel, link_position: 'header' };
            track('profile_link_click', parameters);
            // Emitted here only; do not also derive this event in GA Admin.
            if (parameters.channel === 'cv') track('cv_click', parameters);
        } else if (link.matches('.paper-title, .badge-link')) {
            const card = link.closest('.paper-card');
            if (!card?.dataset.contentId) return;
            track('select_content', {
                ...projectParameters(card),
                content_type: 'paper_resource',
                resource_type: normalize(link.dataset.resourceType || 'link'),
                link_position: link.classList.contains('paper-title') ? 'title' : 'badge'
            });
        }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('auxclick', onClick);

    if (!window.IntersectionObserver) return;
    const records = new Map();
    const makeRecord = (element, event, parameters) => records.set(element, {
        event, parameters, timer: null, done: false, ratio: 0
    });
    // Observe the title: unlike a whole card, it fits in a small mobile viewport.
    document.querySelectorAll('.paper-card[data-content-id]').forEach((card) => {
        const title = card.querySelector('.paper-title');
        if (title) makeRecord(title, 'project_impression', { ...projectParameters(card), content_type: 'paper_resource' });
    });
    document.querySelectorAll('[data-section-id]').forEach((heading) => {
        makeRecord(heading, 'section_view', { section_id: heading.dataset.sectionId });
    });
    const eligible = (element, record) => {
        if (document.visibilityState !== 'visible' || record.ratio < 0.5 || !element.getClientRects().length) return false;
        const group = element.closest('.project-group');
        return !group || (group.open && group.classList.contains('is-expanded'));
    };
    const cancel = (record) => {
        if (record.timer !== null) window.clearTimeout(record.timer);
        record.timer = null;
    };
    const update = (element, record) => {
        if (record.done) return;
        if (!eligible(element, record)) { cancel(record); return; }
        if (record.timer !== null) return;
        record.timer = window.setTimeout(() => {
            record.timer = null;
            if (!eligible(element, record)) return;
            record.done = true;
            track(record.event, record.parameters);
            observer.unobserve(element);
        }, 1000);
    };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const record = records.get(entry.target);
            if (!record) return;
            record.ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
            update(entry.target, record);
        });
    }, { threshold: [0, 0.5] });
    records.forEach((record, element) => observer.observe(element));
    // Closing/replacing an accordion cancels the dwell immediately.
    const mutations = new MutationObserver(() => records.forEach((record, element) => update(element, record)));
    document.querySelectorAll('.project-group').forEach((group) => {
        mutations.observe(group, { attributes: true, attributeFilter: ['open', 'class'] });
    });
    document.addEventListener('visibilitychange', () => {
        records.forEach((record, element) => {
            cancel(record);
            if (!record.done && document.visibilityState === 'visible') {
                // Ask for fresh geometry after returning from a hidden tab.
                record.ratio = 0;
                observer.unobserve(element);
                observer.observe(element);
            }
        });
    });
    window.addEventListener('pagehide', () => records.forEach(cancel));
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) records.forEach((record, element) => {
            if (!record.done) {
                record.ratio = 0;
                observer.unobserve(element);
                observer.observe(element);
            }
        });
    });
})();

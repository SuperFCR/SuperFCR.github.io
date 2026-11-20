// Post-type filters on the blog list. Counts are read from the entries, so
// adding a post only means adding its <article>; types without posts stay hidden.
(() => {
    const bar = document.querySelector('.type-filters');
    if (!bar) return;
    const entries = Array.from(document.querySelectorAll('.post-entry[data-type]'));
    const buttons = Array.from(bar.querySelectorAll('.type-filter'));
    const total = document.querySelector('.list-count');

    const counts = {};
    for (const entry of entries) counts[entry.dataset.type] = (counts[entry.dataset.type] || 0) + 1;
    for (const button of buttons) {
        const type = button.dataset.filter;
        const count = type === 'all' ? entries.length : (counts[type] || 0);
        button.querySelector('.count').textContent = count;
        button.hidden = count === 0;
    }

    const show = (type) => {
        let visible = 0;
        for (const entry of entries) {
            const match = type === 'all' || entry.dataset.type === type;
            entry.hidden = !match;
            if (match) visible += 1;
        }
        for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.filter === type));
        if (total) total.textContent = `${visible} ${visible === 1 ? 'post' : 'posts'}`;
    };

    bar.addEventListener('click', (event) => {
        const button = event.target.closest('.type-filter');
        if (button) show(button.dataset.filter);
    });
    bar.hidden = false;
    show('all');
})();

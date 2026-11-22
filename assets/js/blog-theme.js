// Blog colour scheme: a saved choice wins, otherwise follow the system.
// Loaded synchronously in <head> so the page never flashes the wrong theme.
(() => {
    const root = document.documentElement;
    const KEY = 'blog-theme';
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (error) { /* storage blocked */ }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = saved === 'dark' || saved === 'light' ? saved : (prefersDark ? 'dark' : 'light');

    document.addEventListener('DOMContentLoaded', () => {
        const button = document.getElementById('theme-toggle');
        if (button) {
            button.addEventListener('click', () => {
                const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
                root.dataset.theme = next;
                try { localStorage.setItem(KEY, next); } catch (error) { /* storage blocked */ }
            });
        }

        const header = document.querySelector('body > header');
        if (header) {
            const syncHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
            syncHeader();
            window.addEventListener('scroll', syncHeader, { passive: true });
        }
    });
})();

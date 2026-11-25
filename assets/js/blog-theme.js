// Site colour scheme (shared across homepage & blog): a saved choice wins,
// otherwise follow the system preference. Loaded synchronously in <head> so
// pages never flash the wrong theme.
(() => {
    const root = document.documentElement;
    const KEY = 'blog-theme';
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const readSaved = () => {
        try {
            const value = localStorage.getItem(KEY);
            return value === 'dark' || value === 'light' ? value : null;
        } catch (error) {
            return null;
        }
    };

    const applyTheme = (theme) => {
        root.dataset.theme = theme;
        const button = document.getElementById('theme-toggle');
        if (button) button.setAttribute('aria-pressed', String(theme === 'dark'));
    };

    const saved = readSaved();
    applyTheme(saved || (media.matches ? 'dark' : 'light'));

    const onMediaChange = (event) => {
        if (!readSaved()) applyTheme(event.matches ? 'dark' : 'light');
    };
    if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', onMediaChange);
    } else if (typeof media.addListener === 'function') {
        media.addListener(onMediaChange);
    }

    window.addEventListener('storage', (event) => {
        if (event.key !== KEY) return;
        const value = event.newValue;
        applyTheme(value === 'dark' || value === 'light' ? value : (media.matches ? 'dark' : 'light'));
    });

    document.addEventListener('DOMContentLoaded', () => {
        const button = document.getElementById('theme-toggle');
        if (button) {
            button.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
            button.addEventListener('click', () => {
                const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
                applyTheme(next);
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

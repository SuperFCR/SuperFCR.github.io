/* Local previews keep a dataLayer for tests but never load the Google tag. */
(() => {
    const measurementId = document.currentScript?.dataset.measurementId;
    if (!/^G-[A-Z0-9]+$/.test(measurementId || '')) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('set', {
        page_language: document.documentElement.lang || 'en',
        measurement_version: '20260906'
    });
    const options = {};
    if (new URLSearchParams(window.location.search).get('analytics_debug') === '1') {
        options.debug_mode = true;
    }
    window.gtag('config', measurementId, options);
    if (['', 'localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) return;
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(tag);
})();

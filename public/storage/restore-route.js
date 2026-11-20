// Restore GitHub Pages' nested route before rs.js reads an OAuth callback.
(function () {
    if (location.pathname !== '/') return;
    var saved = localStorage.getItem('github-pages-redirect');
    if (!saved) return;
    try {
        var route = JSON.parse(saved);
        var url = new URL(route.path || '/', location.origin + '/');
        if (url.origin !== location.origin) throw new Error('Invalid redirect origin');
        Object.entries(route.query || {}).forEach(function (entry) {
            var values = Array.isArray(entry[1]) ? entry[1] : [entry[1]];
            values.forEach(function (value) { if (value != null) url.searchParams.append(entry[0], value); });
        });
        url.hash = route.hash || '';
        history.replaceState(history.state, '', url.pathname + url.search + url.hash);
        localStorage.removeItem('github-pages-redirect');
    } catch (error) {
        localStorage.removeItem('github-pages-redirect');
        console.warn('Could not restore the application route.', error);
    }
})();

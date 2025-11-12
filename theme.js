(function () {
  const LS_THEME = 'sbb_theme';
  const body = document.documentElement || document.body;

  function applyTheme(theme) {
    if (!body) return;
    if (theme === 'dark') body.classList.add('theme-dark');
    else body.classList.remove('theme-dark');
  }

  // Apply immediately from current storage (run this script as early as possible in <head>)
  try {
    const stored = localStorage.getItem(LS_THEME) || 'light';
    applyTheme(stored);
  } catch (e) { /* ignore */ }

  // Update when storage changes in other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === LS_THEME) {
      try { applyTheme(e.newValue || 'light'); } catch (err) {}
    }
  });

  // Optional: also listen for a custom event if pages dispatch it
  window.addEventListener('sbb:theme-changed', (ev) => {
    try { applyTheme(ev.detail || localStorage.getItem(LS_THEME) || 'light'); } catch (e) {}
  });
})();
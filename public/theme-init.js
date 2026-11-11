// Runs in <head> before the stylesheets (a file rather than inline, for the CSP): applies the theme the player chose,
// dark otherwise, so the first paint is already right. Same storage key as @sdmm/design ("sd-theme").
(function () {
  var theme = 'dark';
  try {
    if (localStorage.getItem('sd-theme') === 'light') theme = 'light';
  } catch (e) {}
  var root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.add('js');
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f3f5fa' : '#0b1020');
})();

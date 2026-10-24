/* Shams theme: runs before the page shows, so there is no white flash.
   The visitor's saved choice wins; otherwise follow their phone/PC setting. */
(function () {
  var root = document.documentElement;
  var theme = null;
  try { theme = localStorage.getItem('shams-theme'); } catch (e) {}
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.setAttribute('data-theme', theme);

  /* Toggle button: listens on the whole page, so it works even if
     main.js has an error and even though the button loads later. */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#themeToggle')) return;
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('shams-theme', next); } catch (err) {}
  });
})();
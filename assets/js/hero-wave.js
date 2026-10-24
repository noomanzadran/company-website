/* Shams hero: animated particle wave that follows light / dark mode. */
(function () {
  const canvas = document.querySelector('.hero-wave-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLS = 120, ROWS = 44;
  let w = 0, h = 0, t = 1.3, raf = null, visible = true;

  const isDark = () => root.getAttribute('data-theme') === 'dark';

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduceMotion || !raf) draw();
  }

  function draw() {
    const dark = isDark();
    ctx.clearRect(0, 0, w, h);
    // Dark mode: dots glow on top of each other. Light mode: normal painting.
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';

    for (let r = 0; r < ROWS; r++) {
      const z = r / (ROWS - 1);              // 0 = far away, 1 = close
      const persp = 0.3 + z * 0.7;
      for (let c = 0; c < COLS; c++) {
        const x0 = c / (COLS - 1);
        const wave = Math.sin(x0 * 5.5 + t * 0.9 + z * 2.2) * 0.55
                   + Math.sin(x0 * 2.1 - t * 0.6 + z * 3.5) * 0.45;
        const k = wave * 0.5 + 0.5;          // 0..1 height of the wave
        const x = (x0 - 0.5) * w * 1.7 * persp + w * 0.4;
        const y = h * 0.52 + z * h * 0.58 - k * h * 0.34 * persp - (1 - x0) * h * 0.16;
        const size = (1 + z * 2.6) * (0.6 + k * 0.7);
        const alpha = Math.min(1, (0.35 + z * 0.65) * (0.45 + k * 0.75));

        if (wave > 0.62) {
          ctx.fillStyle = 'rgba(245,158,27,' + alpha + ')';                 // sun gold on the crests
        } else if (dark) {
          ctx.fillStyle = 'rgba(' + (40 + k * 60 | 0) + ',' + (110 + k * 110 | 0) + ',255,' + alpha + ')'; // glowing blue
        } else {
          ctx.fillStyle = 'rgba(' + (26 + k * 40 | 0) + ',' + (80 + k * 40 | 0) + ',' + (190 + k * 30 | 0) + ',' + (alpha * 0.85) + ')'; // logo blue
        }
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function loop() {
    t += 0.008;
    draw();
    raf = visible ? requestAnimationFrame(loop) : null;
  }

  window.addEventListener('resize', resize);
  resize();

  // Redraw at once when the visitor switches light / dark
  new MutationObserver(function () { if (reduceMotion || !raf) draw(); })
    .observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  if (!reduceMotion) {
    // Only animate while the hero is on screen (saves battery and CPU)
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    }).observe(canvas);
  }
})();
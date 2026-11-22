// 共用腳本：深色模式切換、步驟動畫、長條動畫、mermaid（固定版本）。
(function () {
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem('note-theme');
    if (saved) root.setAttribute('data-theme', saved);
  } catch (e) {}

  var tbtn = document.querySelector('button.theme');
  if (tbtn) {
    tbtn.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme');
      var dark = cur ? cur === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      var next = dark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('note-theme', next); } catch (e) {}
    });
  }

  // 步驟動畫
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.stepper').forEach(function (el) {
    var steps = el.querySelectorAll('.step');
    var dots = el.querySelector('.dots');
    var i = 0, timer = null;
    steps.forEach(function () { dots.appendChild(document.createElement('i')); });
    var play = el.querySelector('[data-act=play]');
    function show(n) {
      i = (n + steps.length) % steps.length;
      steps.forEach(function (s, k) { s.classList.toggle('on', k === i); });
      dots.querySelectorAll('i').forEach(function (d, k) { d.classList.toggle('on', k === i); });
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } play.textContent = '▶'; }
    function start() { play.textContent = '⏸'; timer = setInterval(function () { show(i + 1); }, 2600); }
    el.querySelector('[data-act=prev]').onclick = function () { stop(); show(i - 1); };
    el.querySelector('[data-act=next]').onclick = function () { stop(); show(i + 1); };
    play.onclick = function () { timer ? stop() : start(); };
    show(0);
    if (!reduce && el.hasAttribute('data-autoplay')) start();
  });

  // 進入畫面時長條才長出來
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.fill').forEach(function (f) { f.style.width = f.dataset.w + '%'; });
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 }) : null;
  document.querySelectorAll('.bars').forEach(function (b) {
    if (io) io.observe(b);
    else b.querySelectorAll('.fill').forEach(function (f) { f.style.width = f.dataset.w + '%'; });
  });

  // mermaid：固定版本，載入失敗時圖原始碼仍可讀
  if (document.querySelector('pre.mermaid')) {
    import('https://cdn.jsdelivr.net/npm/mermaid@11.4.0/dist/mermaid.esm.min.mjs')
      .then(function (m) {
        var dark = root.getAttribute('data-theme') === 'dark' ||
          (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        m.default.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral', securityLevel: 'strict' });
        return m.default.run({ querySelector: 'pre.mermaid' });
      })
      .catch(function () {});
  }
})();

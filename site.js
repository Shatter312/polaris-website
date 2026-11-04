// Site-wide interface motion: progress, nav, film HUD, reveals, text decode,
// counters, card tilt/spotlight, magnetic buttons and the reticle cursor.
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(pointer: fine)');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const bar = $('.progress span');
  const nav = $('#top-nav');
  const film = $('.film');
  const hud = $('.hud');
  const hint = $('.scroll-hint');
  const sceneLabel = $('[data-hud="scene"]');
  const clock = $('[data-hud="time"]');
  const scenes = [[0, 'SEQ 01 / ORIGIN'], [.2, 'SEQ 02 / SIGNAL'], [.4, 'SEQ 03 / STARFIELD'], [.6, 'SEQ 04 / BREACH'], [.8, 'SEQ 05 / NORTH STAR']];
  let currentScene = '';

  // Text decode: cycles glyphs before settling on the real label.
  const glyphs = 'ØÆ01<>/#*+=■□◆◇ABCDEFGHJKLMNPRSTXYZ';
  function scramble(el, text = el.dataset.text || el.textContent) {
    el.dataset.text = text;
    if (still.matches) { el.textContent = text; return; }
    let frame = 0;
    const total = 18;
    cancelAnimationFrame(el._raf);
    const tick = () => {
      frame++;
      el.textContent = [...text].map((c, i) => c === ' ' || c === '/' || i < (frame / total) * text.length ? c : glyphs[(Math.random() * glyphs.length) | 0]).join('');
      if (frame < total) el._raf = requestAnimationFrame(tick);
      else el.textContent = text;
    };
    tick();
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const max = root.scrollHeight - innerHeight;
      bar.style.setProperty('--p', max > 0 ? scrollY / max : 0);
      const b = film.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -b.top / Math.max(1, b.height - innerHeight)));
      nav.classList.toggle('show', b.bottom < innerHeight * .6);
      hint.style.opacity = p > .02 ? 0 : 1;
      hud.style.opacity = p > .93 ? Math.max(0, 1 - (p - .93) / .05) : 1;
      clock.textContent = 'T+ ' + (p * 100).toFixed(1).padStart(5, '0');
      const label = scenes.filter(([at]) => p >= at).pop()[1];
      if (label !== currentScene) { currentScene = label; scramble(sceneLabel, label); }
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  // Counters count up when revealed.
  function count(el) {
    const end = +el.dataset.count;
    const start = performance.now();
    const run = now => {
      const k = still.matches ? 1 : Math.min(1, (now - start) / 1400);
      el.textContent = String(Math.round(end * (1 - (1 - k) ** 3))).padStart(2, '0');
      if (k < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }

  const reveal = new IntersectionObserver(entries => {
    for (const { isIntersecting, target: seen } of entries) {
      if (!isIntersecting) continue;
      reveal.unobserve(seen);
      // Clipped wipe headings are observed through their parent, which stays visible.
      const target = proxies.get(seen) || seen;
      target.classList.add('in');
      $$('[data-scramble]', target).concat(target.matches('[data-scramble]') ? [target] : []).forEach(el => scramble(el));
      $$('[data-count]', target).forEach(count);
      if (target.classList.contains('card')) setTimeout(() => target.classList.add('settled'), 1400);
    }
  }, { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  const proxies = new Map();
  $$('[data-reveal], .offer [data-scramble]').forEach(el => {
    if (el.dataset.reveal === 'wipe') { proxies.set(el.parentElement, el); reveal.observe(el.parentElement); }
    else reveal.observe(el);
  });

  // Active section in the nav.
  const links = new Map($$('.nav nav a').map(a => [a.hash.slice(1), a]));
  const spy = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) links.forEach((a, id) => a.classList.toggle('active', id === e.target.id));
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

  if (!fine.matches || still.matches) return;

  // Card spotlight + 3D tilt.
  for (const card of $$('.card')) {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', x * 100 + '%');
      card.style.setProperty('--my', y * 100 + '%');
      card.style.setProperty('--rx', (0.5 - y) * 7 + 'deg');
      card.style.setProperty('--ry', (x - 0.5) * 9 + 'deg');
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
  }

  // Magnetic call-to-action.
  for (const btn of $$('.magnetic')) {
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px, ${(e.clientY - r.top - r.height / 2) * .35}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  }

  // Reticle cursor that eases toward the pointer and expands over controls.
  const cursor = $('.cursor');
  let tx = 0, ty = 0, cx = 0, cy = 0, moving = false;
  const follow = () => {
    cx += (tx - cx) * .22; cy += (ty - cy) * .22;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    if (Math.abs(tx - cx) + Math.abs(ty - cy) > .3) requestAnimationFrame(follow); else moving = false;
  };
  addEventListener('pointermove', e => {
    tx = e.clientX; ty = e.clientY;
    cursor.classList.add('on');
    cursor.classList.toggle('hot', !!e.target.closest('a, button, .card'));
    if (!moving) { moving = true; requestAnimationFrame(follow); }
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.remove('on'));
})();

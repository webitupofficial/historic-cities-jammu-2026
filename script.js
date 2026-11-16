(() => {
  const root = document.documentElement;
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // --- nav state, scroll progress ---
  const nav = document.getElementById('nav');
  let ticking = false;
  const onScroll = () => {
    const max = root.scrollHeight - innerHeight;
    root.style.setProperty('--scroll', max > 0 ? (scrollY / max).toFixed(4) : 0);
    nav.classList.toggle('scrolled', scrollY > 30);
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // --- mobile menu ---
  const burger = document.getElementById('burger');
  const links = document.getElementById('navLinks');
  const setMenu = open => {
    links.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  burger.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  links.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  // --- scroll reveals (staggered among siblings) ---
  $$('.stops li').forEach((li, i) => li.style.setProperty('--n', i));
  const revealEls = $$('.reveal');
  revealEls.forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.setProperty('--i', Math.min(sibs.indexOf(el), 6));
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.05, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => io.observe(el));

    // active nav link
    const map = new Map($$('.nav-links a').map(a => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const a = map.get(e.target.id);
        if (a && e.isIntersecting) { map.forEach(x => x.classList.remove('active')); a.classList.add('active'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  if (reduced || !finePointer) return;

  // --- pointer parallax for floating layers ---
  $$('[data-depth]').forEach(el => el.style.setProperty('--k', el.dataset.depth));
  let px = 0, py = 0, tx = 0, ty = 0, raf = 0;
  const step = () => {
    px += (tx - px) * 0.08; py += (ty - py) * 0.08;
    root.style.setProperty('--px', px.toFixed(1));
    root.style.setProperty('--py', py.toFixed(1));
    raf = Math.abs(tx - px) + Math.abs(ty - py) > 0.2 ? requestAnimationFrame(step) : 0;
  };
  addEventListener('pointermove', e => {
    tx = e.clientX - innerWidth / 2; ty = e.clientY - innerHeight / 2;
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: true });

  // --- 3D tilt + cursor glow on cards ---
  $$('.tilt').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      card.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
    });
  });
})();

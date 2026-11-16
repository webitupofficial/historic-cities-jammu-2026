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

  // --- split section headlines into words so they slide up one by one ---
  if (!reduced) {
    $$('.reveal h2, h2.reveal').forEach(h => {
      let n = 0;
      const split = node => {
        [...node.childNodes].forEach(c => {
          if (c.nodeType === 3) {
            const frag = document.createDocumentFragment();
            c.textContent.split(/(\s+)/).forEach(part => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.append(' '); return; }
              const w = document.createElement('span'); w.className = 'w';
              const i = document.createElement('span'); i.textContent = part; i.style.setProperty('--w', n++);
              w.append(i); frag.append(w);
            });
            c.replaceWith(frag);
          } else if (c.nodeType === 1) split(c);
        });
      };
      h.setAttribute('aria-label', h.textContent.trim());
      split(h);
    });
  }

  // --- scroll reveals (staggered among siblings) ---
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

  // --- pointer parallax for floating layers + soft spotlight that follows the cursor ---
  $$('[data-depth]').forEach(el => el.style.setProperty('--k', el.dataset.depth));
  const spot = document.getElementById('spot');
  let px = 0, py = 0, tx = 0, ty = 0, sx = innerWidth / 2, sy = innerHeight / 2, mx = sx, my = sy, raf = 0;
  const step = () => {
    px += (tx - px) * 0.08; py += (ty - py) * 0.08;
    sx += (mx - sx) * 0.14; sy += (my - sy) * 0.14;
    root.style.setProperty('--px', px.toFixed(1));
    root.style.setProperty('--py', py.toFixed(1));
    spot.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0)`;
    raf = Math.abs(tx - px) + Math.abs(ty - py) + Math.abs(mx - sx) + Math.abs(my - sy) > 0.3 ? requestAnimationFrame(step) : 0;
  };
  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    tx = mx - innerWidth / 2; ty = my - innerHeight / 2;
    spot.classList.add('on');
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: true });
  document.addEventListener('pointerleave', () => spot.classList.remove('on'));

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

  // --- magnetic buttons ---
  $$('.magnet').forEach(btn => {
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--tx', ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px');
      btn.style.setProperty('--ty', ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px');
    });
    btn.addEventListener('pointerleave', () => { btn.style.setProperty('--tx', '0px'); btn.style.setProperty('--ty', '0px'); });
  });
})();

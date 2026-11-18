(() => {
  // EDIT: playlist. id = the YouTube video id (the part after watch?v= or youtu.be/).
  const SONGS = [
    { t: 'Bhala Sipahiya', by: 'T-Series Regional', id: 'XwuH-Z7b2Qk' },
    { t: 'Kanak Mandi Da Tanga', by: 'Swar Dhwani Music', id: 'dqcaBDwO2X4' },
    { t: 'Dikhak Mora Dogra', by: 'Anil Kumar', id: 'u-p1Nk1c0eQ' },
    { t: 'Kunjan Udiya', by: 'Tahira Syed · Virsa Heritage Revived', id: 'sYKcMK-Y5rQ', note: 'About migratory cranes stopping in the region' },
    { t: 'Odnu Rangi De Lalariya', by: 'Dogri Cinema', id: 'EfJXKK3IObc' },
    { t: 'Takki Nayi Chadondi Oo', by: 'Suraj Singh', id: 'IZJooxjYio8', note: 'Agricultural theme' },
    { t: 'Phandu Majuriya Nayio Lana', by: 'Karnail Rana', id: 'LKCNANbTTrs' },
    { t: 'Kohri', by: 'Brahamnu Brothers Production', id: 'iEi7kR6O9aE' },
    { t: 'Chann Mada Chariyaa', by: 'Narinder Kapur', id: 'XcDnr6ahUqc' },
    { t: 'Pal Par Bai Jaana', by: 'Vanshika Jaral', id: 'ztpR_vMuJMs' },
    { t: 'Dikhi Lei Dogra Des', by: 'Dr. Karan Singh', id: '7WmYJ__1auE' },
    { t: 'Jammu Di Kudi', by: 'Lucky RJ', id: 'beCM3In5S6U' },
    { t: 'Jammu Diye Shael Goriye', by: 'Roohi Juhi', id: '8OtT3fQR1wY' },
    { t: 'Aa Sajna Tugi Jammhe Di Gal Sanaa', by: 'Mridul Anand & Aarti Bhagat · Dogra Arts', id: 'XjKyQL0MaQs' },
    { t: 'Mera Jammu – Dogre Di Shaan', by: 'Mukta Monish Mehta', id: '6a-CjrEoyRc' },
    { t: 'Maaye Ni Meriye (Chamba Kinni K Durr)', by: 'Vanshika Jaral', id: 'y--bnyPto14' },
  ];
  const N = SONGS.length, F0 = 88, F1 = 108;
  const freq = i => (F0 + 1 + i * ((F1 - F0 - 2) / (N - 1))).toFixed(1);
  const pct = i => ((+freq(i) - F0) / (F1 - F0)) * 100;

  const $ = id => document.getElementById(id);
  const root = document.documentElement, body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cur = 0, playing = false, shuffle = false, player = null, ready = false, apiLoading = false, wantPlay = false, volume = 80;
  const bad = new Set();

  // ---------- build dial + list ----------
  const nums = $('nums');
  for (let f = F0; f <= F1; f += 2) {
    const s = document.createElement('span');
    s.style.left = ((f - F0) / (F1 - F0)) * 100 + '%'; s.textContent = f; nums.append(s);
  }
  const stations = $('stations'), tracks = $('tracks');
  SONGS.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'st'; b.type = 'button'; b.setAttribute('role', 'option');
    b.style.left = pct(i) + '%'; b.title = `FM ${freq(i)} · ${s.t}`; b.setAttribute('aria-label', `FM ${freq(i)}, ${s.t}`);
    b.addEventListener('click', () => tuneTo(i, true));
    stations.append(b);

    const li = document.createElement('li');
    li.innerHTML = `<div class="track" role="button" tabindex="0">
      <span class="thumb"><img loading="lazy" decoding="async" width="76" height="76" alt="" src="https://i.ytimg.com/vi/${s.id}/mqdefault.jpg"><span class="eq"><i></i><i></i><i></i></span></span>
      <span><span class="t-freq">FM ${freq(i)}</span><span class="t-title"></span><span class="t-by"></span>${s.note ? '<span class="t-note"></span>' : ''}</span>
      <a class="t-yt" href="https://www.youtube.com/watch?v=${s.id}" target="_blank" rel="noopener" aria-label="Open on YouTube"><svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></a></div>`;
    li.querySelector('.t-title').textContent = s.t;
    li.querySelector('.t-by').textContent = s.by;
    if (s.note) li.querySelector('.t-note').textContent = s.note;
    const card = li.firstElementChild;
    card.addEventListener('click', e => { if (!e.target.closest('.t-yt')) { tuneTo(i, true); $('radio').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); } });
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } });
    tracks.append(li);
  });
  const stBtns = [...stations.children], cards = [...tracks.querySelectorAll('.track')];

  // ---------- display ----------
  const fmt = t => { t = Math.max(0, Math.floor(t || 0)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
  const lcdTitle = $('lcdTitle');
  function setTitle(text) {
    lcdTitle.textContent = text;
    const box = lcdTitle.parentElement;
    box.classList.remove('scroll');
    requestAnimationFrame(() => {
      const over = lcdTitle.scrollWidth - box.clientWidth * 0.92;
      if (over > 0) { box.style.setProperty('--shift', -over + 'px'); box.style.setProperty('--dur', Math.max(8, over / 18) + 's'); box.classList.add('scroll'); }
    });
  }
  function paint() {
    const s = SONGS[cur];
    root.style.setProperty('--needle', pct(cur) + '%');
    root.style.setProperty('--tune', (cur / (N - 1)) * 300 - 150 + 'deg');
    $('tune').setAttribute('aria-valuenow', cur + 1);
    $('tune').setAttribute('aria-valuetext', `FM ${freq(cur)}, ${s.t}`);
    $('lcdFreq').textContent = `FM ${freq(cur)}`;
    setTitle(`${s.t} — ${s.by}`);
    stBtns.forEach((b, i) => b.setAttribute('aria-selected', i === cur));
    cards.forEach((c, i) => c.classList.toggle('now', i === cur));
    if (!ready || !playing) $('posterImg').src = `https://i.ytimg.com/vi/${s.id}/hqdefault.jpg`;
    // keep the selected station visible on narrow dials
    const wrap = document.querySelector('.dial-wrap');
    if (wrap.scrollWidth > wrap.clientWidth) wrap.scrollTo({ left: (pct(cur) / 100) * wrap.scrollWidth - wrap.clientWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
  }
  function setPlaying(p) {
    playing = p; body.classList.toggle('on', p);
    $('onair').lastChild.textContent = p ? 'On air' : 'Off air';
    $('play').setAttribute('aria-label', p ? 'Pause' : 'Play');
  }

  // ---------- tuning static (short white-noise burst) ----------
  let actx = null;
  function hiss() {
    if (reduced) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const len = actx.sampleRate * 0.28, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = actx.createBufferSource(), g = actx.createGain(), f = actx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7;
      g.gain.value = 0.06 * (volume / 100);
      src.buffer = buf; src.connect(f).connect(g).connect(actx.destination); src.start();
    } catch (e) { /* audio not available */ }
  }

  // ---------- YouTube player (loaded on first play to keep the page fast) ----------
  function loadApi() {
    if (apiLoading) return; apiLoading = true;
    window.onYouTubeIframeAPIReady = () => {
      player = new YT.Player('yt', {
        host: 'https://www.youtube-nocookie.com', videoId: SONGS[cur].id,
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => { ready = true; player.setVolume(volume); if (wantPlay) { player.playVideo(); } },
          onStateChange: e => {
            if (e.data === YT.PlayerState.PLAYING) { setPlaying(true); $('poster').classList.add('gone'); }
            else if (e.data === YT.PlayerState.PAUSED) setPlaying(false);
            else if (e.data === YT.PlayerState.ENDED) step(1, true);
          },
          onError: () => {
            bad.add(cur); stBtns[cur].classList.add('bad'); cards[cur].classList.add('bad');
            setTitle(`${SONGS[cur].t} can't play here — skipping`);
            if (bad.size < N) setTimeout(() => step(1, true), 1800);
          },
        },
      });
    };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.append(s);
  }
  function play() {
    wantPlay = true;
    if (!player) { $('poster').classList.add('gone'); loadApi(); return; }
    if (ready) player.playVideo();
  }
  function pause() { wantPlay = false; if (ready) player.pauseVideo(); setPlaying(false); }
  function tuneTo(i, autoplay) {
    i = (i + N) % N;
    const changed = i !== cur; cur = i; paint();
    if (changed) hiss();
    if (ready) {
      if (autoplay || playing) { player.loadVideoById(SONGS[cur].id); wantPlay = true; }
      else player.cueVideoById(SONGS[cur].id);
    } else if (autoplay) play();
    $('bar').style.width = '0%';
  }
  function step(dir, autoplay) {
    let i = cur, tries = 0;
    do {
      i = shuffle ? Math.floor(Math.random() * N) : (i + dir + N) % N;
      tries++;
    } while ((bad.has(i) || (shuffle && i === cur)) && tries < N * 2);
    tuneTo(i, autoplay);
  }

  // ---------- controls ----------
  $('play').addEventListener('click', () => (playing ? pause() : play()));
  $('poster').addEventListener('click', play);
  $('prev').addEventListener('click', () => step(-1, playing || wantPlay));
  $('next').addEventListener('click', () => step(1, playing || wantPlay));
  $('shuffle').addEventListener('click', e => { shuffle = !shuffle; e.currentTarget.setAttribute('aria-pressed', shuffle); });

  // progress + time + fake VU from playback
  const vu = [...document.querySelectorAll('.vu i')];
  setInterval(() => {
    if (!ready || !player.getDuration) return;
    const t = player.getCurrentTime(), d = player.getDuration();
    $('lcdTime').textContent = `${fmt(t)} / ${fmt(d)}`;
    const p = d ? (t / d) * 100 : 0;
    $('bar').style.width = p + '%'; $('progress').setAttribute('aria-valuenow', Math.round(p));
  }, 500);
  let beatT = 0;
  (function loop(ts) {
    if (playing && !reduced && ts - beatT > 110) {
      beatT = ts; const lvl = (volume / 100);
      vu.forEach(b => { b.style.height = (12 + Math.random() * 82 * lvl) + '%'; });
      root.style.setProperty('--beat', (Math.random() * lvl).toFixed(2));
    } else if (!playing && vu[0].style.height !== '12%') {
      vu.forEach(b => { b.style.height = '12%'; }); root.style.setProperty('--beat', 0);
    }
    requestAnimationFrame(loop);
  })(0);

  function seekFrom(x) {
    if (!ready) return;
    const r = $('progress').getBoundingClientRect();
    player.seekTo(Math.min(1, Math.max(0, (x - r.left) / r.width)) * player.getDuration(), true);
  }
  $('progress').addEventListener('pointerdown', e => { seekFrom(e.clientX); const mv = ev => seekFrom(ev.clientX); addEventListener('pointermove', mv); addEventListener('pointerup', () => removeEventListener('pointermove', mv), { once: true }); });
  $('progress').addEventListener('keydown', e => {
    if (!ready) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); player.seekTo(player.getCurrentTime() + (e.key === 'ArrowRight' ? 10 : -10), true); }
  });

  // rotary knobs: drag around the centre, or scroll
  function knob(el, onTurn) {
    let last = null, acc = 0;
    const ang = e => { const r = el.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
    el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); last = ang(e); acc = 0; e.preventDefault(); });
    el.addEventListener('pointermove', e => {
      if (last === null) return;
      let a = ang(e), d = a - last; if (d > 180) d -= 360; if (d < -180) d += 360; last = a;
      acc += d; acc = onTurn(acc, false);
    });
    const end = () => { if (last !== null) { last = null; onTurn(acc, true); } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', e => { e.preventDefault(); onTurn(e.deltaY < 0 ? 999 : -999, true, true); }, { passive: false });
  }
  // tune: every 22 degrees moves one station; playback switches when you let go
  let pending = null;
  knob($('tune'), (acc, release, wheel) => {
    if (wheel) { step(acc > 0 ? 1 : -1, playing || wantPlay); return 0; }
    if (Math.abs(acc) >= 22) {
      const dir = acc > 0 ? 1 : -1;
      pending = ((pending ?? cur) + dir + N) % N;
      root.style.setProperty('--needle', pct(pending) + '%');
      root.style.setProperty('--tune', (pending / (N - 1)) * 300 - 150 + 'deg');
      $('lcdFreq').textContent = `FM ${freq(pending)}`; setTitle(SONGS[pending].t); hiss();
      acc -= dir * 22;
    }
    if (release && pending !== null) { const p = pending; pending = null; tuneTo(p, playing || wantPlay); }
    return acc;
  });
  // volume: -135deg (0) to +135deg (100)
  const setVol = v => {
    volume = Math.round(Math.min(100, Math.max(0, v)));
    root.style.setProperty('--vol', (volume / 100) * 270 - 135 + 'deg');
    $('vol').setAttribute('aria-valuenow', volume);
    if (ready) player.setVolume(volume);
  };
  knob($('vol'), (acc, release, wheel) => { if (wheel) { setVol(volume + (acc > 0 ? 5 : -5)); return 0; } setVol(volume + acc / 2.7); return 0; });
  $('tune').addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); step(1, playing || wantPlay); } if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); step(-1, playing || wantPlay); } });
  $('vol').addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); setVol(volume + 5); } if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); setVol(volume - 5); } });

  // keyboard shortcuts
  addEventListener('keydown', e => {
    if (e.target.closest('input,textarea,[contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'Space' && !e.target.closest('button,[role=button],a')) { e.preventDefault(); playing ? pause() : play(); }
    else if (e.key === 'ArrowRight') step(1, playing || wantPlay);
    else if (e.key === 'ArrowLeft') step(-1, playing || wantPlay);
  });

  setVol(volume);
  paint();
})();

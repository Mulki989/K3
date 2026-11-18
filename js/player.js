/* Pemutar slide bernarasi: teks narasi, MP3, kecepatan, simulasi, cek pemahaman, progres per slide. */
(function (K3) {
  'use strict';
  var P = K3.Player = {};
  var app = function () { return document.getElementById('app'); };

  function runMateri(code) {
    // File materi dari Drive mendaftarkan dirinya lewat K3.materi({...}).
    new Function('K3', code)(K3);
  }

  P.open = function (id) {
    K3.loading('Memuat materi…');
    var info = (K3._beranda && K3._beranda.materi || []).filter(function (m) { return m.id === id; })[0];
    var rv = K3._rv;
    K3.api('materi', { id: id }).then(function (r) {
      if (K3.stale(rv)) return;
      if (!K3._materi[id]) runMateri(r.code);
      var def = K3._materi[id];
      if (!def) throw new Error('File materi ' + id + ' tidak mendaftarkan K3.materi({id:"' + id + '"}).');
      P.show(def, r.progres || { slides: {}, cek: {} }, info, { aturan: r.aturan });
    }).catch(function (e) { if (!K3.stale(rv)) K3.errorView(e, '#/'); });
  };

  P.openDosen = function (id) {
    K3.loading('Memuat pratinjau materi…');
    var rv = K3._rv;
    K3.api('dosenMateri', { id: id }, { dosen: true }).then(function (r) {
      if (K3.stale(rv)) return;
      if (!K3._materi[id]) runMateri(r.code);
      var def = K3._materi[id];
      if (!def) throw new Error('File materi ' + id + ' tidak mendaftarkan K3.materi({id:"' + id + '"}).');
      P.show(def, { slides: {}, cek: {} }, { no: r.no }, { preview: true });
    }).catch(function (e) { if (!K3.stale(rv) && e.code !== 'SESI') K3.errorView(e, '#/dosen'); });
  };

  P.show = function (def, prog, info, opt) {
    var preview = !!(opt && opt.preview), home = preview ? '#/dosen' : '#/';
    var slides = def.slides || [];
    var st = {
      i: 0, done: prog.slides || {}, cek: prog.cek || {}, ans: {},
      speed: K3.store.get('speed') || 1, teks: K3.store.get('teks') !== false, auto: K3.store.get('auto') !== false, audio: null, capT: null, simClean: null
    };
    // mulai dari slide pertama yang belum selesai
    for (var k = 0; !preview && k < slides.length; k++) { if (!st.done[slides[k].id]) { st.i = k; break; } if (k === slides.length - 1) st.i = 0; }
    // Sub-materi: slide yang punya 'bagian' memulai sub-materi baru.
    var groups = [], gOf = [];
    slides.forEach(function (x, j) {
      if (!groups.length || x.bagian) groups.push({ no: groups.length + 1, judul: x.bagian || 'Materi', idx: [] });
      groups[groups.length - 1].idx.push(j); gOf[j] = groups.length - 1;
    });
    function gDone(g) { return groups[g].idx.every(function (j) { return st.done[slides[j].id]; }); }
    function gOpen(g) { if (preview) return true; for (var k = 0; k < g; k++) if (!gDone(k)) return false; return true; }
    function frontier() { for (var j = 0; j < slides.length; j++) if (!st.done[slides[j].id]) return j; return -1; }
    function reachable(j) { return preview || !!st.done[slides[j].id] || j === st.i || (j === frontier() && gOpen(gOf[j])); }
    st.toc = K3.store.get('toc') !== null && K3.store.get('toc') !== undefined ? !!K3.store.get('toc') && window.innerWidth >= 1000 : window.innerWidth >= 1000;
    var pending = K3.store.get('pend_' + def.id) || { slides: {}, cek: {} };
    pending.durasi = pending.durasi || {}; pending.anim = pending.anim || {};
    var aturan = (opt && opt.aturan) || { waktuMin: '0', kpm: 150 };
    st.elapsed = 0; st.need = 0; st.tick = null; st.last = 0; st.maxPos = 0;
    // Waktu minimal tiap slide (detik). Slide yang sudah pernah selesai dan pratinjau dosen tidak menunggu.
    function minFor(s) {
      if (preview || st.done[s.id]) return 0;
      if (typeof s.minDetik === 'number') return s.minDetik;
      var m = String(aturan.waktuMin || 'otomatis').toLowerCase().trim();
      if (m === '0' || m === 'tidak' || m === 'mati') return 0;
      if (/^\d+$/.test(m)) return Number(m);
      var html = typeof s.html === 'function' ? s.html(K3) : (s.html || '');
      var wc = function (t) { return String(t).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length; };
      var sec = Math.round(Math.max(wc(html), wc(s.narasi || '')) / (aturan.kpm || 150) * 60);
      if (s.sim) sec += 15;
      if (s.anim) sec += 10;
      if (s.cek) sec += 5;
      return Math.max(8, Math.min(120, sec));
    }

    function flush() {
      if (preview) return;
      var ids = Object.keys(pending.slides);
      if (!ids.length && !Object.keys(pending.cek).length && !Object.keys(pending.anim || {}).length) return;
      var send = pending; pending = { slides: {}, cek: {}, durasi: {}, anim: {} }; K3.store.set('pend_' + def.id, pending);
      var jd = {}; slides.forEach(function (x) { if (send.slides[x.id] || send.cek[x.id] !== undefined) jd[x.id] = x.judul; });
      K3.api('progres', { materi: def.id, slides: Object.keys(send.slides), cek: send.cek, total: slides.length, judul: jd, durasi: send.durasi || {}, anim: send.anim || {}, posisi: st.maxPos,
        sub: { total: groups.length, selesai: groups.filter(function (g, k) { return gDone(k); }).map(function (g) { return g.judul; }), sekarang: groups[gOf[st.i]] ? groups[gOf[st.i]].judul : '' } }).catch(function () {
        Object.keys(send.durasi || {}).forEach(function (d) { pending.durasi[d] = send.durasi[d]; });
        Object.keys(send.slides).forEach(function (s) { pending.slides[s] = 1; });
        Object.keys(send.cek).forEach(function (c) { pending.cek[c] = send.cek[c]; });
        Object.keys(send.anim || {}).forEach(function (a) { pending.anim[a] = send.anim[a]; });
        K3.store.set('pend_' + def.id, pending);
        K3.toast('Progres belum tersimpan (koneksi). Akan dicoba lagi.');
      });
    }
    function markDone(s) {
      if (preview) { st.done[s.id] = 1; return; }
      if (!st.done[s.id]) { st.done[s.id] = 1; pending.slides[s.id] = 1; pending.durasi[s.id] = Math.round(st.elapsed / 1000); }
      if (s.cek && st.ans[s.id] !== undefined && st.cek[s.id] === undefined) { st.cek[s.id] = st.ans[s.id] === s.cek.kunci ? 1 : 0; pending.cek[s.id] = st.cek[s.id]; }
      K3.store.set('pend_' + def.id, pending);
      flush();
    }
    function audioSrc(s) {
      if (s.audio === false) return null;
      if (typeof s.audio === 'string') return s.audio;
      return 'audio/' + def.id + '_' + s.id + '.mp3';
    }
    function fmtT(t) { if (!isFinite(t)) return '0:00'; t = Math.floor(t); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
    function stopAudio() { if (st.capT) { clearTimeout(st.capT); st.capT = null; } if (st.audio) { st.audio.pause(); st.audio.src = ''; st.audio = null; } }
    // Narasi dipecah per kalimat (maks. ±170 huruf per potongan) agar tampil bergantian, tanpa menggulir.
    function potong(t) {
      var kal = String(t || '').replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+["'”’)]*\s*|[^.!?]+$/g) || [];
      var out = [];
      kal.forEach(function (k) {
        k = k.trim(); if (!k) return;
        var last = out[out.length - 1];
        if (last && last.length + k.length + 1 <= 170 && last.length < 90) out[out.length - 1] = last + ' ' + k; else out.push(k);
      });
      return out.length ? out : [''];
    }

    function cekHtml(s) {
      var h = '<div class="cek" id="cek"><span class="small" style="font-weight:800;color:var(--blue);letter-spacing:.04em">CEK PEMAHAMAN</span><div class="q">' + K3.esc(s.cek.tanya) + '</div>';
      var chosen = st.ans[s.id] !== undefined ? st.ans[s.id] : (st.cek[s.id] !== undefined ? 'lama' : undefined);
      s.cek.opsi.forEach(function (o, j) {
        var cls = '';
        if (chosen !== undefined && chosen !== 'lama') { if (j === s.cek.kunci) cls = 'ok'; else if (j === chosen) cls = 'no'; }
        if (chosen === 'lama' && j === s.cek.kunci) cls = 'ok';
        h += '<button type="button" class="opt ' + cls + '" data-o="' + j + '"' + (chosen !== undefined ? ' aria-disabled="true"' : '') + '>' + K3.esc(o) + '</button>';
      });
      if (chosen !== undefined) {
        var ok = chosen === 'lama' ? st.cek[s.id] === 1 : chosen === s.cek.kunci;
        var umpan = Array.isArray(s.cek.umpan) ? s.cek.umpan[chosen === 'lama' ? s.cek.kunci : chosen] : s.cek.umpan;
        h += '<div class="msg ' + (ok ? 'ok' : 'warn') + '" role="status">' + (chosen === 'lama' ? 'Sudah dijawab sebelumnya. ' : (ok ? '<b>Tepat.</b> ' : '<b>Belum tepat.</b> ')) + K3.esc(umpan || '') + '</div>';
      }
      return h + '</div>';
    }
    function bindCek(s) {
      K3.$$('#cek .opt').forEach(function (b) {
        b.onclick = function () {
          if (st.ans[s.id] !== undefined || st.cek[s.id] !== undefined) return;
          st.ans[s.id] = Number(b.getAttribute('data-o'));
          // catat jawaban cek; slide baru dihitung selesai saat tombol Berikutnya ditekan (setelah waktu minimal)
          if (!preview && st.cek[s.id] === undefined) { st.cek[s.id] = st.ans[s.id] === s.cek.kunci ? 1 : 0; pending.cek[s.id] = st.cek[s.id]; K3.store.set('pend_' + def.id, pending); flush(); }
          var box = K3.$('#cek'); box.outerHTML = cekHtml(s); bindCek(s);
          updateNext();
          var dot = K3.$$('.dots i')[st.i]; if (dot) dot.className = 'c';
        };
      });
    }

    function canNext() {
      var s = slides[st.i];
      var cekOk = preview || !s.cek || st.ans[s.id] !== undefined || st.cek[s.id] !== undefined;
      return { cek: cekOk, waktu: st.elapsed >= st.need * 1000, sisa: Math.max(0, Math.ceil(st.need - st.elapsed / 1000)) };
    }
    function updateNext() {
      var nx = K3.$('#next'); if (!nx) return;
      var c = canNext(), last = st.i === slides.length - 1;
      var base = last ? 'Selesai' : 'Berikutnya';
      nx.disabled = !(c.cek && c.waktu);
      nx.textContent = c.waktu ? base : base + ' (' + c.sisa + ')';
      nx.title = !c.cek ? 'Jawab cek pemahaman dulu' : !c.waktu ? 'Pelajari slide ini dulu: ' + c.sisa + ' detik lagi' : '';
      var bar = K3.$('#tbar'), info = K3.$('#tinfo');
      if (bar && st.need) bar.style.width = Math.min(100, st.elapsed / (st.need * 10)) + '%';
      if (info) info.textContent = !st.need ? '' : c.waktu ? (c.cek ? 'Waktu minimal terpenuhi.' : 'Waktu minimal terpenuhi. Jawab cek pemahaman untuk lanjut.') :
        'Pelajari slide ini: ' + c.sisa + ' detik lagi sebelum bisa lanjut' + (document.hidden || !document.hasFocus() ? ' (waktu berhenti saat halaman ditinggal)' : '') + '.';
    }
    function startTimer() {
      clearInterval(st.tick); st.last = Date.now();
      st.tick = setInterval(function () {
        var now = Date.now(), dt = now - st.last; st.last = now;
        if (!document.hidden && document.hasFocus() && dt < 2000) st.elapsed += dt;
        updateNext();
      }, 250);
    }
    // ---------- Animasi slide ----------
    // s.anim(view, K3, A): A.scenes(n) memutar adegan 0..n-1 (elemen [data-s]=muncul mulai adegan k, [data-only]=hanya adegan k),
    // mengikuti potongan narasi; A.onReplay(fn) untuk animasi interaktif; A.done(info) mencatat interaksi ke Sheet.
    var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function makeAnim(box, s, capsN) {
      var view = box.querySelector('.animv');
      var A = { reduce: RM, k: -1, n: 0, t: null, cleans: [], replayFn: null, view: view, slide: s.id };
      var words = String(s.narasi || '').split(/\s+/).filter(Boolean).length;
      A.narrMs = Math.max(6000, words / (aturan.kpm || 150) * 60000 / st.speed);
      A.go = function (k) {
        A.k = k;
        K3.$$('[data-s]', view).forEach(function (e) { e.classList.toggle('on', Number(e.getAttribute('data-s')) <= k); });
        K3.$$('[data-only]', view).forEach(function (e) { e.classList.toggle('on', String(e.getAttribute('data-only')).split(',').indexOf(String(k)) >= 0); });
        view.setAttribute('data-k', k);
        if (A.onShow) A.onShow(k);
      };
      A.next = function () {
        clearTimeout(A.t);
        if (A.k >= A.n - 1) return;
        A.t = setTimeout(function () {
          if (!document.body.contains(view)) return;
          if (document.hidden) { A.next(); return; }
          A.go(A.k + 1); A.next();
        }, A.dur);
      };
      A.scenes = function (n, o) {
        o = o || {}; A.n = n; A.onShow = o.show || null;
        A.dur = o.dur || Math.max(1800, Math.min(6000, A.narrMs / n));
        A.replayFn = null; A.play();
      };
      A.play = function () { clearTimeout(A.t); if (A.reduce) { A.go(A.n - 1); return; } A.go(0); A.next(); };
      A.cap = function (i, N) {
        if (!A.n || A.reduce || A.replayFn) return;
        var t = Math.min(A.n - 1, Math.floor(i * A.n / Math.max(1, N)));
        if (t > A.k) { A.go(t); A.next(); }
      };
      A.onReplay = function (fn) { A.replayFn = fn; };
      A.onClean = function (fn) { A.cleans.push(fn); };
      A.later = function (fn, ms) { var id = setTimeout(function () { if (document.body.contains(view)) fn(); }, A.reduce ? 0 : ms); A.cleans.push(function () { clearTimeout(id); }); return id; };
      A.done = function (info) {
        box.classList.add('selesai');
        if (preview) return;
        pending.anim[s.id] = String(info || 'selesai').slice(0, 200); K3.store.set('pend_' + def.id, pending); flush();
      };
      A.clean = function () { clearTimeout(A.t); A.cleans.forEach(function (f) { try { f(); } catch (e) {} }); A.cleans = []; };
      box.querySelector('.animre').onclick = function () { A.clean(); if (A.replayFn) A.replayFn(); else A.play(); };
      return A;
    }

    function tocHtml() {
      var h = '<aside class="toc' + (st.toc ? ' open' : '') + '" id="toc" aria-label="Daftar isi materi"><div class="tochead"><b>Daftar isi</b><span class="small">' + groups.length + ' sub-materi · ' + slides.length + ' slide</span>' +
        '<button type="button" class="tocx" id="tocx" aria-label="Tutup daftar isi">×</button></div><ol class="toclist">';
      groups.forEach(function (g, k) {
        var open = gOpen(k), done = gDone(k), n = g.idx.filter(function (j) { return st.done[slides[j].id]; }).length, cur = gOf[st.i] === k;
        var stt = done ? 'selesai' : !open ? 'terkunci' : n || cur ? 'berjalan' : 'terbuka';
        h += '<li class="tg ' + stt + (cur ? ' cur' : '') + '"><button type="button" class="tgb" data-g="' + k + '"' + (open ? '' : ' disabled aria-disabled="true"') + '>' +
          '<span class="tgn">' + (done ? '✓' : !open ? K3.icon.lock || '🔒' : g.no) + '</span><span class="tgt"><b>' + K3.esc(g.judul) + '</b><span class="small">' + n + '/' + g.idx.length + ' slide' +
          (done ? ' · selesai' : !open ? ' · selesaikan sub-materi ' + (k) + ' dulu' : '') + '</span></span></button>';
        if (open || preview) {
          h += '<ol class="tsl">';
          g.idx.forEach(function (j) {
            var ok = reachable(j), d = st.done[slides[j].id];
            h += '<li><button type="button" class="tsb' + (j === st.i ? ' on' : '') + (d ? ' d' : '') + '" data-j="' + j + '"' + (ok ? '' : ' disabled aria-disabled="true" title="Selesaikan slide sebelumnya dulu"') + '>' +
              '<span class="tsn">' + (d ? '✓' : j + 1) + '</span>' + K3.esc(slides[j].judul) + '</button></li>';
          });
          h += '</ol>';
        }
        h += '</li>';
      });
      return h + '</ol></aside>';
    }
    function goTo(j) { if (j === st.i || !reachable(j)) return; st.i = j; st.toc = window.innerWidth >= 1000 ? st.toc : false; render(); window.scrollTo(0, 0); }
    function render() {
      stopAudio();
      st.elapsed = 0; st.need = minFor(slides[st.i]); st.maxPos = Math.max(st.maxPos, st.i + 1);
      if (st.simClean) { try { st.simClean(); } catch (e) {} st.simClean = null; }
      if (st.anim) { st.anim.clean(); st.anim = null; }
      var s = slides[st.i], n = slides.length;
      var cekDone = canNext().cek;
      var doneCount = slides.filter(function (x) { return st.done[x.id]; }).length;
      var h = '<div class="player">';
      h += '<header class="topbar"><a href="' + home + '">' + K3.icon.back + (preview ? 'Panel dosen' : 'Beranda') + '</a><div class="t"><span class="k">' + (preview ? 'PRATINJAU DOSEN · ' : '') + 'PERTEMUAN ' + (info ? info.no : '') + ' · ' + K3.esc(def.subcpmk || '') + '</span><span class="h">' + K3.esc(def.judul) + '</span></div>' +
        '<div class="dots" aria-label="Slide ' + (st.i + 1) + ' dari ' + n + '">';
      slides.forEach(function (x, j) { h += '<i class="' + (j === st.i ? 'c' : st.done[x.id] ? 'd' : '') + '"></i>'; });
      h += '<span class="small" style="font-weight:700;margin-left:8px">Slide ' + (st.i + 1) + '/' + n + ' · ' + Math.round(doneCount / n * 100) + '% selesai</span></div>';
      var G = groups[gOf[st.i]], posG = G.idx.indexOf(st.i) + 1;
      h += '<button type="button" class="tocbtn" id="tocbtn" aria-expanded="' + st.toc + '" aria-controls="toc">Daftar isi · ' + groups.filter(function (g, k) { return gDone(k); }).length + '/' + groups.length + ' sub-materi</button>';
      if (preview) h += '<label class="small" style="display:flex;align-items:center;gap:6px;font-weight:700">Lompat ke<select class="ctl2" id="jump" style="height:36px;border-radius:8px;border:1px solid var(--dark2);background:transparent;color:#fff;max-width:220px">' +
        slides.map(function (x, j) { return '<option value="' + j + '"' + (j === st.i ? ' selected' : '') + ' style="color:#17202B">' + (j + 1) + '. ' + K3.esc(x.judul) + '</option>'; }).join('') + '</select></label>';
      h += '</header>';
      if (preview) h += '<div class="msg warn" style="border-radius:0">Mode pratinjau dosen: progres tidak disimpan, tombol Berikutnya tidak menunggu cek pemahaman.</div>';
      h += '<div class="pwrap">' + tocHtml() + '<main class="stage"><div class="subinfo"><span class="chip amber">Sub-materi ' + G.no + '/' + groups.length + '</span><b>' + K3.esc(G.judul) + '</b><span class="small muted">slide ' + posG + ' dari ' + G.idx.length + ' di sub-materi ini</span></div><article class="slide" aria-live="polite">' + (st.need ? '<div class="tline" aria-hidden="true"><i id="tbar"></i></div><div class="small muted" id="tinfo" role="status"></div>' : '') + '<h1>' + K3.esc(s.judul) + '</h1>' + (s.anim ? '<div class="sx"><div class="anim" id="animbox"><div class="animv"></div><div class="animbar"><span class="small muted animlbl">' + (s.animInfo ? K3.esc(s.animInfo) : 'Animasi') + '</span><button type="button" class="btn sm ghost animre">↻ Ulangi animasi</button></div></div>' : '') + '<div class="body">' + (typeof s.html === 'function' ? s.html(K3) : (s.html || '')) + '</div>' + (s.anim ? '</div>' : '');
      if (s.sim) h += '<div class="sim" id="simbox"></div>';
      if (s.cek) h += cekHtml(s);
      h += '</article></main></div>';
      var caps = potong(s.narasi);
      h += '<div class="dock"><div class="narr' + (st.teks ? '' : ' hidden') + '" id="narr"><div class="cap">' +
        '<button type="button" class="capb" id="capPrev" aria-label="Kalimat narasi sebelumnya">‹</button>' +
        '<p id="capTxt" aria-live="polite"></p>' +
        '<button type="button" class="capb" id="capNext" aria-label="Kalimat narasi berikutnya">›</button>' +
        '<div class="capm"><span id="capN">1/' + caps.length + '</span><span class="captag hidden" id="noaudio">MP3 belum ada · teks berjalan otomatis</span></div></div></div>';
      h += '<footer class="pbar"><button class="play" id="play" type="button" aria-label="Putar narasi">' + K3.icon.play + '</button>' +
        '<div class="prog"><span id="tcur">0:00</span><input type="range" id="seek" min="0" max="100" value="0" step="0.1" aria-label="Posisi narasi"><span id="tdur">0:00</span></div>' +
        '<select class="ctl2" id="speed" aria-label="Kecepatan narasi">' + [0.75, 1, 1.25, 1.5].map(function (v) { return '<option value="' + v + '"' + (v === st.speed ? ' selected' : '') + '>' + String(v).replace('.', ',') + '×</option>'; }).join('') + '</select>' +
        '<button class="ctl2' + (st.teks ? ' on' : '') + '" id="teks" type="button" aria-pressed="' + st.teks + '">Teks</button>' +
        '<div class="nav"><button class="btn ghost" id="prev" type="button"' + (st.i === 0 ? ' disabled' : '') + '>Sebelumnya</button>' +
        '<button class="btn amber" id="next" type="button"' + (cekDone ? '' : ' disabled') + '>' + (st.i === n - 1 ? 'Selesai' : 'Berikutnya') + '</button></div></footer></div></div>';
      app().innerHTML = h;
      updateNext(); startTimer();
      K3.$('#tocbtn').onclick = function () { st.toc = !st.toc; if (window.innerWidth >= 1000) K3.store.set('toc', st.toc); K3.$('#toc').classList.toggle('open', st.toc); this.setAttribute('aria-expanded', st.toc); };
      K3.$('#tocx').onclick = function () { st.toc = false; if (window.innerWidth >= 1000) K3.store.set('toc', false); K3.$('#toc').classList.remove('open'); K3.$('#tocbtn').setAttribute('aria-expanded', 'false'); };
      K3.$$('#toc [data-j]').forEach(function (b) { b.onclick = function () { goTo(Number(b.getAttribute('data-j'))); }; });
      K3.$$('#toc [data-g]').forEach(function (b) {
        b.onclick = function () {
          var g = groups[Number(b.getAttribute('data-g'))];
          var t = g.idx.filter(function (j) { return !st.done[slides[j].id]; })[0]; if (t === undefined) t = g.idx[0];
          if (!reachable(t)) t = g.idx[0];
          goTo(t);
        };
      });
      var jp = K3.$('#jump'); if (jp) jp.onchange = function () { st.i = Number(jp.value); render(); window.scrollTo(0, 0); };

      // simulasi
      if (s.anim) {
        var ab = K3.$('#animbox');
        try { st.anim = makeAnim(ab, s); s.anim(ab.querySelector('.animv'), K3, st.anim); }
        catch (e) { ab.querySelector('.animv').innerHTML = '<div class="msg err">Animasi gagal dimuat: ' + K3.esc(e.message) + '</div>'; }
      }
      if (s.sim) { try { st.simClean = s.sim(K3.$('#simbox'), K3) || null; } catch (e) { K3.$('#simbox').innerHTML = '<div class="msg err">Simulasi gagal dimuat: ' + K3.esc(e.message) + '</div>'; } }
      if (s.cek) bindCek(s);
      // narasi: potongan kalimat + audio (bila ada) atau teks berjalan otomatis
      var src = audioSrc(s), playBtn = K3.$('#play'), seek = K3.$('#seek');
      var ci = -1, wt = caps.map(function (c) { return Math.max(c.length, 20); }), tot = wt.reduce(function (a, b) { return a + b; }, 0);
      var cum = []; wt.reduce(function (a, b, i) { cum[i] = a; return a + b; }, 0);
      var mode = 'audio', capPlay = false;
      function capDur(i) { var w = caps[i].split(/\s+/).filter(Boolean).length; return Math.max(2.5, w / (aturan.kpm || 150) * 60 / st.speed); }
      var capTotal = function () { var t = 0; for (var i = 0; i < caps.length; i++) t += capDur(i); return t; };
      function showCap(i) {
        i = Math.max(0, Math.min(caps.length - 1, i)); if (i === ci) return; ci = i;
        var el = K3.$('#capTxt'); if (!el) return;
        el.textContent = caps[i]; el.classList.remove('fade'); void el.offsetWidth; el.classList.add('fade');
        K3.$('#capN').textContent = (i + 1) + '/' + caps.length;
        if (st.anim) st.anim.cap(i, caps.length);
        K3.$('#capPrev').disabled = i === 0; K3.$('#capNext').disabled = i === caps.length - 1;
      }
      function setIcon(on) { playBtn.innerHTML = on ? K3.icon.pause : K3.icon.play; playBtn.setAttribute('aria-label', on ? 'Jeda narasi' : 'Putar narasi'); }
      function textProgress() {
        var t = 0; for (var i = 0; i < ci; i++) t += capDur(i);
        var T = capTotal(); seek.value = T ? t / T * 100 : 0; K3.$('#tcur').textContent = fmtT(t); K3.$('#tdur').textContent = fmtT(T);
      }
      function capTick() {
        if (st.capT) { clearTimeout(st.capT); st.capT = null; }
        if (!capPlay) return;
        st.capT = setTimeout(function () {
          if (!document.body.contains(playBtn)) return;
          if (document.hidden) { capTick(); return; }
          if (ci >= caps.length - 1) { capPlay = false; setIcon(false); seek.value = 100; K3.$('#tcur').textContent = fmtT(capTotal()); return; }
          showCap(ci + 1); textProgress(); capTick();
        }, capDur(ci) * 1000);
      }
      function capStart(play) { capPlay = play; if (play && ci >= caps.length - 1 && caps.length > 1) { showCap(0); } setIcon(play); textProgress(); capTick(); }
      function jumpCap(i) {
        showCap(i);
        if (mode === 'audio' && st.audio && st.audio.duration) st.audio.currentTime = cum[ci] / tot * st.audio.duration + 0.01;
        else { textProgress(); capTick(); }
      }
      showCap(0);
      K3.$('#capPrev').onclick = function () { jumpCap(ci - 1); };
      K3.$('#capNext').onclick = function () { jumpCap(ci + 1); };
      function noAudio() {
        if (st.audio) { st.audio.onpause = st.audio.onplay = st.audio.ontimeupdate = null; st.audio = null; }
        mode = 'teks'; K3.$('#noaudio').classList.remove('hidden');
        playBtn.disabled = false; playBtn.style.opacity = '';
        playBtn.onclick = function () { st.auto = !capPlay; K3.store.set('auto', st.auto); capStart(!capPlay); };
        seek.disabled = false;
        seek.oninput = function () { var T = capTotal(), t = seek.value / 100 * T, i = 0; while (i < caps.length - 1 && t >= capDur(i)) { t -= capDur(i); i++; } showCap(i); textProgress(); capTick(); };
        capStart(st.auto && st.teks);
      }
      if (!src) noAudio();
      else {
        var a = st.audio = new Audio(); a.preload = 'metadata'; a.src = src; a.playbackRate = st.speed;
        a.onerror = function () { if (st.audio === a) noAudio(); };
        a.onloadedmetadata = function () {
          K3.$('#tdur').textContent = fmtT(a.duration);
          if (st.need && /otomatis/i.test(String(aturan.waktuMin || 'otomatis')) && typeof s.minDetik !== 'number') { st.need = Math.min(300, Math.max(st.need, Math.round(a.duration / st.speed * 0.9))); updateNext(); }
        };
        a.ontimeupdate = function () {
          if (!a.duration) return;
          seek.value = a.currentTime / a.duration * 100; K3.$('#tcur').textContent = fmtT(a.currentTime);
          var f = a.currentTime / a.duration * tot, i = 0; while (i < caps.length - 1 && f >= cum[i + 1]) i++; showCap(i);
        };
        a.onplay = function () { setIcon(true); };
        a.onpause = function () { setIcon(false); };
        a.onended = function () { a.onpause(); };
        playBtn.onclick = function () { if (a.paused) { a.play().catch(function () {}); st.auto = true; } else { a.pause(); st.auto = false; } K3.store.set('auto', st.auto); };
        seek.oninput = function () { if (a.duration) a.currentTime = seek.value / 100 * a.duration; };
        if (st.auto) a.play().catch(function () {});
      }
      K3.$('#speed').onchange = function () { st.speed = Number(this.value); K3.store.set('speed', st.speed); if (st.audio) st.audio.playbackRate = st.speed; else { textProgress(); capTick(); } };
      K3.$('#teks').onclick = function () { st.teks = !st.teks; K3.store.set('teks', st.teks); this.classList.toggle('on', st.teks); this.setAttribute('aria-pressed', st.teks); K3.$('#narr').classList.toggle('hidden', !st.teks); };
      K3.$('#prev').onclick = function () { if (st.i > 0) { st.i--; render(); } };
      K3.$('#next').onclick = function () {
        var c = canNext(); if (!(c.cek && c.waktu)) { updateNext(); return; }
        var gWas = gDone(gOf[st.i]);
        markDone(s);
        if (!gWas && gDone(gOf[st.i]) && st.i < n - 1 && !preview) K3.toast('Sub-materi "' + groups[gOf[st.i]].judul + '" selesai.' + (gOf[st.i + 1] !== gOf[st.i] ? ' Lanjut ke "' + groups[gOf[st.i + 1]].judul + '".' : ''));
        if (st.i < n - 1) { st.i++; render(); window.scrollTo(0, 0); }
        else {
          flush(); stopAudio();
          var all = slides.every(function (x) { return st.done[x.id]; });
          if (preview) { K3.go('#/dosen'); return; }
          K3.toast(all ? 'Materi selesai. Latihan dapat dibuka dari beranda.' : 'Masih ada slide yang belum selesai.');
          K3.go('#/');
        }
      };
    }
    function onKey(e) {
      var tag = (e.target && e.target.tagName) || '';
      if (/INPUT|SELECT|TEXTAREA|BUTTON/.test(tag)) return;
      if (e.key === 'ArrowRight') { var b = K3.$('#next'); if (b && !b.disabled) b.click(); }
      if (e.key === 'ArrowLeft') { var p = K3.$('#prev'); if (p && !p.disabled) p.click(); }
    }
    document.addEventListener('keydown', onKey);
    K3.cleanup = function () { clearInterval(st.tick); document.removeEventListener('keydown', onKey); stopAudio(); if (st.anim) st.anim.clean(); if (st.simClean) try { st.simClean(); } catch (e) {} flush(); };
    render();
  };
})(window.K3);

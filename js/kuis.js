/* Latihan & Ujian: soal acak per mahasiswa, 6 tipe soal, pembahasan, batas waktu, anti pindah tab, tanda air. */
(function (K3) {
  'use strict';
  var Q = K3.Kuis = {};
  var app = function () { return document.getElementById('app'); };
  var L = 'ABCDEFGHIJ';
  var TIPE = { PG: 'Pilihan ganda', PGK: 'PG kompleks', BS: 'Benar–Salah', JODOH: 'Menjodohkan', URUT: 'Urutan', HITUNG: 'Hitungan' };

  Q.open = function (materi, mode) {
    K3.loading('Memuat…');
    var rv = K3._rv;
    var get = K3._beranda ? Promise.resolve(K3._beranda) : K3.api('beranda');
    get.then(function (d) {
      if (K3.stale(rv)) return;
      K3._beranda = d;
      var m = d.materi.filter(function (x) { return x.id === materi; })[0];
      if (!m) throw new Error('Materi tidak ditemukan.');
      intro(m, mode, d);
    }).catch(function (e) { if (!K3.stale(rv)) K3.errorView(e, '#/'); });
  };

  function intro(m, mode, d) {
    var ujian = mode === 'ujian', s = m[mode];
    var h = K3.topbar((ujian ? 'UJIAN' : 'LATIHAN') + ' · PERTEMUAN ' + m.no, m.judul, '#/') + '<div class="wrap"><div class="card stack" style="max-width:720px">';
    h += '<h1>' + (ujian ? 'Ujian' : 'Latihan') + ' Pertemuan ' + m.no + '</h1>';
    if (ujian) {
      h += '<ul style="margin:0;padding-left:20px;line-height:1.8">' +
        (s.durasi ? '<li>Waktu <b>' + s.durasi + ' menit</b>, berjalan sejak tombol Mulai ditekan.</li>' : '') +
        '<li>Soal dan pilihan diacak berbeda untuk setiap mahasiswa.</li>' +
        '<li>Jangan berpindah tab, membuka aplikasi lain, atau mengambil tangkapan layar. Setiap kejadian dicatat sebagai pelanggaran; pada batas pelanggaran ujian dikumpulkan otomatis.</li>' +
        '<li>Jawaban tersimpan otomatis. Bila koneksi putus, buka lagi halaman ini dan pilih Lanjutkan.</li>' +
        '<li>Nama dan NIM Anda tampil sebagai tanda air di layar.</li></ul>';
    } else {
      h += '<ul style="margin:0;padding-left:20px;line-height:1.8"><li>Angka pada soal hitungan berbeda untuk setiap mahasiswa dan setiap percobaan.</li>' +
        '<li>Tekan <b>Periksa</b> pada tiap soal untuk melihat benar/salah dan pembahasan langkah demi langkah.</li>' +
        '<li>Nilai latihan diambil dari pemeriksaan pertama tiap soal. Nilai terbaik yang dipakai.</li>' +
        (s.maks ? '<li>Percobaan tersisa: <b>' + (s.maks - s.dipakai) + '</b> dari ' + s.maks + '.</li>' : '<li>Latihan boleh diulang.</li>') + '</ul>';
    }
    h += '<div id="out"></div><div class="row"><button class="btn amber" id="mulai">' + (s.berjalan ? 'Lanjutkan' : 'Mulai') + '</button><a class="btn ghost" href="#/">Kembali</a></div></div></div>';
    app().innerHTML = h;
    K3.$('#mulai').onclick = function () {
      var b = this; b.disabled = true; b.textContent = 'Menyiapkan soal…';
      var rv2 = K3._rv;
      K3.api('mulai', { materi: m.id, mode: mode }).then(function (att) { if (!K3.stale(rv2)) run(att, m, d); })
        .catch(function (e) { K3.$('#out').innerHTML = '<div class="msg err" role="alert">' + K3.esc(e.message) + '</div>'; b.disabled = false; b.textContent = 'Mulai'; });
    };
  }

  function run(att, m, d) {
    var ujian = att.mode === 'ujian';
    var backup = K3.store.get('jw_' + att.attempt) || {};
    var st = { i: 0, jw: {}, ragu: K3.store.get('rg_' + att.attempt) || {}, res: {}, timer: null, deadline: null, saveT: null, lastV: 0, selesai: false, pel: att.pelanggaran || 0 };
    Object.keys(att.jawaban || {}).forEach(function (k) { st.jw[k] = att.jawaban[k]; });
    Object.keys(backup).forEach(function (k) { if (st.jw[k] === undefined) st.jw[k] = backup[k]; });
    Object.keys(att.cek || {}).forEach(function (k) { st.res[k] = { skor: att.cek[k].skor, benar: att.cek[k].skor >= 0.999, lama: true }; });
    var soal = att.soal;
    if (att.sisaDetik !== null && att.sisaDetik !== undefined) st.deadline = Date.now() + att.sisaDetik * 1000;

    // ---------- kunci ujian ----------
    var listeners = [];
    function on(t, ev, fn, opt) { t.addEventListener(ev, fn, opt); listeners.push([t, ev, fn, opt]); }
    function violation(jenis) {
      if (st.selesai) return;
      var now = Date.now(); if (now - st.lastV < 3000) return; st.lastV = now;
      K3.api('pelanggaran', { attempt: att.attempt, jenis: jenis, jawaban: ujian ? st.jw : undefined }).then(function (r) {
        st.pel = r.pelanggaran || st.pel;
        if (r.selesai && ujian) { finish({ skor: r.skor, otomatis: true }); return; }
        var w = K3.$('#warn');
        if (!w) return;
        w.classList.remove('hidden');
        w.innerHTML = ujian
          ? '<b>Peringatan ' + st.pel + (r.batas ? ' dari ' + r.batas : '') + ':</b> ' + K3.esc(jenis) + ' tercatat. ' + (r.batas ? 'Pada pelanggaran ke-' + r.batas + ', ujian dikumpulkan otomatis.' : '')
          : '<b>Pelanggaran latihan ke-' + st.pel + ':</b> ' + K3.esc(jenis) + '. Tercatat di laporan dosen.';
      }).catch(function () {});
    }
    // Proteksi berlaku untuk LATIHAN dan UJIAN. Pelanggaran hanya dicatat & berakibat pada ujian.
    function protect() {
      document.body.classList.add('examining');
      var wm = document.createElement('div'); wm.id = 'wm'; wm.setAttribute('aria-hidden', 'true');
      var txt = K3.esc(att.watermark + ' · ' + (d.mhs.nama || '').split(' ')[0]);
      wm.innerHTML = new Array(73).join('<span>' + txt + '</span>');
      document.body.appendChild(wm);
      var shield = document.createElement('div'); shield.id = 'shield'; shield.className = 'hidden';
      shield.innerHTML = '<div><div style="font-size:20px;margin-bottom:8px">Konten disembunyikan</div><div style="font-weight:500;font-size:15px;color:#D5DAE1">Tangkapan layar, salin, dan berpindah aplikasi tidak diizinkan' + (ujian ? ' dan dicatat sebagai pelanggaran' : '') + '.<br>Kembali ke halaman ini untuk melanjutkan.</div></div>';
      document.body.appendChild(shield);
      var hideT = null, held = false;
      function hide(ms) { shield.classList.remove('hidden'); clearTimeout(hideT); if (ms) hideT = setTimeout(function () { if (!held && document.hasFocus() && !document.hidden) shield.classList.add('hidden'); }, ms); }
      function showIfFocused() { if (!held && document.hasFocus() && !document.hidden) { clearTimeout(hideT); hideT = setTimeout(function () { if (!held && document.hasFocus() && !document.hidden) shield.classList.add('hidden'); }, 350); } }
      function warnLatihan(msg) { if (!ujian) K3.toast(msg); }
      // 1) pindah tab / aplikasi (HP & laptop)
      on(document, 'visibilitychange', function () {
        if (document.hidden) { hide(); violation('Meninggalkan halaman ' + (ujian ? 'ujian' : 'latihan')); }
        else showIfFocused();
      });
      // 2) jendela kehilangan fokus: alat potong layar, aplikasi tangkap layar, jendela lain
      on(window, 'blur', function () { hide(); setTimeout(function () { if (!document.hidden && !document.hasFocus()) violation('Berpindah ke jendela/aplikasi lain'); }, 300); });
      on(window, 'focus', showIfFocused);
      st.focusPoll = setInterval(function () { if (!document.hasFocus() || document.hidden) hide(); else if (!held) showIfFocused(); }, 400);
      // 3) tombol & pintasan tangkap layar / salin / cetak / simpan / sumber
      on(document, 'keydown', function (e) {
        var k = (e.key || '').toLowerCase(), c = e.ctrlKey || e.metaKey;
        var shot = k === 'printscreen' || k === 'snapshot' || (e.metaKey && e.shiftKey) || (c && e.shiftKey && /^[345s]$/.test(k));
        var sysKey = k === 'meta' || k === 'os' || k === 'audiovolumedown' || k === 'volumedown' || k === 'power';
        var blocked = c && /^[acvxpsu]$/.test(k) || k === 'f12' || (c && e.shiftKey && /^[ijc]$/.test(k));
        if (shot || sysKey) { held = true; hide(); }
        if (shot) { e.preventDefault(); violation('Percobaan tangkapan layar'); warnLatihan('Tangkapan layar tidak diizinkan.'); }
        else if (blocked) { e.preventDefault(); if (/^[cxv]$/.test(k)) warnLatihan('Salin dan tempel tidak diizinkan.'); if (k === 'p') violation('Percobaan mencetak'); }
      }, true);
      on(document, 'keyup', function (e) {
        var k = (e.key || '').toLowerCase();
        if (k === 'printscreen' || k === 'snapshot') { hide(2000); violation('Percobaan tangkapan layar'); try { navigator.clipboard.writeText('Tangkapan layar tidak diizinkan'); } catch (x) {} }
        if (!e.metaKey && !e.shiftKey) { held = false; hide(1200); }
      }, true);
      // 4) salin, potong, tempel, seret, pilih teks, menu klik kanan / tekan lama
      ['copy', 'cut', 'paste', 'drop', 'dragstart', 'selectstart', 'contextmenu'].forEach(function (ev) {
        on(document, ev, function (e) {
          var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
          if (ev === 'selectstart' && typing) return; // tetap boleh mengetik jawaban
          e.preventDefault();
          if (ev === 'copy' || ev === 'cut' || ev === 'paste') warnLatihan('Salin dan tempel tidak diizinkan.');
        }, true);
      });
      on(document, 'beforeinput', function (e) { if (/^insertFrom(Paste|Drop|Yank)/.test(e.inputType || '')) e.preventDefault(); }, true);
      // 5) gerakan tangkap layar tiga jari (banyak HP Android)
      on(document, 'touchstart', function (e) { if (e.touches && e.touches.length >= 3) { e.preventDefault(); held = true; hide(); violation('Gerakan tangkapan layar tiga jari'); } }, { passive: false, capture: true });
      on(document, 'touchend', function (e) { if (held && (!e.touches || e.touches.length === 0)) { held = false; hide(1500); } }, true);
      // 6) cetak
      on(window, 'beforeprint', function () { hide(); violation('Percobaan mencetak'); });
      on(window, 'afterprint', function () { hide(800); });
      if (ujian) on(window, 'beforeunload', function (e) { if (!st.selesai) { saveNow(); e.preventDefault(); e.returnValue = ''; } });
    }
    function unlock() {
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); }); listeners = [];
      document.body.classList.remove('examining');
      ['wm', 'shield'].forEach(function (id) { var x = document.getElementById(id); if (x) x.remove(); });
      clearInterval(st.timer); clearInterval(st.focusPoll); clearTimeout(st.saveT);
    }
    K3.cleanup = function () { if (!st.selesai) saveNow(); unlock(); };

    // ---------- simpan ----------
    function saveNow() {
      K3.store.set('jw_' + att.attempt, st.jw);
      if (!ujian || st.selesai) return;
      K3.api('simpan', { attempt: att.attempt, jawaban: st.jw }).then(function (r) {
        var s = K3.$('#saved'); if (s) s.textContent = r.selesai ? 'Ujian sudah selesai' : 'Tersimpan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }).catch(function () { var s = K3.$('#saved'); if (s) s.textContent = 'Belum tersimpan (koneksi). Mencoba lagi…'; });
    }
    function changed(id, val) {
      st.jw[id] = val; K3.store.set('jw_' + att.attempt, st.jw);
      clearTimeout(st.saveT); st.saveT = setTimeout(saveNow, 1500);
      updateNav();
    }

    // ---------- tampilan ----------
    function answered(q) {
      var v = st.jw[q.id];
      if (v === undefined || v === null || v === '') return false;
      if (q.tipe === 'PGK') return v.length > 0;
      if (q.tipe === 'BS') return v.filter(Boolean).length === q.pernyataan.length;
      if (q.tipe === 'JODOH') return v.filter(function (x) { return x !== '' && x !== null; }).length === q.kiri.length;
      if (q.tipe === 'HITUNG') return String(v.nilai || '').trim() !== '';
      return true;
    }
    function navHtml() {
      return soal.map(function (q, j) {
        var c = j === st.i ? 'cur' : (!ujian && st.res[q.id]) ? (st.res[q.id].benar ? 'ok' : 'no') : answered(q) ? 'ans' : '';
        if (st.ragu[q.id]) c += ' flag';
        return '<button type="button" class="' + c + '" data-j="' + j + '" aria-label="Soal ' + (j + 1) + (answered(q) ? ', dijawab' : ', belum dijawab') + (st.ragu[q.id] ? ', ragu' : '') + '">' + (j + 1) + '</button>';
      }).join('');
    }
    function updateNav() {
      var g = K3.$('#navgrid'); if (!g) return;
      g.innerHTML = navHtml(); bindNav();
      var c = K3.$('#cnt'); if (c) c.textContent = soal.filter(answered).length + ' dari ' + soal.length + ' dijawab';
    }
    function bindNav() { K3.$$('#navgrid button').forEach(function (b) { b.onclick = function () { st.i = Number(b.getAttribute('data-j')); renderQ(); }; }); }

    function shell() {
      var h = '<header class="topbar"><div class="t"><span class="k">' + (ujian ? 'UJIAN' : 'LATIHAN') + ' · PERTEMUAN ' + m.no + '</span><span class="h">' + K3.esc(m.judul) + '</span></div>';
      if (st.deadline) h += '<div class="timer" id="timer" role="timer" aria-label="Sisa waktu">' + K3.icon.clock + '<span id="clock">--:--</span></div>';
      if (!ujian) h += '<a href="#/">' + K3.icon.back + 'Beranda</a>';
      h += '</header><div id="warn" class="msg warn hidden" role="alert" style="border-radius:0"></div>';
      h += '<div class="wrap exam"><div class="qlayout"><section class="qmain" id="qmain"></section><aside class="qside">' +
        '<div class="card stack"><div class="row" style="justify-content:space-between"><h3>Navigasi soal</h3><span class="small muted" id="cnt"></span></div><div class="navgrid" id="navgrid"></div>' +
        (ujian ? '<div class="small muted" id="saved">Jawaban tersimpan otomatis.</div>' : '') + '</div>' +
        '<button class="btn" id="kumpul" type="button">' + (ujian ? 'Kumpulkan ujian' : 'Selesai latihan') + '</button>' +
        '<div id="konfirm"></div></aside></div></div>';
      app().innerHTML = h;
      if (st.pel && ujian) { var w = K3.$('#warn'); w.classList.remove('hidden'); w.innerHTML = '<b>Pelanggaran tercatat: ' + st.pel + (att.batasPelanggaran ? ' dari ' + att.batasPelanggaran : '') + '.</b>'; }
      K3.$('#kumpul').onclick = askSubmit;
      updateNav();
    }

    function renderQ() {
      var q = soal[st.i], v = st.jw[q.id], res = st.res[q.id], locked = !ujian && !!res;
      var h = '<div class="card stack"><div class="row"><span class="chip blue">SOAL ' + (st.i + 1) + ' DARI ' + soal.length + ' · ' + TIPE[q.tipe].toUpperCase() + '</span><span class="chip">' + K3.esc(q.level) + '</span>' +
        (ujian ? '<button type="button" class="btn sm ghost" id="ragu" style="margin-left:auto" aria-pressed="' + !!st.ragu[q.id] + '">' + (st.ragu[q.id] ? 'Batalkan ragu' : 'Tandai ragu') + '</button>' : '') + '</div>';
      if (q.kasusTeks) h += '<details class="kasus" open><summary>Studi kasus · ' + K3.esc(q.kasusTeks.judul) + '</summary><div>' + q.kasusTeks.teks + '</div></details>';
      h += '<div class="qtext">' + q.soal + '</div><div id="ans" class="stack">';
      if (q.tipe === 'PG' || q.tipe === 'PGK') {
        if (q.tipe === 'PGK') h += '<div class="small muted">Pilih semua jawaban yang benar.</div>';
        h += '<div class="stack" role="' + (q.tipe === 'PG' ? 'radiogroup' : 'group') + '" aria-label="Pilihan jawaban">';
        q.opsi.forEach(function (o, j) {
          var sel = q.tipe === 'PG' ? Number(v) === j && v !== undefined && v !== '' : (v || []).indexOf(j) >= 0;
          h += '<button type="button" class="opt' + (sel ? ' sel' : '') + '" data-o="' + j + '" role="' + (q.tipe === 'PG' ? 'radio' : 'checkbox') + '" aria-checked="' + sel + '"' + (locked ? ' disabled' : '') + '><b style="margin-right:8px">' + L[j] + '.</b>' + o + '</button>';
        });
        h += '</div>';
      } else if (q.tipe === 'BS') {
        q.pernyataan.forEach(function (p, j) {
          var val = (v || [])[j];
          h += '<div class="bsrow"><div class="s">' + (j + 1) + '. ' + p + '</div><div class="seg" role="radiogroup" aria-label="Pernyataan ' + (j + 1) + '">' +
            '<button type="button" role="radio" aria-checked="' + (val === 'B') + '" class="' + (val === 'B' ? 'on' : '') + '" data-bs="' + j + '" data-v="B"' + (locked ? ' disabled' : '') + '>Benar</button>' +
            '<button type="button" role="radio" aria-checked="' + (val === 'S') + '" class="' + (val === 'S' ? 'on' : '') + '" data-bs="' + j + '" data-v="S"' + (locked ? ' disabled' : '') + '>Salah</button></div></div>';
        });
      } else if (q.tipe === 'JODOH') {
        h += '<div class="small muted">Pilih pasangan yang tepat untuk setiap butir. Ada pilihan yang tidak terpakai.</div>';
        q.kiri.forEach(function (l, j) {
          var val = (v || [])[j];
          h += '<div class="jrow"><label class="l" for="jd' + j + '">' + l + '</label><select class="inp" id="jd' + j + '" data-jd="' + j + '"' + (locked ? ' disabled' : '') + '><option value="">Pilih pasangan…</option>';
          q.kanan.forEach(function (r, k) { h += '<option value="' + k + '"' + (String(val) === String(k) ? ' selected' : '') + '>' + L[k] + '. ' + r.replace(/<[^>]+>/g, '') + '</option>'; });
          h += '</select></div>';
        });
      } else if (q.tipe === 'URUT') {
        var ord = Array.isArray(v) ? v : q.item.map(function (_, j) { return j; });
        h += '<div class="small muted">Gunakan tombol ▲ ▼ untuk mengurutkan, lalu tekan "Tetapkan urutan".</div>';
        ord.forEach(function (idx, pos) {
          h += '<div class="urow"><span class="n">' + (pos + 1) + '</span><div class="s">' + q.item[idx] + '</div>' +
            '<button type="button" class="ub" data-up="' + pos + '" aria-label="Naikkan"' + (pos === 0 || locked ? ' disabled' : '') + '>▲</button>' +
            '<button type="button" class="ub" data-dn="' + pos + '" aria-label="Turunkan"' + (pos === ord.length - 1 || locked ? ' disabled' : '') + '>▼</button></div>';
        });
        if (!locked) h += '<div><button type="button" class="btn sm ghost" id="tetap">' + (Array.isArray(v) ? 'Urutan sudah ditetapkan ✓' : 'Tetapkan urutan') + '</button></div>';
      } else if (q.tipe === 'HITUNG') {
        var vv = v || {};
        h += '<div class="row" style="align-items:flex-end"><label class="f" style="flex:1 1 200px">Jawaban<input class="inp" id="hval" inputmode="decimal" autocomplete="off" value="' + K3.esc(vv.nilai || '') + '"' + (locked ? ' disabled' : '') + '></label>';
        if (q.satuan && q.satuan.length > 1) {
          h += '<label class="f" style="width:130px">Satuan<select class="inp" id="hsat"' + (locked ? ' disabled' : '') + '>' + q.satuan.map(function (u) { return '<option' + ((vv.satuan || q.satuan[0]) === u ? ' selected' : '') + '>' + K3.esc(u) + '</option>'; }).join('') + '</select></label>';
        } else if (q.satuan && q.satuan.length) h += '<div style="font-weight:800;padding-bottom:12px">' + K3.esc(q.satuan[0]) + '</div>';
        h += '</div><div class="small muted">Gunakan koma untuk desimal (contoh 0,25). Toleransi ±' + K3.esc(String(q.toleransi).replace('.', ',')) + '%.</div>';
      }
      h += '</div>';
      if (!ujian) {
        if (res) {
          h += '<div class="msg ' + (res.benar ? 'ok' : res.skor > 0 ? 'warn' : 'err') + '" role="status"><b>' + (res.benar ? 'Benar.' : res.skor > 0 ? 'Sebagian benar (' + Math.round(res.skor * 100) + '%).' : 'Belum tepat.') + '</b>' +
            (res.kunci ? ' Kunci: ' + K3.esc(res.kunci) : '') + (res.lama ? ' (sudah diperiksa sebelumnya)' : '') + '</div>';
          if (res.pembahasan && res.pembahasan.length) h += '<div class="pemb"><h3>Pembahasan langkah demi langkah</h3><ol>' + res.pembahasan.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ol></div>';
        } else h += '<div><button type="button" class="btn" id="periksa">Periksa</button></div>';
      }
      h += '<div class="row" style="justify-content:space-between"><button type="button" class="btn ghost" id="qprev"' + (st.i === 0 ? ' disabled' : '') + '>Soal ' + st.i + '</button>' +
        (st.i < soal.length - 1 ? '<button type="button" class="btn amber" id="qnext">Soal ' + (st.i + 2) + '</button>' : '<button type="button" class="btn amber" id="qend">' + (ujian ? 'Kumpulkan' : 'Selesai') + '</button>') + '</div></div>';
      K3.$('#qmain').innerHTML = h;
      bindQ(q);
      updateNav();
    }

    function bindQ(q) {
      var v = st.jw[q.id];
      K3.$$('#ans [data-o]').forEach(function (b) {
        b.onclick = function () {
          var j = Number(b.getAttribute('data-o'));
          if (q.tipe === 'PG') changed(q.id, j);
          else { var a = (st.jw[q.id] || []).slice(); var p = a.indexOf(j); if (p >= 0) a.splice(p, 1); else a.push(j); a.sort(); changed(q.id, a); }
          renderQ();
        };
      });
      K3.$$('#ans [data-bs]').forEach(function (b) {
        b.onclick = function () { var a = (st.jw[q.id] || q.pernyataan.map(function () { return ''; })).slice(); a[Number(b.getAttribute('data-bs'))] = b.getAttribute('data-v'); changed(q.id, a); renderQ(); };
      });
      K3.$$('#ans [data-jd]').forEach(function (s) {
        s.onchange = function () { var a = (st.jw[q.id] || q.kiri.map(function () { return ''; })).slice(); a[Number(s.getAttribute('data-jd'))] = s.value === '' ? '' : Number(s.value); changed(q.id, a); };
      });
      function curOrd() { return Array.isArray(st.jw[q.id]) ? st.jw[q.id].slice() : q.item.map(function (_, j) { return j; }); }
      K3.$$('#ans [data-up]').forEach(function (b) { b.onclick = function () { var o = curOrd(), p = Number(b.getAttribute('data-up')); var t = o[p - 1]; o[p - 1] = o[p]; o[p] = t; changed(q.id, o); renderQ(); }; });
      K3.$$('#ans [data-dn]').forEach(function (b) { b.onclick = function () { var o = curOrd(), p = Number(b.getAttribute('data-dn')); var t = o[p + 1]; o[p + 1] = o[p]; o[p] = t; changed(q.id, o); renderQ(); }; });
      var tp = K3.$('#tetap'); if (tp) tp.onclick = function () { changed(q.id, curOrd()); renderQ(); };
      var hv = K3.$('#hval'), hs = K3.$('#hsat');
      function hset() { changed(q.id, { nilai: hv.value, satuan: hs ? hs.value : (q.satuan && q.satuan[0]) || '' }); }
      if (hv) { hv.oninput = hset; if (hs) hs.onchange = hset; }
      var rg = K3.$('#ragu'); if (rg) rg.onclick = function () { st.ragu[q.id] = !st.ragu[q.id]; K3.store.set('rg_' + att.attempt, st.ragu); renderQ(); };
      var pr = K3.$('#periksa');
      if (pr) pr.onclick = function () {
        if (!answered(q)) { K3.toast('Jawab soal ini dulu.'); return; }
        pr.disabled = true; pr.textContent = 'Memeriksa…';
        K3.api('cek', { attempt: att.attempt, soal: q.id, jawaban: st.jw[q.id] }).then(function (r) { st.res[q.id] = r; renderQ(); })
          .catch(function (e) { K3.toast(e.message); pr.disabled = false; pr.textContent = 'Periksa'; });
      };
      K3.$('#qprev').onclick = function () { if (st.i > 0) { st.i--; renderQ(); } };
      var nx = K3.$('#qnext'); if (nx) nx.onclick = function () { st.i++; renderQ(); };
      var en = K3.$('#qend'); if (en) en.onclick = askSubmit;
    }

    function askSubmit() {
      var kosong = soal.filter(function (q) { return !answered(q); }).length;
      var belumCek = ujian ? 0 : soal.filter(function (q) { return !st.res[q.id]; }).length;
      var ragu = Object.keys(st.ragu).filter(function (k) { return st.ragu[k]; }).length;
      var notes = [];
      if (kosong) notes.push(kosong + ' soal belum dijawab');
      if (belumCek) notes.push(belumCek + ' soal belum diperiksa (dinilai saat dikumpulkan)');
      if (ragu) notes.push(ragu + ' soal ditandai ragu');
      K3.$('#konfirm').innerHTML = '<div class="card stack" role="alertdialog" aria-labelledby="kfh"><h3 id="kfh">' + (ujian ? 'Kumpulkan ujian sekarang?' : 'Selesaikan latihan?') + '</h3>' +
        (notes.length ? '<div class="msg warn">' + K3.esc(notes.join('; ')) + '.</div>' : '<div class="small muted">Semua soal sudah dijawab.</div>') +
        '<div class="row"><button class="btn" id="yaKumpul" type="button">Ya, kumpulkan</button><button class="btn ghost" id="batal" type="button">Batal</button></div></div>';
      K3.$('#batal').onclick = function () { K3.$('#konfirm').innerHTML = ''; };
      K3.$('#yaKumpul').onclick = function () { this.disabled = true; this.textContent = 'Mengirim…'; submit(); };
      K3.$('#yaKumpul').focus();
    }
    function submit() {
      clearTimeout(st.saveT);
      K3.api('kumpul', { attempt: att.attempt, jawaban: st.jw }).then(function (r) { finish(r); })
        .catch(function (e) { K3.toast(e.message); var b = K3.$('#yaKumpul'); if (b) { b.disabled = false; b.textContent = 'Coba kirim lagi'; } });
    }
    function finish(r) {
      if (st.selesai) return;
      st.selesai = true; unlock(); K3.cleanup = null; K3._beranda = null;
      K3.store.del('jw_' + att.attempt); K3.store.del('rg_' + att.attempt);
      var h = K3.topbar((ujian ? 'UJIAN' : 'LATIHAN') + ' · PERTEMUAN ' + m.no, m.judul, '#/') + '<div class="wrap stack"><div class="card stack" style="max-width:760px">';
      h += '<h1>' + (ujian ? 'Ujian terkumpul' : 'Latihan selesai') + '</h1>';
      if (r.otomatis) h += '<div class="msg warn">Ujian dikumpulkan otomatis karena batas pelanggaran tercapai.</div>';
      if (r.waktuHabis) h += '<div class="msg warn">Waktu habis. Jawaban terakhir yang tersimpan sudah dikumpulkan.</div>';
      if (r.skor !== null && r.skor !== undefined) h += '<div style="font-size:44px;font-weight:800;line-height:1">' + K3.num(r.skor) + '<span class="muted" style="font-size:18px"> / 100</span></div>';
      else h += '<p>Jawaban Anda sudah diterima. Nilai diumumkan dosen.</p>';
      if (ujian && r.lulus !== undefined) h += r.lulus
        ? '<div class="msg ok"><b>Modul lulus.</b> Modul berikutnya terbuka (bila sudah dijadwalkan dosen).</div>'
        : '<div class="msg warn"><b>Belum lulus modul.</b> Nilai ujian minimal ' + r.ambang + '. Pelajari lagi materi dan latihan, lalu ulangi ujian bila percobaan masih tersedia.</div>';
      h += '<div class="row"><a class="btn" href="#/">Kembali ke beranda</a>' + (!ujian ? '<a class="btn ghost" href="#/latihan/' + m.id + '" id="ulangi">Latihan lagi</a>' : '') + '</div></div>';
      if (r.rinci && r.rinci.length) {
        h += '<div class="card stack" style="max-width:760px"><h2>Rincian dan pembahasan</h2>';
        r.rinci.forEach(function (x) {
          var q = soal.filter(function (s) { return s.id === x.id; })[0], n = soal.indexOf(q) + 1;
          h += '<details class="pemb"><summary><b>Soal ' + n + '</b> · ' + (x.benar ? '<span style="color:var(--green);font-weight:700">Benar</span>' : x.skor > 0 ? 'Sebagian (' + Math.round(x.skor * 100) + '%)' : '<span style="color:var(--red);font-weight:700">Salah</span>') + '</summary>' +
            '<div class="small" style="margin-top:8px">' + (q ? q.soal : '') + '</div><div class="small" style="margin-top:6px"><b>Kunci:</b> ' + K3.esc(x.kunci) + '</div>' +
            (x.pembahasan && x.pembahasan.length ? '<ol class="small">' + x.pembahasan.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ol>' : '') + '</details>';
        });
        h += '</div>';
      }
      h += '</div>';
      app().innerHTML = h;
      var ul = K3.$('#ulangi'); if (ul) ul.onclick = function (e) { e.preventDefault(); K3._beranda = null; Q.open(m.id, 'latihan'); };
    }

    // ---------- mulai ----------
    shell();
    renderQ();
    protect();
    if (st.deadline) {
      var tick = function () {
        var left = Math.max(0, Math.round((st.deadline - Date.now()) / 1000));
        var c = K3.$('#clock'); if (c) c.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
        var t = K3.$('#timer'); if (t) t.classList.toggle('low', left <= 300);
        if (left <= 0 && !st.selesai) {
          clearInterval(st.timer);
          K3.api('kumpul', { attempt: att.attempt, jawaban: st.jw, waktuHabis: true }).then(function (r) { r.waktuHabis = true; finish(r); }).catch(function (e) { K3.toast(e.message); });
        }
      };
      tick(); st.timer = setInterval(tick, 1000);
    }
  }
})(window.K3);

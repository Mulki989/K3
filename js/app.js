/* Kuliah K3 Interaktif — inti aplikasi, masuk, beranda, tugas, nilai. */
var K3 = window.K3 || {};
(function (K3) {
  'use strict';
  var app = function () { return document.getElementById('app'); };

  // ---------- util ----------
  K3.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  K3.$ = function (sel, root) { return (root || document).querySelector(sel); };
  K3.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  K3.toast = function (msg, ms) {
    var t = document.getElementById('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(K3._tt); K3._tt = setTimeout(function () { t.classList.add('hidden'); }, ms || 3200);
  };
  K3.fmtTgl = function (iso) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d)) return iso;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };
  K3.num = function (x, d) { return x === null || x === undefined || x === '' ? '–' : Number(x).toLocaleString('id-ID', { maximumFractionDigits: d === undefined ? 1 : d }); };
  K3.loading = function (msg) { app().innerHTML = '<div class="loading"><div class="spinner"></div>' + K3.esc(msg || 'Memuat…') + '</div>'; };
  K3.go = function (h) { if (location.hash === h) K3.route(); else location.hash = h; };
  K3.icon = {
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    shield: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#17202B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7l8-4z"/><path d="M9 12l2 2 4-4"/></svg>',
    play: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    lock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    clock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>'
  };

  // ---------- penyimpanan sesi ----------
  K3.store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('k3_' + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('k3_' + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem('k3_' + k); } catch (e) {} }
  };

  // ---------- API ----------
  K3.api = function (action, data, opt) {
    opt = opt || {};
    var body = { action: action };
    for (var k in (data || {})) body[k] = data[k];
    if (body.token === undefined) body.token = opt.dosen ? K3.store.get('dtoken') : K3.store.get('token');
    var url = window.API_URL;
    var p;
    if (url === 'PREVIEW') {
      p = new Promise(function (res) { setTimeout(function () { res(window.PreviewBackend.handle(body)); }, 120); });
    } else {
      var attempt = function (n) {
        return fetch(url, { method: 'POST', body: JSON.stringify(body), redirect: 'follow' })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .catch(function (e) { if (n > 0) return new Promise(function (r) { setTimeout(r, 900); }).then(function () { return attempt(n - 1); }); throw new Error('Koneksi ke server gagal. Periksa internet lalu coba lagi.'); });
      };
      p = attempt(opt.noRetry ? 0 : 1);
    }
    return p.then(function (res) {
      if (res && res.ok) return res.data;
      var e = new Error((res && res.error) || 'Terjadi kesalahan.'); e.code = res && res.code;
      if (e.code === 'SESI') {
        if (opt.dosen) { K3.store.del('dtoken'); setTimeout(function () { K3.go('#/dosen'); }, 50); }
        else { K3.store.del('token'); setTimeout(function () { K3.go('#/masuk'); }, 50); }
      }
      throw e;
    });
  };

  // ---------- registrasi materi (dipanggil oleh m01.js dst) ----------
  K3._materi = {};
  K3.materi = function (def) { K3._materi[def.id] = def; return def; };

  // ---------- router ----------
  K3._rv = 0;
  // Penanda rute: respons API yang terlambat tidak boleh menimpa halaman yang sudah berganti.
  K3.stale = function (rv) { return rv !== K3._rv; };
  K3.route = function () {
    K3._rv++;
    if (K3.cleanup) { try { K3.cleanup(); } catch (e) {} K3.cleanup = null; }
    window.scrollTo(0, 0);
    var h = location.hash || '#/';
    var m;
    if (!window.API_URL) return K3.noConfig();
    if (h === '#/reset' && window.PreviewBackend) {
      window.PreviewBackend.reset();
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf('k3_') === 0) localStorage.removeItem(k); });
      K3.toast('Data pratinjau dikosongkan.'); location.hash = '#/'; return;
    }
    if (h.indexOf('#/dosen') === 0) return K3.Dosen.open(h);
    if (!K3.store.get('token')) return K3.loginView();
    if ((m = /^#\/materi\/(\w+)/.exec(h))) return K3.Player.open(m[1]);
    if ((m = /^#\/(latihan|ujian)\/(\w+)/.exec(h))) return K3.Kuis.open(m[2], m[1]);
    if (h === '#/tugas') return K3.tugasView();
    if (h === '#/nilai') return K3.nilaiView();
    return K3.berandaView();
  };
  K3.start = function () {
    window.addEventListener('hashchange', K3.route);
    K3.route();
  };
  K3.noConfig = function () {
    app().innerHTML = '<div class="wrap"><div class="card stack"><h1>Aplikasi belum terhubung</h1>' +
      '<p>File <b>config.js</b> belum ada atau <b>API_URL</b> kosong. Salin <b>config.example.js</b> menjadi <b>config.js</b>, lalu isi API_URL dengan URL Web App Apps Script Anda. Lihat PANDUAN langkah 5.</p></div></div>';
  };

  // ---------- masuk ----------
  K3.loginView = function () {
    var st = { step: 1, nim: K3.store.get('nim') || '', nama: '', kelas: K3.store.get('kelas') || '', mode: '' };
    function hero() {
      return '<div class="hero"><div class="row" style="gap:10px"><div class="logo">' + K3.icon.shield + '</div><div><div class="small" style="color:var(--amber);font-weight:700;letter-spacing:.04em">TEKNIK ELEKTRO</div>' +
        '<div style="font-size:18px;font-weight:800">Kuliah K3 Interaktif</div></div></div>' +
        '<div class="small" style="color:#D5DAE1">Kesehatan dan Keselamatan Kerja</div></div>';
    }
    function render(msg) {
      var h = '<div class="login">' + hero() + '<div class="stack" style="padding:22px">';
      h += '<div class="steps"><i class="on"></i><i class="' + (st.step === 2 ? 'on' : '') + '"></i></div>';
      if (msg) h += '<div class="msg err" role="alert">' + K3.esc(msg) + '</div>';
      if (st.step === 1) {
        h += '<h1>Masuk</h1><p class="muted small" style="margin:0">Pertama kali? Isi NIM, nama lengkap, dan kode kelas, lalu buat PIN sendiri.</p>' +
          '<form id="f1" class="stack" autocomplete="on">' +
          '<label class="f">NIM<input class="inp" id="nim" inputmode="numeric" autocomplete="username" required value="' + K3.esc(st.nim) + '"></label>' +
          '<label class="f">Nama lengkap<input class="inp" id="nama" autocomplete="name" value="' + K3.esc(st.nama) + '"></label>' +
          '<label class="f">Kode kelas<input class="inp" id="kelas" style="text-transform:uppercase;letter-spacing:.08em" value="' + K3.esc(st.kelas) + '"><span class="muted" style="font-weight:500;font-size:12px">Diberikan dosen di pertemuan pertama.</span></label>' +
          '<button class="btn" type="submit" id="lanjut">Lanjut</button></form>' +
          '<p class="muted small" style="margin:0;text-align:center">Sudah pernah masuk? Cukup isi NIM, lalu PIN.</p>' +
          '<p class="small" style="margin:8px 0 0;text-align:center"><a href="#/dosen">Masuk sebagai dosen</a></p>';
      } else if (st.mode === 'buat') {
        h += '<h1>Buat PIN</h1><p class="muted small" style="margin:0">Halo, ' + K3.esc(st.nama) + '. PIN 6 angka ini dipakai setiap kali masuk. Jangan berikan kepada orang lain.</p>' +
          '<form id="f2" class="stack"><label class="f">PIN baru (6 angka)<input class="inp pin" id="pin1" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" required></label>' +
          '<label class="f">Ulangi PIN<input class="inp pin" id="pin2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" required></label>' +
          '<button class="btn" type="submit">Simpan PIN dan masuk</button><button class="btn ghost" type="button" id="kembali">Kembali</button></form>';
      } else {
        h += '<h1>Masukkan PIN</h1><p class="muted small" style="margin:0">' + K3.esc(st.nama) + ' · ' + K3.esc(st.nim) + '</p>' +
          '<form id="f3" class="stack"><label class="f">PIN<input class="inp pin" id="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password" required></label>' +
          '<button class="btn" type="submit">Masuk</button><button class="btn ghost" type="button" id="kembali">Ganti NIM</button>' +
          '<p class="muted small" style="margin:0">Lupa PIN? Minta dosen melakukan Reset PIN, lalu buat PIN baru.</p></form>';
      }
      h += '</div></div>';
      app().innerHTML = h;
      var f1 = K3.$('#f1'), f2 = K3.$('#f2'), f3 = K3.$('#f3'), kb = K3.$('#kembali');
      if (kb) kb.onclick = function () { st.step = 1; render(); };
      if (f1) { K3.$(st.nim ? '#nama' : '#nim').focus(); f1.onsubmit = function (e) {
        e.preventDefault();
        st.nim = K3.$('#nim').value.trim(); st.nama = K3.$('#nama').value.trim(); st.kelas = K3.$('#kelas').value.trim().toUpperCase();
        var b = K3.$('#lanjut'); b.disabled = true; b.textContent = 'Memeriksa…';
        K3.api('masuk', { nim: st.nim, nama: st.nama, kelas: st.kelas }).then(function (r) {
          st.nama = r.nama; st.step = 2; st.mode = r.status === 'buat_pin' ? 'buat' : 'pin'; render();
          K3.$(st.mode === 'buat' ? '#pin1' : '#pin').focus();
        }).catch(function (e) { render(e.message); });
      }; }
      if (f2) f2.onsubmit = function (e) {
        e.preventDefault();
        var a = K3.$('#pin1').value, b = K3.$('#pin2').value;
        if (!/^\d{6}$/.test(a)) return render('PIN harus 6 angka.');
        if (a !== b) return render('PIN dan ulangan PIN belum sama.');
        K3.api('buatPin', { nim: st.nim, kelas: st.kelas, pin: a }).then(done).catch(function (e) { render(e.message); });
      };
      if (f3) f3.onsubmit = function (e) {
        e.preventDefault();
        K3.api('masuk', { nim: st.nim, kelas: st.kelas, pin: K3.$('#pin').value }).then(done).catch(function (e) { render(e.message); });
      };
    }
    function done(r) {
      K3.store.set('token', r.token); K3.store.set('nim', st.nim); K3.store.set('kelas', r.kelas);
      K3.go('#/');
    }
    render();
  };
  K3.keluar = function () { K3.store.del('token'); K3.go('#/masuk'); };

  // ---------- beranda ----------
  K3.topbar = function (kicker, title, back) {
    return '<header class="topbar">' + (back ? '<a href="' + back + '">' + K3.icon.back + 'Beranda</a>' : '') +
      '<div class="t"><span class="k">' + K3.esc(kicker) + '</span><span class="h">' + K3.esc(title) + '</span></div>' +
      (back ? '' : '<button class="link" id="keluar" type="button">Keluar</button>') + '</header>';
  };
  K3.berandaView = function () {
    K3.loading('Memuat beranda…');
    var rv = K3._rv;
    K3.api('beranda').then(function (d) {
      K3._beranda = d;
      if (K3.stale(rv)) return;
      var selesai = d.materi.filter(function (m) { return m.lulus; }).length;
      var h = K3.topbar(d.mhs.nim + ' · ' + d.mhs.kelas, 'Halo, ' + d.mhs.nama) + '<div class="wrap stack">';
      h += '<div class="card stack"><div class="row" style="justify-content:space-between"><h2>' + K3.esc(d.mk) + '</h2><span class="chip amber">' + selesai + ' dari ' + d.materi.length + ' modul lulus</span></div>' +
        '<div class="bar" aria-hidden="true"><i style="width:' + Math.round(selesai / Math.max(1, d.materi.length) * 100) + '%"></i></div>' +
        '<div class="tabs"><a class="tab on" href="#/">Materi</a><a class="tab" href="#/tugas" style="display:inline-flex;align-items:center;text-decoration:none;color:inherit">Tugas (' + d.tugas.length + ')</a><a class="tab" href="#/nilai" style="display:inline-flex;align-items:center;text-decoration:none;color:inherit">Nilai saya</a></div></div>';
      if (d.prasyarat) h += '<div class="msg warn small" style="margin:0">Alur setiap modul: <b>1. selesaikan semua slide</b> → <b>2. kerjakan latihan</b> → <b>3. ujian minimal ' + d.ambang + '</b>. Modul berikutnya terbuka setelah modul sebelumnya lulus.</div>';
      h += '<div class="card" style="padding:0"><div class="mlist">';
      d.materi.forEach(function (m) {
        var cls = m.lulus ? 'done' : m.terbuka ? 'on' : '';
        var step = function (ok, label) { return '<span class="chip ' + (ok ? 'green' : '') + '">' + (ok ? '✓ ' : '') + label + '</span>'; };
        h += '<div class="mitem" data-m="' + m.id + '"><div class="mno ' + cls + '">P' + m.no + '</div><div class="info"><div style="font-weight:700">' + K3.esc(m.judul) + (m.lulus ? ' <span class="chip green">Lulus</span>' : '') + '</div>';
        if (m.terbuka) {
          h += '<div class="row small muted" style="gap:6px;margin-top:6px">' + step(m.langkah.materi, 'Materi ' + m.persen + '%' + (m.slideTotal ? ' (' + m.slideSelesai + '/' + m.slideTotal + ' slide' + (m.subMateri ? ', ' + m.subMateri + ' sub-materi' : '') + ')' : '')) + step(m.langkah.latihan, 'Latihan' + (m.latihan.terbaik !== null ? ' ' + K3.num(m.latihan.terbaik) : '')) +
            step(m.langkah.ujian, 'Ujian ≥ ' + m.ambang + (m.ujian.skor !== null ? ' (' + K3.num(m.ujian.skor) + ')' : m.ujian.selesai && !m.lulus ? ' (belum)' : '')) + '</div>';
        } else h += '<div class="small muted">' + K3.esc(m.alasan || 'Belum dibuka dosen') + '</div>';
        h += '</div><div class="acts">';
        if (m.terbuka) {
          h += '<a class="btn sm ' + (m.persen < 100 ? 'amber' : 'ghost') + '" href="#/materi/' + m.id + '">' + (m.persen === 0 ? 'Mulai materi' : m.persen < 100 ? 'Lanjutkan' : 'Buka materi') + '</a>';
          h += m.latihan.terbuka ? '<a class="btn sm ' + (m.persen >= 100 && !m.langkah.latihan ? 'amber' : 'ghost') + '" href="#/latihan/' + m.id + '">Latihan</a>' : '<button class="btn sm ghost" disabled title="' + K3.esc(m.latihan.alasan) + '">Latihan</button>';
          h += m.ujian.terbuka ? '<a class="btn sm" href="#/ujian/' + m.id + '">' + (m.ujian.berjalan ? 'Lanjutkan ujian' : 'Ujian') + '</a>' : '<button class="btn sm ghost" disabled title="' + K3.esc(m.ujian.alasan) + '">Ujian</button>';
        }
        h += '</div>';
        if (m.terbuka && !m.lulus && (!m.latihan.terbuka || !m.ujian.terbuka)) {
          var notes = [];
          if (!m.latihan.terbuka && m.latihan.alasan) notes.push('Latihan: ' + m.latihan.alasan);
          if (!m.ujian.terbuka && m.ujian.alasan) notes.push('Ujian: ' + m.ujian.alasan.replace(/Dibuka (\S+)/, function (_, dd) { return 'dibuka ' + K3.fmtTgl(dd); }));
          if (notes.length) h += '<div class="small muted" style="flex-basis:100%;padding-left:52px">' + K3.esc(notes.join(' · ')) + '</div>';
        }
        h += '</div>';
      });
      h += '</div></div></div>';
      app().innerHTML = h;
      K3.$('#keluar').onclick = K3.keluar;
    }).catch(function (e) { if (!K3.stale(rv)) K3.errorView(e); });
  };
  K3.errorView = function (e, back) {
    app().innerHTML = K3.topbar('Kuliah K3', 'Terjadi kendala', back || null) + '<div class="wrap"><div class="card stack"><div class="msg err" role="alert">' + K3.esc(e.message) + '</div><div class="row"><button class="btn" id="ulang">Coba lagi</button>' + (back ? '' : '<button class="btn ghost" id="keluar2">Keluar</button>') + '</div></div></div>';
    K3.$('#ulang').onclick = K3.route;
    var k = K3.$('#keluar'); if (k) k.onclick = K3.keluar;
    var k2 = K3.$('#keluar2'); if (k2) k2.onclick = K3.keluar;
  };

  // ---------- tugas ----------
  K3.tugasView = function () {
    K3.loading('Memuat tugas…');
    var rv = K3._rv;
    K3.api('beranda').then(function (d) {
      if (K3.stale(rv)) return;
      var h = K3.topbar('Pengumpulan tugas', 'Tugas', '#/') + '<div class="wrap stack">';
      if (!d.tugas.length) h += '<div class="card">Belum ada tugas aktif.</div>';
      d.tugas.forEach(function (t) {
        var lewat = t.tenggat && new Date(t.tenggat).getTime() < Date.now();
        h += '<div class="card stack" data-t="' + K3.esc(t.id) + '"><div class="row" style="justify-content:space-between"><h2>' + K3.esc(t.judul) + '</h2>' +
          (t.terkumpul ? '<span class="chip green">Terkumpul</span>' : lewat ? '<span class="chip red">Tenggat lewat</span>' : '<span class="chip amber">Belum dikumpulkan</span>') + '</div>' +
          '<p style="margin:0">' + K3.esc(t.deskripsi) + '</p>' +
          '<div class="small muted">' + (t.tenggat ? 'Tenggat: ' + K3.fmtTgl(t.tenggat) + ' · ' : '') + 'Maks. ' + t.maks_mb + ' MB · PDF, Word, Excel, PowerPoint, gambar, atau ZIP</div>';
        if (t.terkumpul) h += '<div class="msg ok">Terakhir dikirim ' + K3.esc(K3.fmtTgl(t.terkumpul.waktu)) + ': ' + K3.esc(t.terkumpul.file) + (t.terkumpul.nilai !== '' ? ' · Nilai ' + K3.esc(t.terkumpul.nilai) : '') + (t.terkumpul.catatan ? ' · ' + K3.esc(t.terkumpul.catatan) : '') + '</div>';
        if (!lewat) h += '<div class="row"><label class="f" style="flex:1 1 260px">Pilih file<input class="inp" type="file" id="file_' + K3.esc(t.id) + '" style="padding:9px"></label><button class="btn" data-kirim="' + K3.esc(t.id) + '" style="align-self:flex-end">' + (t.terkumpul ? 'Kirim ulang' : 'Kirim') + '</button></div>';
        h += '<div class="out"></div></div>';
      });
      h += '</div>';
      app().innerHTML = h;
      K3.$$('[data-kirim]').forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-kirim'), inp = document.getElementById('file_' + id), out = b.closest('.card').querySelector('.out');
          var t = d.tugas.filter(function (x) { return x.id === id; })[0];
          var f = inp.files && inp.files[0];
          if (!f) { out.innerHTML = '<div class="msg err">Pilih file dulu.</div>'; return; }
          if (f.size > t.maks_mb * 1048576) { out.innerHTML = '<div class="msg err">Ukuran file melebihi ' + t.maks_mb + ' MB.</div>'; return; }
          b.disabled = true; b.textContent = 'Mengirim…';
          var rd = new FileReader();
          rd.onload = function () {
            var b64 = String(rd.result).split(',')[1] || '';
            K3.api('tugasKirim', { tugas: id, namaFile: f.name, mime: f.type, data: b64 }).then(function (r) {
              K3.toast('Tugas terkirim: ' + r.file); K3.tugasView();
            }).catch(function (e) { out.innerHTML = '<div class="msg err">' + K3.esc(e.message) + '</div>'; b.disabled = false; b.textContent = 'Kirim'; });
          };
          rd.readAsDataURL(f);
        };
      });
    }).catch(function (e) { if (!K3.stale(rv)) K3.errorView(e, '#/'); });
  };

  // ---------- nilai ----------
  K3.nilaiView = function () {
    K3.loading('Memuat nilai…');
    var rv = K3._rv;
    K3.api('nilai').then(function (d) {
      if (K3.stale(rv)) return;
      var h = K3.topbar('Riwayat', 'Nilai saya', '#/') + '<div class="wrap stack">';
      if (!d.percobaan.length) h += '<div class="card">Belum ada latihan atau ujian yang selesai.</div>';
      else {
        h += '<div class="tbl"><table><thead><tr><th>Materi</th><th>Jenis</th><th>Selesai</th><th class="c">Nilai</th></tr></thead><tbody>';
        d.percobaan.slice().reverse().forEach(function (a) {
          h += '<tr><td>' + K3.esc(a.judul || a.materi) + '</td><td>' + (a.mode === 'ujian' ? 'Ujian' : 'Latihan') + '</td><td>' + K3.esc(K3.fmtTgl(a.selesai)) + '</td><td class="c"><b>' + (a.skor === null ? 'Disembunyikan' : K3.num(a.skor)) + '</b></td></tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '</div>';
      app().innerHTML = h;
    }).catch(function (e) { if (!K3.stale(rv)) K3.errorView(e, '#/'); });
  };
})(K3);
window.K3 = K3;

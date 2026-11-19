/* Panel dosen: kelas & akses materi, kisi-kisi latihan/ujian, mahasiswa & reset PIN, tugas, rekap, OBE, cek bank soal. */
(function (K3) {
  'use strict';
  var D = K3.Dosen = {};
  var app = function () { return document.getElementById('app'); };
  var api = function (a, d) { return K3.api(a, d, { dosen: true }); };
  var st = { bmode: 'ujian', bpilih: 'terbaik', tab: 'akses', kelas: null, data: null, materi: 'm01', lmode: 'latihan', paket: false, seed: 'pratinjau-dosen' };
  var TABS = [['akses', 'Kelas dan akses'], ['lihat', 'Lihat materi dan soal'], ['kisi', 'Latihan dan ujian'], ['mhs', 'Mahasiswa dan PIN'], ['akt', 'Aktivitas dan pelanggaran'], ['tugas', 'Tugas'], ['dash', 'Dashboard'], ['rekap', 'Rekap nilai'], ['butir', 'Analisis butir'], ['obe', 'Analisis OBE'], ['bank', 'Cek bank soal']];

  D.open = function (h) {
    if (!K3.store.get('dtoken')) return login();
    var mm = /^#\/dosen\/materi\/(\w+)/.exec(h || '');
    if (mm) return K3.Player.openDosen(mm[1]);
    K3.loading('Memuat panel dosen…');
    var rv = K3._rv;
    api('dosenData').then(function (d) { if (K3.stale(rv)) return; st.data = d; if (!st.kelas && d.kelas[0]) st.kelas = d.kelas[0].kode; frame(); })
      .catch(function (e) { if (e.code !== 'SESI') K3.errorView(e); });
  };

  function login(msg) {
    app().innerHTML = '<div class="login"><div class="hero"><div class="row" style="gap:10px"><div class="logo">' + K3.icon.shield + '</div><div><div class="small" style="color:var(--amber);font-weight:700">PANEL DOSEN</div><div style="font-size:18px;font-weight:800">Kuliah K3 Interaktif</div></div></div></div>' +
      '<form class="stack" id="fd" style="padding:22px">' + (msg ? '<div class="msg err" role="alert">' + K3.esc(msg) + '</div>' : '') +
      '<h1>Masuk dosen</h1><label class="f">Kata sandi dosen<input class="inp" type="password" id="pw" autocomplete="current-password" required></label>' +
      '<button class="btn" type="submit">Masuk</button><a class="small" href="#/">Ke halaman mahasiswa</a></form></div>';
    K3.$('#pw').focus();
    K3.$('#fd').onsubmit = function (e) {
      e.preventDefault();
      api('dosenMasuk', { password: K3.$('#pw').value, token: '' }).then(function (r) { K3.store.set('dtoken', r.token); D.open(location.hash); }).catch(function (e) { login(e.message); });
    };
  }

  function frame() {
    var d = st.data;
    var h = '<div class="side"><nav aria-label="Menu dosen"><div style="padding:0 8px 14px"><div class="small" style="color:var(--amber);font-weight:700">PANEL DOSEN</div><div style="font-weight:800">' + K3.esc(d.mk) + '</div><div class="small" style="color:#AEB6C2">' + K3.esc(d.semester) + '</div></div>';
    TABS.forEach(function (t) { h += '<button type="button" data-tab="' + t[0] + '" class="' + (st.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; });
    h += '<button type="button" id="dkeluar" style="margin-top:auto;opacity:.8">Keluar</button></nav><main id="dmain"></main></div>';
    app().innerHTML = h;
    K3.$$('[data-tab]').forEach(function (b) { b.onclick = function () { st.tab = b.getAttribute('data-tab'); frame(); }; });
    K3.$('#dkeluar').onclick = function () { K3.store.del('dtoken'); login(); };
    ({ akses: akses, lihat: lihatTab, kisi: kisi, mhs: mahasiswa, akt: aktivitas, tugas: tugas, rekap: rekap, dash: dash, butir: butir, obe: obe, bank: bank })[st.tab]();
  }
  function main(html) { K3.$('#dmain').innerHTML = html; }
  function kelasSelect(id, all) {
    return '<label class="f" style="min-width:220px">Kelas<select class="inp" id="' + id + '">' + (all ? '<option value="">Semua kelas</option>' : '') +
      st.data.kelas.map(function (k) { return '<option value="' + K3.esc(k.kode) + '"' + (!all && k.kode === st.kelas ? ' selected' : '') + '>' + K3.esc(k.kode + ' · ' + k.nama) + '</option>'; }).join('') + '</select></label>';
  }
  function parseList(s) {
    var set = {};
    String(s || '').split(/[,;\s]+/).forEach(function (p) { var m = /^(\d+)-(\d+)$/.exec(p); if (m) for (var i = +m[1]; i <= +m[2]; i++) set[i] = 1; else if (/^\d+$/.test(p)) set[+p] = 1; });
    return set;
  }

  // ---------- akses ----------
  function akses() {
    var d = st.data, k = d.kelas.filter(function (x) { return x.kode === st.kelas; })[0];
    var h = '<div class="row" style="justify-content:space-between;align-items:flex-end"><div><h1>Kelas dan akses</h1><p class="muted" style="margin:4px 0 0">Buka materi, latihan, dan ujian per pertemuan. Perubahan langsung berlaku.</p></div>' + kelasSelect('selKelas') + '</div>';
    if (!k) h += '<div class="card">Belum ada kelas. Tambahkan di bawah.</div>';
    else {
      h += '<div class="card row" style="justify-content:space-between"><div><b>' + K3.esc(k.kode) + '</b> · ' + K3.esc(k.nama) + ' <span class="muted small">(kode ini dibagikan ke mahasiswa)</span></div>' +
        '<div class="row small"><span>Kelas aktif</span><button class="sw" type="button" id="swAktif" aria-pressed="' + k.aktif + '" aria-label="Kelas aktif"></button></div></div>';
      h += '<div class="tbl"><table><thead><tr><th>P</th><th>Materi</th><th class="c">Materi terbuka</th><th class="c">Latihan</th><th class="c">Ujian</th><th>Jadwal ujian</th></tr></thead><tbody>';
      var M = parseList(k.materi_terbuka), Lt = parseList(k.latihan_terbuka), U = parseList(k.ujian_terbuka);
      d.materi.forEach(function (m) {
        var ku = d.kisi[m.id + '|ujian'] || {};
        var sw = function (f, set, lab) { return '<button class="sw" type="button" data-f="' + f + '" data-no="' + m.no + '" aria-pressed="' + !!set[m.no] + '" aria-label="' + lab + ' P' + m.no + '"></button>'; };
        h += '<tr><td><b>' + m.no + '</b></td><td>' + K3.esc(m.judul) + '</td><td class="c">' + sw('materi_terbuka', M, 'Materi') + '</td><td class="c">' + sw('latihan_terbuka', Lt, 'Latihan') + '</td><td class="c">' + sw('ujian_terbuka', U, 'Ujian') + '</td>' +
          '<td class="small muted">' + (ku.buka ? K3.fmtTgl(ku.buka) : 'kapan saja') + (ku.tutup ? ' – ' + K3.fmtTgl(ku.tutup) : '') + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '<div class="card stack"><h3>Tambah kelas</h3><div class="row" style="align-items:flex-end"><label class="f">Kode kelas<input class="inp" id="nkKode" placeholder="K3B" style="text-transform:uppercase"></label><label class="f" style="flex:1 1 220px">Nama kelas<input class="inp" id="nkNama" placeholder="K3 Kelas B"></label><button class="btn" id="nkBtn" type="button">Tambah</button></div></div>';
    main(h);
    var sel = K3.$('#selKelas'); if (sel) sel.onchange = function () { st.kelas = sel.value; akses(); };
    K3.$$('.sw[data-f]').forEach(function (b) {
      b.onclick = function () {
        var on = b.getAttribute('aria-pressed') !== 'true', f = b.getAttribute('data-f'), no = Number(b.getAttribute('data-no'));
        b.setAttribute('aria-pressed', on); b.disabled = true;
        api('dosenSetKelas', { kode: st.kelas, field: f, no: no, value: on }).then(function (r) {
          b.disabled = false; k[f] = r.nilai; K3.toast((on ? 'Dibuka: ' : 'Ditutup: ') + f.replace('_terbuka', '') + ' P' + no);
        }).catch(function (e) { b.disabled = false; b.setAttribute('aria-pressed', !on); K3.toast(e.message); });
      };
    });
    var sa = K3.$('#swAktif'); if (sa) sa.onclick = function () {
      var on = sa.getAttribute('aria-pressed') !== 'true'; sa.setAttribute('aria-pressed', on);
      api('dosenSetKelas', { kode: st.kelas, field: 'aktif', value: on }).then(function () { k.aktif = on; K3.toast(on ? 'Kelas diaktifkan' : 'Kelas dinonaktifkan'); }).catch(function (e) { K3.toast(e.message); });
    };
    K3.$('#nkBtn').onclick = function () {
      var kode = K3.$('#nkKode').value.trim().toUpperCase(), nama = K3.$('#nkNama').value.trim();
      api('dosenTambahKelas', { kode: kode, nama: nama }).then(function () { st.kelas = kode; K3.toast('Kelas ' + kode + ' ditambahkan'); D.open(); }).catch(function (e) { K3.toast(e.message); });
    };
  }


  // ---------- lihat materi & soal ----------
  var L = 'ABCDEFGHIJ';
  var TIPE = { PG: 'Pilihan ganda', PGK: 'PG kompleks', BS: 'Benar–Salah', JODOH: 'Menjodohkan', URUT: 'Urutan', HITUNG: 'Hitungan' };
  function lihatTab() {
    var d = st.data;
    var m = d.materi.filter(function (x) { return x.id === st.materi; })[0] || d.materi[0];
    var h = '<div class="row" style="justify-content:space-between;align-items:flex-end"><div><h1>Lihat materi dan soal</h1><p class="muted" style="margin:4px 0 0">Pratinjau persis seperti yang dilihat mahasiswa, lengkap dengan kunci dan pembahasan. Bisa dibuka walau materi masih tertutup untuk mahasiswa.</p></div>' +
      '<label class="f" style="min-width:280px">Materi<select class="inp" id="selL">' + d.materi.map(function (x) { return '<option value="' + x.id + '"' + (x.id === m.id ? ' selected' : '') + '>P' + x.no + ' · ' + K3.esc(x.judul) + '</option>'; }).join('') + '</select></label></div>';
    h += '<div class="card row" style="justify-content:space-between"><div><b>Materi P' + m.no + '</b> · ' + K3.esc(m.judul) + '<div class="small muted">Slide, narasi, simulasi, dan cek pemahaman dalam mode pratinjau (progres tidak disimpan).</div></div><a class="btn amber" href="#/dosen/materi/' + m.id + '" id="lihatMateri">Lihat materi</a></div>';
    h += '<div class="card stack"><div class="row" style="justify-content:space-between"><div class="tabs" role="tablist">' +
      [['latihan', 'Soal latihan'], ['ujian', 'Soal ujian'], ['semua', 'Semua soal di bank']].map(function (t) { return '<button type="button" role="tab" class="tab' + (st.lmode === t[0] ? ' on' : '') + '" aria-selected="' + (st.lmode === t[0]) + '" data-lm="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="row">' + (st.lmode !== 'semua' ? '<label class="row small" style="gap:8px;font-weight:700"><input type="checkbox" id="paket" style="width:20px;height:20px"' + (st.paket ? ' checked' : '') + '>Contoh paket satu mahasiswa (sesuai kisi-kisi)</label>' : '') +
      '<button class="btn sm ghost" type="button" id="acak">Acak ulang angka dan pilihan</button></div></div><div id="lout" class="stack"><div class="loading"><div class="spinner"></div>Memuat soal…</div></div></div>';
    main(h);
    K3.$('#selL').onchange = function () { st.materi = this.value; lihatTab(); };
    K3.$$('[data-lm]').forEach(function (b) { b.onclick = function () { st.lmode = b.getAttribute('data-lm'); lihatTab(); }; });
    var pk = K3.$('#paket'); if (pk) pk.onchange = function () { st.paket = pk.checked; loadSoal(); };
    K3.$('#acak').onclick = function () { st.seed = 'pratinjau-' + Date.now(); loadSoal(); };
    loadSoal();
  }
  function loadSoal() {
    var box = K3.$('#lout'); box.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat soal…</div>';
    api('dosenSoal', { materi: st.materi, mode: st.lmode, paket: st.paket && st.lmode !== 'semua', seed: st.seed }).then(function (r) {
      var h = '';
      var lv = ['C1', 'C2', 'C3', 'C4'].map(function (Lv) {
        var need = r.kisi ? Number(r.kisi[Lv] || 0) : null, have = r.perLevel[Lv] || 0;
        return '<span class="chip' + (need !== null && !r.paket && need > have ? ' red' : '') + '">' + Lv + ': ' + have + (need !== null && !r.paket ? ' / kisi ' + need : '') + '</span>';
      }).join(' ');
      h += '<div class="row small">' + (r.paket ? '<b>Contoh paket:</b> ' + r.soal.length + ' soal, urutan dan angka seperti yang diterima satu mahasiswa.' : '<b>' + r.soal.length + ' soal</b> ' + (r.mode === 'semua' ? 'di bank untuk materi ini.' : 'dapat dipakai untuk ' + r.mode + '.')) + ' ' + lv + '</div>';
      if (r.kisi && r.mode === 'ujian') h += '<div class="small muted">Durasi ' + (Number(r.kisi.durasi_menit) || 'bebas') + ' menit · percobaan ' + (Number(r.kisi.percobaan) || 'tak terbatas') + ' · batas pelanggaran ' + (Number(r.kisi.batas_pelanggaran) || '–') + '</div>';
      if (!r.soal.length) h += '<div class="msg warn">Belum ada soal untuk pilihan ini. Isi sheet BankSoal lalu jalankan menu Muat ulang cache.</div>';
      r.soal.forEach(function (q, n) { h += soalCard(q, n); });
      box.innerHTML = h;
    }).catch(function (e) { box.innerHTML = '<div class="msg err">' + K3.esc(e.message) + '</div>'; });
  }
  function soalCard(q, n) {
    var h = '<article class="card stack" style="border-left:0" data-soal="' + K3.esc(q.id) + '"><div class="row"><span class="chip blue">' + (n + 1) + ' · ' + K3.esc(q.id) + '</span><span class="chip">' + K3.esc(TIPE[q.tipe] || q.tipe) + '</span><span class="chip">' + K3.esc(q.level) + '</span>' +
      (q.pakai ? '<span class="chip amber">' + K3.esc(q.pakai) + '</span>' : '') + (q.subcpmk ? '<span class="small muted">' + K3.esc(q.subcpmk) + '</span>' : '') + '</div>';
    if (q.error) return h + '<div class="qtext">' + q.soal + '</div><div class="msg err">Soal ini bermasalah: ' + K3.esc(q.error) + '</div></article>';
    if (q.kasusTeks) h += '<details class="kasus"><summary>Studi kasus ' + K3.esc(q.kasus) + ' · ' + K3.esc(q.kasusTeks.judul) + '</summary><div>' + q.kasusTeks.teks + '</div></details>';
    else if (q.kasus) h += '<div class="msg err">Studi kasus ' + K3.esc(q.kasus) + ' tidak ditemukan di sheet StudiKasus.</div>';
    h += '<div class="qtext">' + q.soal + '</div>';
    var ok = 'border-color:var(--green);background:var(--green-soft)';
    if (q.tipe === 'PG' || q.tipe === 'PGK') {
      h += '<div class="stack" style="gap:6px">' + q.opsi.map(function (o, j) {
        var b = (q.benarIdx || []).indexOf(j) >= 0;
        return '<div class="opt" style="cursor:default;' + (b ? ok : '') + '"><b style="margin-right:8px">' + L[j] + '.</b>' + o + (b ? ' <b style="color:var(--green)">✓ kunci</b>' : '') + '</div>';
      }).join('') + '</div>';
    } else if (q.tipe === 'BS') {
      h += q.pernyataan.map(function (p, j) { var b = q.benarBS[j] === 'B'; return '<div class="bsrow"><div class="s">' + (j + 1) + '. ' + p + '</div><span class="chip ' + (b ? 'green' : 'red') + '">' + (b ? 'Benar' : 'Salah') + '</span></div>'; }).join('');
    } else if (q.tipe === 'JODOH') {
      var used = {};
      h += q.kiri.map(function (l, j) { used[q.benarMap[j]] = 1; return '<div class="jrow"><span class="l">' + l + '</span><span>→</span><span style="flex:1 1 260px;font-weight:600;color:var(--green)">' + q.kanan[q.benarMap[j]] + '</span></div>'; }).join('');
      var extra = q.kanan.filter(function (_, k) { return !used[k]; });
      if (extra.length) h += '<div class="small muted">Pengecoh: ' + extra.join('; ') + '</div>';
    } else if (q.tipe === 'URUT') {
      h += '<div class="small muted">Urutan yang benar (mahasiswa melihatnya teracak):</div><ol style="margin:0;padding-left:22px">' + q.urutBenar.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>';
    } else if (q.tipe === 'HITUNG') {
      h += '<div class="row small">' + Object.keys(q.nilaiVar || {}).map(function (k) { return '<span class="chip">' + K3.esc(k) + ' = ' + K3.esc(q.nilaiVar[k]) + '</span>'; }).join(' ') + '</div>' +
        '<div class="msg ok"><b>Kunci:</b> ' + K3.esc(q.kunci) + ' · toleransi ±' + K3.esc(String(q.toleransi).replace('.', ',')) + '%' + (q.satuan && q.satuan.length > 1 ? ' · satuan diterima: ' + K3.esc(q.satuan.join(', ')) : '') + '</div>' +
        '<div class="small muted">Variabel: <code>' + K3.esc(q.variabel) + '</code> (angka berubah untuk setiap mahasiswa)</div>';
    }
    if (q.tipe !== 'HITUNG') h += '<div class="small"><b>Kunci:</b> ' + K3.esc(q.kunci) + '</div>';
    if (q.pembahasan && q.pembahasan.length) h += '<details class="pemb"><summary><b>Pembahasan</b></summary><ol>' + q.pembahasan.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ol></details>';
    return h + '</article>';
  }

  // ---------- kisi ----------
  function kisi() {
    var d = st.data;
    var h = '<div class="row" style="justify-content:space-between;align-items:flex-end"><div><h1>Latihan dan ujian</h1><p class="muted" style="margin:4px 0 0">Kisi-kisi = jumlah soal per level kognitif yang diambil acak dari bank soal.</p></div>' +
      '<label class="f" style="min-width:280px">Materi<select class="inp" id="selM">' + d.materi.map(function (m) { return '<option value="' + m.id + '"' + (m.id === st.materi ? ' selected' : '') + '>P' + m.no + ' · ' + K3.esc(m.judul) + '</option>'; }).join('') + '</select></label></div><div class="grid2">';
    ['latihan', 'ujian'].forEach(function (mode) {
      var k = d.kisi[st.materi + '|' + mode] || {}, stok = ((d.stok[st.materi] || {})[mode]) || {};
      h += '<form class="card stack" data-mode="' + mode + '"><h2>' + (mode === 'ujian' ? 'Ujian' : 'Latihan') + '</h2><div class="tbl"><table><thead><tr><th>Level</th><th>Jumlah soal</th><th>Stok di bank</th></tr></thead><tbody>';
      ['C1', 'C2', 'C3', 'C4'].forEach(function (L) {
        var need = Number(k[L] || 0), have = stok[L] || 0;
        h += '<tr><td><b>' + L + '</b></td><td><input class="inp" style="width:90px;height:40px" type="number" min="0" max="100" name="' + L + '" value="' + need + '" aria-label="Jumlah soal ' + L + ' ' + mode + '"></td><td class="' + (need > have ? '' : 'muted') + '" style="' + (need > have ? 'color:var(--red);font-weight:700' : '') + '">' + have + (need > have ? ' (kurang)' : '') + '</td></tr>';
      });
      h += '</tbody></table></div><div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">' +
        '<label class="f">Durasi (menit, 0 = bebas)<input class="inp" type="number" min="0" name="durasi_menit" value="' + Number(k.durasi_menit || 0) + '"></label>' +
        '<label class="f">Maks. percobaan (0 = tak terbatas)<input class="inp" type="number" min="0" name="percobaan" value="' + Number(k.percobaan || 0) + '"></label>' +
        '<label class="f">Batas pelanggaran (0 = hanya dicatat)<input class="inp" type="number" min="0" name="batas_pelanggaran" value="' + Number(k.batas_pelanggaran || 0) + '"></label>' +
        '<label class="f">Acak urutan pilihan<select class="inp" name="acak_opsi"><option value="1"' + (String(k.acak_opsi).toLowerCase() !== 'tidak' ? ' selected' : '') + '>Ya</option><option value="0"' + (String(k.acak_opsi).toLowerCase() === 'tidak' ? ' selected' : '') + '>Tidak</option></select></label></div>';
      if (mode === 'ujian') h += '<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))"><label class="f">Dibuka mulai<input class="inp" type="datetime-local" name="buka" value="' + toLocal(k.buka) + '"></label><label class="f">Ditutup pada<input class="inp" type="datetime-local" name="tutup" value="' + toLocal(k.tutup) + '"></label></div>';
      h += '<div class="small muted">Total soal: <b class="tot">' + ['C1', 'C2', 'C3', 'C4'].reduce(function (a, L) { return a + Number(k[L] || 0); }, 0) + '</b></div><button class="btn" type="submit">Simpan ' + mode + '</button></form>';
    });
    h += '</div>';
    main(h);
    K3.$('#selM').onchange = function () { st.materi = this.value; kisi(); };
    K3.$$('form[data-mode]').forEach(function (f) {
      f.oninput = function () { f.querySelector('.tot').textContent = ['C1', 'C2', 'C3', 'C4'].reduce(function (a, L) { return a + Number(f.elements[L].value || 0); }, 0); };
      f.onsubmit = function (e) {
        e.preventDefault();
        var mode = f.getAttribute('data-mode'), v = {};
        ['C1', 'C2', 'C3', 'C4', 'durasi_menit', 'percobaan', 'batas_pelanggaran'].forEach(function (n) { if (f.elements[n]) v[n] = Number(f.elements[n].value || 0); });
        v.acak_opsi = f.elements.acak_opsi.value === '1';
        if (f.elements.buka) { v.buka = f.elements.buka.value; v.tutup = f.elements.tutup.value; }
        api('dosenSetKisi', { materi: st.materi, mode: mode, values: v }).then(function () { K3.toast('Pengaturan ' + mode + ' tersimpan'); return api('dosenData'); })
          .then(function (d) { st.data = d; }).catch(function (e) { K3.toast(e.message); });
      };
    });
  }
  function toLocal(iso) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d)) return '';
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  // ---------- mahasiswa ----------
  function mahasiswa() {
    main('<div class="row" style="justify-content:space-between;align-items:flex-end"><div><h1>Mahasiswa dan PIN</h1><p class="muted" style="margin:4px 0 0">Status tiap modul, nilai latihan terbaik (L) dan ujian terbaik (U), serta jumlah pelanggaran. Hijau = modul lulus.</p></div>' + kelasSelect('selKelasM', true) + '</div><div id="mout" class="loading"><div class="spinner"></div>Memuat…</div>');
    K3.$('#selKelasM').onchange = function () { st.kelas = this.value || st.kelas; load(this.value); };
    var kelasNow = '';
    function load(k) {
      kelasNow = k;
      api('dosenMahasiswa', { kelas: k }).then(function (r) {
        var h = '<div class="tbl"><table><thead><tr><th>NIM</th><th>Nama</th><th>Kelas</th><th class="c">Lulus</th><th class="c">Pelanggaran<br>latihan / ujian</th>';
        r.materi.forEach(function (m) { h += '<th class="c">P' + m.no + '</th>'; });
        h += '<th>Terakhir aktif</th><th>PIN</th><th>Tambah percobaan ujian</th></tr></thead><tbody>';
        if (!r.mahasiswa.length) h += '<tr><td colspan="' + (8 + r.materi.length) + '" class="muted">Belum ada mahasiswa yang masuk.</td></tr>';
        r.mahasiswa.forEach(function (x, i) {
          var lulus = x.per.filter(function (p) { return p.lulus; }).length;
          h += '<tr><td>' + K3.esc(x.nim) + '</td><td>' + K3.esc(x.nama) + '</td><td>' + K3.esc(x.kelas) + '</td><td class="c"><b>' + lulus + '</b>/' + x.per.length + '</td>' +
            '<td class="c">' + (x.pelL || x.pelU ? '<span class="chip ' + (x.pelU ? 'red' : 'amber') + '">' + x.pelL + ' / ' + x.pelU + '</span>' : '0 / 0') + '</td>';
          x.per.forEach(function (p) {
            var bg = p.lulus ? 'background:var(--green-soft)' : (p.s === 'Terkunci' || p.s === 'Belum dibuka') ? 'color:var(--muted)' : '';
            h += '<td class="c small" style="white-space:nowrap;' + bg + '" title="' + K3.esc(p.s) + '">' + K3.esc(p.lulus ? '✓ Lulus' : p.s) + (p.st && !p.lulus ? '<br>' + p.ss + '/' + p.st + ' slide' : '') + (p.mnt ? '<br><span class="muted">' + K3.num(p.mnt) + ' mnt</span>' : '') +
              (p.l !== null ? '<br>L ' + K3.num(p.l) : '') + (p.u !== null ? '<br><b>U ' + K3.num(p.u) + '</b>' : '') + (p.uDipakai ? '<br><span class="muted">uji ' + p.uDipakai + '/' + p.uMaks + '</span>' : '') + '</td>';
          });
          var opsi = x.per.filter(function (p) { return !p.lulus && p.uDipakai > 0 && p.uDipakai >= p.uMaks; });
          h += '<td class="small">' + K3.esc(K3.fmtTgl(x.terakhir)) + '</td><td><div class="small">' + (x.punyaPin ? 'Ada' : '<span class="chip amber">Belum</span>') + '</div><button class="btn sm ghost" type="button" data-reset="' + K3.esc(x.nim) + '">Reset PIN</button></td>' +
            '<td><div class="row" style="gap:6px;flex-wrap:nowrap"><select class="inp" style="height:36px;width:90px;font-size:13px" id="tp' + i + '" aria-label="Modul untuk ' + K3.esc(x.nim) + '">' +
            r.materi.map(function (m, j) { var p = x.per[j]; var need = opsi.indexOf(p) >= 0; return '<option value="' + m.id + '"' + (need && opsi[0] === p ? ' selected' : '') + '>P' + m.no + (need ? ' ⚠' : '') + '</option>'; }).join('') +
            '</select><button class="btn sm" type="button" data-tambah="' + i + '">+1</button></div>' + (opsi.length ? '<div class="small" style="color:var(--red)">Percobaan habis: ' + opsi.map(function (p) { return p.id.replace('m0', 'P').replace('m', 'P'); }).join(', ') + '</div>' : '') + '</td></tr>';
        });
        h += '</tbody></table></div>';
        K3.$('#mout').className = ''; K3.$('#mout').innerHTML = h;
        K3.$$('[data-reset]').forEach(function (b) {
          b.onclick = function () {
            var nim = b.getAttribute('data-reset');
            if (b.getAttribute('data-sure') !== '1') { b.setAttribute('data-sure', '1'); b.textContent = 'Yakin reset?'; b.classList.add('danger'); b.classList.remove('ghost'); return; }
            api('dosenResetPin', { nim: nim }).then(function () { K3.toast('PIN ' + nim + ' direset'); load(kelasNow); }).catch(function (e) { K3.toast(e.message); });
          };
        });
        K3.$$('[data-tambah]').forEach(function (b) {
          b.onclick = function () {
            var i = Number(b.getAttribute('data-tambah')), x = r.mahasiswa[i], mid = K3.$('#tp' + i).value;
            b.disabled = true;
            api('dosenTambahPercobaan', { nim: x.nim, materi: mid, mode: 'ujian', jumlah: 1 }).then(function () { K3.toast('+1 percobaan ujian ' + mid + ' untuk ' + x.nim); load(kelasNow); })
              .catch(function (e) { b.disabled = false; K3.toast(e.message); });
          };
        });
      }).catch(function (e) { if (K3.$('#mout')) K3.$('#mout').innerHTML = '<div class="msg err">' + K3.esc(e.message) + '</div>'; });
    }
    load('');
  }

  // ---------- aktivitas & pelanggaran ----------
  function aktivitas() {
    main('<div class="row" style="justify-content:space-between;align-items:flex-end"><div><h1>Aktivitas dan pelanggaran</h1><p class="muted" style="margin:4px 0 0">Setiap kejadian juga tersimpan permanen di sheet Aktivitas dan Pelanggaran.</p></div><div class="row" style="align-items:flex-end">' + kelasSelect('selKelasA', true) +
      '<label class="f">NIM (opsional)<input class="inp" id="anim" style="width:160px"></label><button class="btn ghost" id="arefresh" type="button">Tampilkan</button></div></div><div id="aout" class="stack"><div class="loading"><div class="spinner"></div></div></div>');
    function load() {
      var box = K3.$('#aout'); box.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      api('dosenAktivitas', { kelas: K3.$('#selKelasA').value, nim: K3.$('#anim').value.trim(), limit: 300 }).then(function (r) {
        var h = '<div class="card stack"><h2>Pelanggaran (' + r.pelanggaran.length + ')</h2>';
        h += r.pelanggaran.length ? '<div class="tbl"><table><thead><tr><th>Waktu</th><th>NIM</th><th>Nama</th><th>Materi</th><th>Mode</th><th>Jenis</th><th class="c">Ke</th><th>Tindakan</th></tr></thead><tbody>' +
          r.pelanggaran.map(function (x) { return '<tr><td class="small">' + K3.esc(K3.fmtTgl(x.waktu)) + '</td><td>' + K3.esc(x.nim) + '</td><td>' + K3.esc(x.nama) + '</td><td>' + K3.esc(x.materi) + '</td><td><span class="chip ' + (x.mode === 'ujian' ? 'red' : 'amber') + '">' + K3.esc(x.mode) + '</span></td><td>' + K3.esc(x.jenis) + '</td><td class="c">' + K3.esc(x.ke) + '</td><td class="small">' + K3.esc(x.tindakan) + '</td></tr>'; }).join('') + '</tbody></table></div>'
          : '<div class="msg ok">Belum ada pelanggaran.</div>';
        h += '</div><div class="card stack"><h2>Aktivitas terbaru (' + r.aktivitas.length + ')</h2><div class="tbl"><table><thead><tr><th>Waktu</th><th>NIM</th><th>Nama</th><th>Materi</th><th>Kegiatan</th><th>Detail</th><th class="c">Nilai</th></tr></thead><tbody>' +
          (r.aktivitas.length ? r.aktivitas.map(function (x) { return '<tr><td class="small" style="white-space:nowrap">' + K3.esc(K3.fmtTgl(x.waktu)) + '</td><td>' + K3.esc(x.nim) + '</td><td>' + K3.esc(x.nama) + '</td><td>' + K3.esc(x.materi) + '</td><td><b>' + K3.esc(x.jenis) + '</b></td><td class="small">' + K3.esc(x.detail) + '</td><td class="c">' + K3.esc(x.nilai) + '</td></tr>'; }).join('') : '<tr><td colspan="7" class="muted">Belum ada aktivitas.</td></tr>') + '</tbody></table></div></div>';
        box.innerHTML = h;
      }).catch(function (e) { box.innerHTML = '<div class="msg err">' + K3.esc(e.message) + '</div>'; });
    }
    K3.$('#arefresh').onclick = load; K3.$('#selKelasA').onchange = load;
    load();
  }

  // ---------- tugas ----------
  function tugas() {
    var d = st.data;
    var h = '<h1>Tugas</h1><div class="grid2">';
    var list = d.tugas.concat([{ id: '', judul: '', deskripsi: '', materi: 'm01', tenggat: '', aktif: true, subcpmk: '', maks_mb: 10, baru: true }]);
    list.forEach(function (t) {
      h += '<form class="card stack" data-id="' + K3.esc(t.id) + '"><h3>' + (t.baru ? 'Tugas baru' : K3.esc(t.id + ' · ' + t.judul)) + '</h3>' +
        '<label class="f">Judul<input class="inp" name="judul" value="' + K3.esc(t.judul) + '"></label>' +
        '<label class="f">Deskripsi<textarea class="inp" name="deskripsi">' + K3.esc(t.deskripsi) + '</textarea></label>' +
        '<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))"><label class="f">Materi<select class="inp" name="materi">' + d.materi.map(function (m) { return '<option value="' + m.id + '"' + (m.id === t.materi ? ' selected' : '') + '>P' + m.no + '</option>'; }).join('') + '</select></label>' +
        '<label class="f">Tenggat<input class="inp" type="datetime-local" name="tenggat" value="' + toLocal(t.tenggat) + '"></label>' +
        '<label class="f">Maks. MB<input class="inp" type="number" min="1" max="30" name="maks_mb" value="' + t.maks_mb + '"></label>' +
        '<label class="f">Aktif<select class="inp" name="aktif"><option value="1"' + (t.aktif ? ' selected' : '') + '>Ya</option><option value="0"' + (!t.aktif ? ' selected' : '') + '>Tidak</option></select></label></div>' +
        '<div class="row"><button class="btn" type="submit">Simpan</button>' + (t.baru ? '' : '<button class="btn ghost" type="button" data-lihat="' + K3.esc(t.id) + '">Lihat pengumpulan</button>') + '</div></form>';
    });
    h += '</div><div id="kumpulan"></div>';
    main(h);
    K3.$$('form[data-id]').forEach(function (f) {
      f.onsubmit = function (e) {
        e.preventDefault();
        var m = f.elements.materi.value, sub = (d.materi.filter(function (x) { return x.id === m; })[0] || {}).subcpmk;
        api('dosenSetTugas', { tugas: { id: f.getAttribute('data-id'), judul: f.elements.judul.value, deskripsi: f.elements.deskripsi.value, materi: m, subcpmk: sub, tenggat: f.elements.tenggat.value, maks_mb: f.elements.maks_mb.value, aktif: f.elements.aktif.value === '1' } })
          .then(function (r) { K3.toast('Tugas ' + r.id + ' tersimpan'); return api('dosenData'); }).then(function (dd) { st.data = dd; tugas(); }).catch(function (e) { K3.toast(e.message); });
      };
    });
    K3.$$('[data-lihat]').forEach(function (b) { b.onclick = function () { lihat(b.getAttribute('data-lihat')); }; });
  }
  function lihat(id) {
    var box = K3.$('#kumpulan'); box.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    api('dosenPengumpulan', { tugas: id }).then(function (r) {
      var h = '<div class="card stack"><h2>Pengumpulan ' + K3.esc(id) + ' (' + r.rows.length + ')</h2><div class="tbl"><table><thead><tr><th>Waktu</th><th>NIM</th><th>Nama</th><th>Kelas</th><th>File</th><th>Nilai</th><th>Catatan</th><th></th></tr></thead><tbody>';
      if (!r.rows.length) h += '<tr><td colspan="8" class="muted">Belum ada pengumpulan.</td></tr>';
      r.rows.forEach(function (x, i) {
        h += '<tr><td class="small">' + K3.esc(K3.fmtTgl(x.waktu)) + '</td><td>' + K3.esc(x.nim) + '</td><td>' + K3.esc(x.nama) + '</td><td>' + K3.esc(x.kelas) + '</td><td>' + (/^https?:/.test(x.url) ? '<a href="' + K3.esc(x.url) + '" target="_blank" rel="noopener">' + K3.esc(x.file) + '</a>' : K3.esc(x.file)) + '</td>' +
          '<td><input class="inp" style="width:80px;height:38px" type="number" min="0" max="100" id="nv' + i + '" value="' + K3.esc(x.nilai) + '" aria-label="Nilai ' + K3.esc(x.nim) + '"></td><td><input class="inp" style="height:38px" id="nc' + i + '" value="' + K3.esc(x.catatan) + '" aria-label="Catatan ' + K3.esc(x.nim) + '"></td>' +
          '<td><button class="btn sm" type="button" data-n="' + i + '">Simpan</button></td></tr>';
      });
      h += '</tbody></table></div></div>';
      box.innerHTML = h;
      K3.$$('[data-n]').forEach(function (b) {
        b.onclick = function () {
          var i = b.getAttribute('data-n'), x = r.rows[i];
          api('dosenNilaiTugas', { tugas: id, nim: x.nim, nilai: K3.$('#nv' + i).value, catatan: K3.$('#nc' + i).value }).then(function () { K3.toast('Nilai ' + x.nim + ' tersimpan'); }).catch(function (e) { K3.toast(e.message); });
        };
      });
    }).catch(function (e) { box.innerHTML = '<div class="msg err">' + K3.esc(e.message) + '</div>'; });
  }

  // ---------- rekap ----------
  function rekap() {
    main('<div class="row" style="justify-content:space-between;align-items:flex-end"><div><h1>Rekap nilai</h1><p class="muted" style="margin:4px 0 0">Laporan progres per modul: status, materi %, latihan, ujian, dan pelanggaran. Isinya sama dengan sheet Rekap.</p></div><div class="row" style="align-items:flex-end">' + kelasSelect('selKelasR', true) + '<button class="btn ghost" id="csv" type="button">Unduh CSV</button></div></div><div id="rout" class="loading"><div class="spinner"></div></div>');
    var cur = null;
    function load(k) {
      api('dosenRekap', { kelas: k }).then(function (r) {
        if (!K3.$('#rout')) return;
        cur = r;
        var h = '<div class="tbl"><table><thead><tr>' + r.head.map(function (x) { return '<th>' + K3.esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>';
        if (!r.rows.length) h += '<tr><td colspan="' + r.head.length + '" class="muted">Belum ada data.</td></tr>';
        r.rows.forEach(function (row) { h += '<tr>' + row.map(function (v) { return '<td>' + K3.esc(v === '' ? '–' : v) + '</td>'; }).join('') + '</tr>'; });
        K3.$('#rout').className = ''; K3.$('#rout').innerHTML = h + '</tbody></table></div>';
      }).catch(function (e) { if (K3.$('#rout')) K3.$('#rout').innerHTML = '<div class="msg err">' + K3.esc(e.message) + '</div>'; });
    }
    K3.$('#selKelasR').onchange = function () { load(this.value); };
    K3.$('#csv').onclick = function () {
      if (!cur) return;
      var q = function (v) { v = String(v === null || v === undefined ? '' : v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      var csv = [cur.head].concat(cur.rows).map(function (r) { return r.map(q).join(';'); }).join('\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'rekap_k3.csv'; a.click();
    };
    load('');
  }

  // ---------- OBE ----------
  function obe() {
    main('<div class="row" style="justify-content:space-between;align-items:flex-end"><div><h1>Analisis OBE</h1><p class="muted" style="margin:4px 0 0">Sub-CPMK → CPMK → CPL. Nilai Sub-CPMK = gabungan berbobot latihan terbaik, ujian, dan tugas.</p></div>' + kelasSelect('selKelasO', true) + '</div><div id="oout" class="loading"><div class="spinner"></div></div>');
    function bars(list, amb) {
      return list.map(function (x) {
        var v = x.rata, ok = v !== null && v >= amb;
        return '<div class="row" style="gap:12px"><span style="width:110px;font-weight:800;font-size:13px">' + K3.esc(x.kode) + '</span>' +
          '<div class="obebar" role="img" aria-label="' + K3.esc(x.kode) + ' rata-rata ' + (v === null ? 'belum ada data' : v) + '"><i style="width:' + (v || 0) + '%;background:' + (ok ? 'var(--blue)' : '#E07A2E') + '"></i><b style="left:' + amb + '%"></b></div>' +
          '<span class="small" style="width:220px;font-weight:700;color:' + (v === null ? 'var(--muted)' : ok ? 'var(--blue)' : 'var(--red)') + '">' + (v === null ? 'Belum ada data' : K3.num(v) + ' · ' + x.status + ' · ' + K3.num(x.persenLulus) + '% ≥ ambang') + '</span></div>';
      }).join('');
    }
    function load(k) {
      api('dosenOBE', { kelas: k }).then(function (o) {
        if (!K3.$('#oout')) return;
        var h = '<div class="card stack"><div class="row" style="justify-content:space-between"><h2>Ketercapaian CPL</h2><span class="chip amber">Ambang ' + o.ambang + '</span></div>' + bars(o.ringkasan.cpl, o.ambang) + '</div>';
        h += '<div class="card stack"><h2>Ketercapaian CPMK</h2>' + bars(o.ringkasan.cpmk, o.ambang) + '</div>';
        h += '<div class="card stack"><h2>Ketercapaian Sub-CPMK</h2>' + bars(o.ringkasan.sub, o.ambang) + '</div>';
        h += '<div class="card stack"><h2>Pemetaan</h2><div class="tbl"><table><thead><tr><th>Sub-CPMK</th><th>Materi</th><th>CPMK</th><th>CPL</th></tr></thead><tbody>' +
          o.obe.map(function (x) { return '<tr><td>' + K3.esc(x.sub) + '</td><td>' + K3.esc(x.materi) + '</td><td>' + K3.esc(x.cpmk) + '</td><td>' + K3.esc(x.cpl.join(', ')) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
        K3.$('#oout').className = 'stack'; K3.$('#oout').innerHTML = h;
      }).catch(function (e) { if (K3.$('#oout')) K3.$('#oout').innerHTML = '<div class="msg err">' + K3.esc(e.message) + '</div>'; });
    }
    K3.$('#selKelasO').onchange = function () { load(this.value); };
    load('');
  }

  // ---------- dashboard ----------
  function hbar(label, v, max, color, txt) {
    var w = max ? Math.max(0, Math.min(100, v / max * 100)) : 0;
    return '<div style="display:flex;gap:10px;align-items:center"><span style="width:54px;flex:none;font-weight:800;font-size:13px">' + K3.esc(label) + '</span><div class="obebar" style="flex:1 1 60px;min-width:60px;height:16px" role="img" aria-label="' + K3.esc(label + ' ' + txt) + '"><i style="width:' + w + '%;background:' + color + '"></i></div><span class="small" style="width:96px;flex:none;font-weight:700">' + K3.esc(txt) + '</span></div>';
  }
  function dash() {
    main('<div class="row" style="justify-content:space-between;align-items:flex-end"><div><h1>Dashboard</h1><p class="muted" style="margin:4px 0 0">Ringkasan per modul. Sheet Dashboard berisi tabel dan grafik yang sama.</p></div>' + kelasSelect('selKelasD', true) + '</div><div id="dout" class="loading"><div class="spinner"></div></div>');
    function load(k) {
      api('dosenDashboard', { kelas: k }).then(function (d) {
        if (!K3.$('#dout')) return;
        var aktif = d.modul.filter(function (m) { return m.rataProgres || m.sudahLatihan || m.sudahUjian || m.materiSelesai; });
        var list = aktif.length ? aktif : d.modul.slice(0, 3);
        var maxM = Math.max.apply(null, list.map(function (m) { return m.mahasiswa; }).concat([1]));
        var maxP = Math.max.apply(null, list.map(function (m) { return m.pelLatihan + m.pelUjian; }).concat([1]));
        var h = '<div class="tbl"><table><thead><tr><th>Modul</th><th>Judul</th><th class="c">Mahasiswa</th><th class="c">Materi selesai</th><th class="c">Rata progres</th><th class="c">Rata menit</th><th class="c">Latihan (n / rata)</th><th class="c">Ujian (n / rata)</th><th class="c">Lulus</th><th class="c">Pelanggaran L / U</th></tr></thead><tbody>' +
          d.modul.map(function (m) { var f = function (v) { return v === null ? '–' : K3.num(v); };
            return '<tr><td>P' + m.no + '</td><td>' + K3.esc(m.judul) + '</td><td class="c">' + m.mahasiswa + '</td><td class="c">' + m.materiSelesai + '</td><td class="c">' + f(m.rataProgres) + (m.rataProgres === null ? '' : '%') + '</td><td class="c">' + f(m.rataMenit) + '</td><td class="c">' + m.sudahLatihan + ' / ' + f(m.rataLatihan) + '</td><td class="c">' + m.sudahUjian + ' / ' + f(m.rataUjian) + '</td><td class="c"><b>' + m.lulus + '</b></td><td class="c">' + m.pelLatihan + ' / ' + m.pelUjian + '</td></tr>'; }).join('') + '</tbody></table></div>';
        h += '<div class="grid2">';
        h += '<div class="card stack"><h2>Mahasiswa lulus per modul</h2>' + list.map(function (m) { return hbar('P' + m.no, m.lulus, maxM, 'var(--green)', m.lulus + ' dari ' + m.mahasiswa); }).join('') + '</div>';
        h += '<div class="card stack"><h2>Rata-rata progres materi</h2>' + list.map(function (m) { return hbar('P' + m.no, m.rataProgres || 0, 100, 'var(--blue)', m.rataProgres === null ? 'belum ada' : K3.num(m.rataProgres) + '%'); }).join('') + '</div>';
        h += '<div class="card stack"><h2>Rata-rata latihan dan ujian</h2>' + list.map(function (m) { return hbar('P' + m.no + ' L', m.rataLatihan || 0, 100, 'var(--amber)', m.rataLatihan === null ? 'belum ada' : K3.num(m.rataLatihan)) + hbar('P' + m.no + ' U', m.rataUjian || 0, 100, 'var(--ink)', m.rataUjian === null ? 'belum ada' : K3.num(m.rataUjian)); }).join('') + '</div>';
        h += '<div class="card stack"><h2>Pelanggaran per modul</h2>' + list.map(function (m) { return hbar('P' + m.no + ' L', m.pelLatihan, maxP, 'var(--amber)', m.pelLatihan + ' latihan') + hbar('P' + m.no + ' U', m.pelUjian, maxP, 'var(--red)', m.pelUjian + ' ujian'); }).join('') + '</div>';
        h += '</div><div class="small muted">Grafik hanya menampilkan modul yang sudah ada aktivitasnya (' + list.length + ' dari 14). Grafik CPL, CPMK, dan Sub-CPMK ada di tab Analisis OBE.</div>';
        K3.$('#dout').className = 'stack'; K3.$('#dout').innerHTML = h + '<div id="petad" class="stack"></div>';
        petaSection('#petad');
      }).catch(function (e) { if (K3.$('#dout')) K3.$('#dout').innerHTML = '<div class="msg err">' + K3.esc(e.message) + '</div>'; });
    }
    K3.$('#selKelasD').onchange = function () { load(this.value); };
    load('');
  }

  // ---------- analisis butir ----------
  function cellBg(v) { return v === undefined ? '#F3F2EE' : v >= 0.999 ? 'var(--green-soft)' : v > 0 ? 'var(--amber-soft)' : 'var(--red-soft)'; }
  function butir() {
    var d = st.data;
    var opt = function (arr, cur) { return arr.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === cur ? ' selected' : '') + '>' + K3.esc(x[1]) + '</option>'; }).join(''); };
    main('<div><h1>Analisis butir</h1><p class="muted" style="margin:4px 0 0">Per soal (tingkat kesukaran, daya beda) dan per mahasiswa (benar/salah setiap soal). Klik baris mahasiswa untuk melihat jawabannya dibanding kunci. Sama dengan sheet AnalisisButir dan ButirMahasiswa.</p></div>' +
      '<div class="row" style="align-items:flex-end">' +
      '<label class="f" style="min-width:240px">Materi<select class="inp" id="bM">' + opt(d.materi.map(function (m) { return [m.id, 'P' + m.no + ' · ' + m.judul]; }), st.materi) + '</select></label>' +
      '<label class="f">Mode<select class="inp" id="bMo">' + opt([['ujian', 'Ujian'], ['latihan', 'Latihan']], st.bmode) + '</select></label>' +
      '<label class="f">Percobaan<select class="inp" id="bP">' + opt([['terbaik', 'Nilai terbaik'], ['terakhir', 'Terakhir'], ['semua', 'Semua percobaan']], st.bpilih) + '</select></label>' +
      kelasSelect('bK', true) + '</div><div id="bout2" class="loading"><div class="spinner"></div></div><div id="bdet"></div>');
    var kelas = '';
    function load() {
      var box = K3.$('#bout2'); box.className = 'loading'; box.innerHTML = '<div class="spinner"></div>'; K3.$('#bdet').innerHTML = '';
      Promise.all([api('dosenButirMhs', { materi: st.materi, mode: st.bmode, kelas: kelas, pilih: st.bpilih }), api('dosenButir', { materi: st.materi, mode: st.bmode, kelas: kelas })]).then(function (res) {
        var m = res[0], a = res[1];
        var h = '<div class="card stack"><h2>Per soal</h2>';
        h += a.rows.length ? '<div class="tbl"><table><thead><tr>' + a.head.map(function (x) { return '<th>' + K3.esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>' + a.rows.map(function (r) { return '<tr>' + r.map(function (v) { return '<td>' + K3.esc(v === '' ? '–' : v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' : '<div class="muted">Belum ada jawaban.</div>';
        h += '</div><div class="card stack"><div class="row" style="justify-content:space-between"><h2>Per mahasiswa (' + m.mahasiswa.length + ')</h2><span class="small"><span class="chip green">1 benar</span> <span class="chip amber">sebagian</span> <span class="chip red">0 salah</span> <span class="chip">– tidak diterima</span></span></div>';
        if (!m.mahasiswa.length) h += '<div class="muted">Belum ada ' + st.bmode + ' yang selesai untuk materi ini.</div>';
        else {
          h += '<div class="tbl"><table id="bmx"><thead><tr><th>NIM</th><th>Nama</th><th class="c">Ke</th><th class="c">Nilai</th><th class="c">Pel.</th><th class="c">C1</th><th class="c">C2</th><th class="c">C3</th><th class="c">C4</th>' +
            m.soal.map(function (q) { return '<th class="c small" title="' + K3.esc(q.tipe + ' · ' + q.level) + '">' + K3.esc(q.id.replace(/^M\d+-/, '')) + '<br><span class="muted">' + K3.esc(q.level) + '</span></th>'; }).join('') + '</tr></thead><tbody>';
          m.mahasiswa.forEach(function (r, i) {
            var lv = function (L) { return r.perLevel[L] === undefined ? '–' : K3.num(r.perLevel[L]) + '%'; };
            h += '<tr data-at="' + K3.esc(r.attempt) + '" tabindex="0" style="cursor:pointer" aria-label="Rincian jawaban ' + K3.esc(r.nim) + '"><td>' + K3.esc(r.nim) + '</td><td>' + K3.esc(r.nama) + '</td><td class="c">' + r.ke + '/' + r.dari + '</td><td class="c"><b>' + K3.num(r.skor) + '</b></td><td class="c">' + r.pelanggaran + '</td><td class="c">' + lv('C1') + '</td><td class="c">' + lv('C2') + '</td><td class="c">' + lv('C3') + '</td><td class="c">' + lv('C4') + '</td>' +
              m.soal.map(function (q) { var v = r.cells[q.id]; return '<td class="c" style="background:' + cellBg(v) + '">' + (v === undefined ? '–' : K3.num(v)) + '</td>'; }).join('') + '</tr>';
          });
          h += '<tr><td colspan="9"><b>Proporsi benar (p)</b></td>' + m.soal.map(function (q) { return '<td class="c"><b>' + (q.p === null ? '–' : K3.num(q.p)) + '</b></td>'; }).join('') + '</tr></tbody></table></div>';
        }
        box.className = 'stack'; box.innerHTML = h + '</div>';
        K3.$$('#bmx [data-at]').forEach(function (tr) {
          var go = function () { detail(tr.getAttribute('data-at')); };
          tr.onclick = go; tr.onkeydown = function (e) { if (e.key === 'Enter') go(); };
        });
      }).catch(function (e) { box.className = ''; box.innerHTML = '<div class="msg err">' + K3.esc(e.message) + '</div>'; });
    }
    function detail(id) {
      var box = K3.$('#bdet'); box.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      api('dosenButirDetail', { attempt: id }).then(function (r) {
        var h = '<div class="card stack" id="bdetcard"><div class="row" style="justify-content:space-between"><h2>' + K3.esc(r.nim + ' · ' + r.nama) + '</h2><span class="chip blue">' + K3.esc(r.mode) + ' · nilai ' + K3.num(r.skor) + ' · pelanggaran ' + r.pelanggaran + '</span></div>' +
          '<div class="small muted">Percobaan ' + K3.esc(r.attempt) + ' · mulai ' + K3.esc(K3.fmtTgl(r.mulai)) + ' · selesai ' + K3.esc(K3.fmtTgl(r.selesai)) + '</div>' +
          '<div class="tbl"><table><thead><tr><th>No</th><th>Soal</th><th>Level</th><th>Jawaban mahasiswa</th><th>Kunci</th><th class="c">Skor</th></tr></thead><tbody>' +
          r.butir.map(function (b) { return '<tr><td>' + b.no + '<div class="small muted">' + K3.esc(b.id) + '</div></td><td class="small" style="min-width:240px">' + K3.esc(b.soal) + '<div class="muted">' + K3.esc(b.tipe) + '</div></td><td>' + K3.esc(b.level) + '</td><td class="small">' + K3.esc(b.jawaban || '(kosong)') + '</td><td class="small">' + K3.esc(b.kunci) + '</td><td class="c" style="background:' + cellBg(b.skor) + '"><b>' + K3.num(b.skor) + '</b></td></tr>'; }).join('') +
          '</tbody></table></div></div>';
        box.innerHTML = h; box.scrollIntoView({ block: 'start' });
      }).catch(function (e) { box.innerHTML = '<div class="msg err">' + K3.esc(e.message) + '</div>'; });
    }
    K3.$('#bM').onchange = function () { st.materi = this.value; load(); };
    K3.$('#bMo').onchange = function () { st.bmode = this.value; load(); };
    K3.$('#bP').onchange = function () { st.bpilih = this.value; load(); };
    K3.$('#bK').onchange = function () { kelas = this.value; load(); };
    load();
  }

  // ---------- peta bank soal (per sub-materi × level) ----------
  function petaHtml(m) {
    var LV = ['C1', 'C2', 'C3', 'C4'];
    var h = '<div class="card stack"><div class="row" style="justify-content:space-between"><h2>P' + m.no + ' · ' + K3.esc(m.judul) + '</h2>' +
      (m.cukup ? '<span class="chip green">Stok cukup</span>' : '<span class="chip red">Stok kurang</span>') + '</div>' +
      '<div class="tbl"><table class="peta"><thead><tr><th>Sub-materi</th>' + LV.map(function (L) { return '<th class="c">' + L + '</th>'; }).join('') + '<th class="c">Jumlah</th></tr></thead><tbody>' +
      m.baris.map(function (b) { return '<tr><td>' + K3.esc(b.bagian) + '</td>' + LV.map(function (L) { return '<td class="c">' + b[L] + '</td>'; }).join('') + '<td class="c">' + b.jumlah + '</td></tr>'; }).join('') +
      '<tr><td><b>Total</b></td>' + LV.map(function (L) { return '<td class="c"><b>' + m.total[L] + '</b></td>'; }).join('') + '<td class="c"><b>' + m.total.jumlah + '</b></td></tr></tbody></table></div>' +
      '<div class="tbl"><table><thead><tr><th>Stok vs kisi-kisi</th>' + LV.map(function (L) { return '<th class="c">' + L + '</th>'; }).join('') + '</tr></thead><tbody>' +
      ['latihan', 'ujian'].map(function (mode) {
        return '<tr><td>' + mode + ' (tersedia / diambil)</td>' + LV.map(function (L) {
          var have = m.stok[mode][L] || 0, need = m.kisi[mode][L];
          return '<td class="c" style="background:' + (need > have ? 'var(--red-soft)' : 'var(--green-soft)') + '">' + have + ' / ' + need + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="small muted">' + (m.studiKasus ? m.studiKasus + ' studi kasus (' + m.soalKasus + ' soal) · ' : '') + 'Tipe soal: ' + Object.keys(m.tipe).map(function (t) { return K3.esc(t) + ' ' + m.tipe[t]; }).join(' · ') + '</div></div>';
    return h;
  }
  function petaSection(boxSel) {
    var box = K3.$(boxSel); if (!box) return;
    box.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    api('dosenPetaBank', {}).then(function (d) {
      box.innerHTML = '<h2 style="margin:0">Peta bank soal per sub-materi</h2><p class="muted small" style="margin:0">Jumlah soal aktif per sub-materi dan level C1–C4. Sama dengan sheet PetaBank.</p>' +
        (d.materi.length ? d.materi.map(petaHtml).join('') : '<div class="muted">Bank soal masih kosong.</div>');
    }).catch(function (e) { box.innerHTML = '<div class="msg err">' + K3.esc(e.message) + '</div>'; });
  }

  // ---------- cek bank ----------
  function bank() {
    main('<h1>Cek bank soal</h1><p class="muted" style="margin:0">Memeriksa format setiap soal (25 kali dibangkitkan acak) dan kecukupan stok terhadap kisi-kisi.</p><div id="bout" class="loading"><div class="spinner"></div>Memeriksa…</div><div id="petab" class="stack"></div>');
    petaSection('#petab');
    api('dosenCekBank').then(function (c) {
      if (!K3.$('#bout')) return;
      var h = '<div class="card stack"><h2>' + c.total + ' soal di bank</h2>';
      h += c.masalah.length ? '<div class="msg err">' + c.masalah.length + ' soal bermasalah.</div><div class="tbl"><table><thead><tr><th>ID</th><th>Materi</th><th>Tipe</th><th>Masalah</th></tr></thead><tbody>' + c.masalah.map(function (r) { return '<tr>' + r.map(function (v) { return '<td>' + K3.esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' : '<div class="msg ok">Tidak ada masalah format.</div>';
      h += '</div><div class="card stack"><h2>Stok terhadap kisi-kisi</h2>';
      h += c.kurang.length ? '<div class="small muted">Materi yang belum punya soal ikut tercantum. Isi bank soal atau turunkan kisi-kisi.</div><div class="tbl"><table><thead><tr><th>Materi</th><th>Mode</th><th>Level</th><th>Diminta</th><th>Tersedia</th></tr></thead><tbody>' + c.kurang.map(function (r) { return '<tr>' + r.map(function (v) { return '<td>' + K3.esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' : '<div class="msg ok">Stok cukup untuk semua kisi-kisi.</div>';
      K3.$('#bout').className = 'stack'; K3.$('#bout').innerHTML = h + '</div>';
    }).catch(function (e) { if (K3.$('#bout')) K3.$('#bout').innerHTML = '<div class="msg err">' + K3.esc(e.message) + '</div>'; });
  }
})(window.K3);

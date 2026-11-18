/* Pustaka infografis bergerak bersama untuk semua materi (K3.IG). Tidak berisi soal atau kunci. */
(function () {
  K3.IG = (function () {
  var C = { ink: '#17202B', amb: '#F2B705', red: '#B42318', grn: '#1F7A4D', blu: '#1D5FA8', org: '#E07A2E', gry: '#D9D6CC', mut: '#5B6573', lb: '#E7F0FA', ly: '#FDF1CC', lg: '#E3F1E9', lr: '#FBE9E7', pap: '#FFFFFF' };
  function svg(vb, label, inner) { return '<svg viewBox="0 0 ' + vb + '" role="img" aria-label="' + label + '">' + inner + '</svg>'; }
  function T(x, y, t, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" font-size="' + (o.s || 20) + '" font-weight="' + (o.w || 800) + '" fill="' + (o.c || C.ink) + '" text-anchor="' + (o.a || 'middle') + '">' + t + '</text>';
  }
  function S(k, cls, extra) { return ' data-s="' + k + '" class="' + (cls || 'up') + '"' + (extra || ''); }
  function O(k, cls) { return ' data-only="' + k + '"' + (cls ? ' class="' + cls + '"' : ''); }
  function at(x, y, sc) { return ' transform="translate(' + x + ',' + y + ')' + (sc ? ' scale(' + sc + ')' : '') + '"'; }
  function gear(r, n, fill) {
    var p = [], i, a, R;
    for (i = 0; i < n * 4; i++) { a = i / (n * 4) * Math.PI * 2; R = (i % 4 < 2) ? r : r * 0.78; p.push((R * Math.cos(a)).toFixed(1) + ',' + (R * Math.sin(a)).toFixed(1)); }
    return '<polygon points="' + p.join(' ') + '" fill="' + fill + '"/><circle r="' + (r * 0.3) + '" fill="#fff"/>';
  }
  // Ikon (berpusat di 0,0; kira-kira 60 x 60)
  var I = {
    helm: '<path d="M-28,8 a28,27 0 0 1 56,0 z" fill="' + C.amb + '"/><rect x="-35" y="5" width="70" height="9" rx="4" fill="#D9A400"/><rect x="-4" y="-19" width="8" height="25" rx="3" fill="#D9A400"/>',
    rompi: '<path d="M-26,-26 l12,-5 l14,15 l14,-15 l12,5 v56 h-52z" fill="' + C.org + '"/><rect x="-26" y="4" width="52" height="5" fill="#fff"/><rect x="-26" y="15" width="52" height="5" fill="#fff"/><path d="M0,-16 v46" stroke="#B85A15" stroke-width="2"/>',
    sarung: '<path d="M-18,30 v-28 v-14 a5,5 0 0 1 10,0 v8 v-16 a5,5 0 0 1 10,0 v14 v-10 a5,5 0 0 1 10,0 v12 v-4 a5,5 0 0 1 10,0 v20 q0,18 -16,18 h-8 q-16,0 -16,-18z" fill="' + C.amb + '" stroke="#C99700" stroke-width="2"/>',
    sepatu: '<path d="M-28,22 v-36 h22 v20 l24,7 q10,3 10,12 v5 h-56z" fill="#6B4426"/><rect x="-30" y="20" width="60" height="8" rx="3" fill="' + C.ink + '"/>',
    warn: '<path d="M0,-27 L29,23 H-29Z" fill="' + C.amb + '" stroke="' + C.ink + '" stroke-width="4" stroke-linejoin="round"/><rect x="-3" y="-10" width="6" height="18" rx="2" fill="' + C.ink + '"/><circle cy="15" r="3.5" fill="' + C.ink + '"/>',
    home: '<path d="M-28,-2 L0,-28 L28,-2" fill="none" stroke="' + C.ink + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="-20" y="-6" width="40" height="32" rx="3" fill="' + C.blu + '"/><rect x="-6" y="8" width="12" height="18" fill="#fff"/>',
    pabrik: '<path d="M-30,28 v-30 l14,-10 v10 l14,-10 v10 l14,-10 v-12 h10 v52z" fill="' + C.mut + '"/><rect x="-22" y="8" width="8" height="8" fill="' + C.amb + '"/><rect x="-8" y="8" width="8" height="8" fill="' + C.amb + '"/><rect x="6" y="8" width="8" height="8" fill="' + C.amb + '"/>',
    orang: '<circle cy="-16" r="11" fill="' + C.ink + '"/><path d="M-20,28 v-16 q0,-14 20,-14 q20,0 20,14 v16z" fill="' + C.ink + '"/>',
    orangX: '<circle cy="-16" r="11" fill="' + C.ink + '"/><path d="M-20,28 v-16 q0,-14 20,-14 q20,0 20,14 v16z" fill="' + C.ink + '"/><circle cx="20" cy="-18" r="12" fill="' + C.red + '"/><path d="M15,-23 l10,10 M25,-23 l-10,10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
    sistem: '<rect x="-22" y="-26" width="44" height="54" rx="5" fill="#fff" stroke="' + C.ink + '" stroke-width="4"/><rect x="-10" y="-31" width="20" height="10" rx="3" fill="' + C.ink + '"/><path d="M-12,-4 h24 M-12,8 h14" stroke="' + C.mut + '" stroke-width="4" stroke-linecap="round"/><path d="M8,6 l12,12 M20,6 l-12,12" stroke="' + C.red + '" stroke-width="4" stroke-linecap="round"/>',
    kabel: '<path d="M-30,10 q15,-20 30,0 t30,0" fill="none" stroke="' + C.ink + '" stroke-width="7" stroke-linecap="round"/><path d="M-4,4 q4,-6 8,0" stroke="' + C.org + '" stroke-width="7" fill="none"/><path class="blink" d="M2,-12 l-6,10 h7 l-5,10" stroke="' + C.amb + '" stroke-width="3" fill="none" stroke-linejoin="round"/>',
    petir: '<path d="M6,-30 L-14,4 H0 L-6,30 L16,-6 H2 Z" fill="' + C.amb + '" stroke="' + C.ink + '" stroke-width="3" stroke-linejoin="round"/>',
    bendera: '<path d="M-14,30 v-60" stroke="' + C.ink + '" stroke-width="5" stroke-linecap="round"/><path d="M-12,-28 h30 l-8,10 l8,10 h-30z" fill="' + C.blu + '"/>',
    plester: '<rect x="-30" y="-11" width="60" height="22" rx="11" fill="#E9B78C" transform="rotate(-30)"/><rect x="-10" y="-9" width="20" height="18" fill="#F7DCC0" transform="rotate(-30)"/>',
    telinga: '<path d="M-6,22 q-16,-2 -14,-24 q2,-22 22,-22 q18,0 18,18 q0,12 -10,18 q-6,4 -6,10 q0,8 -10,0" fill="none" stroke="' + C.ink + '" stroke-width="5" stroke-linecap="round"/><path d="M24,-12 q8,10 0,20 M32,-20 q14,18 0,36" fill="none" stroke="' + C.blu + '" stroke-width="4" stroke-linecap="round"/>',
    kapak: '<rect x="-4" y="-26" width="8" height="56" rx="3" fill="#8B5A2B" transform="rotate(25)"/><path d="M-22,-26 l22,-6 l8,20 l-26,4z" fill="' + C.mut + '"/>',
    prasasti: '<rect x="-24" y="-30" width="48" height="60" rx="14" fill="#C9A26B"/><path d="M-14,-16 h28 M-14,-6 h22 M-14,4 h28 M-14,14 h18" stroke="#7A5A30" stroke-width="4" stroke-linecap="round" stroke-dasharray="4 4"/>',
    dok: '<path d="M-22,-30 h30 l14,14 v46 h-44z" fill="#fff" stroke="' + C.ink + '" stroke-width="4" stroke-linejoin="round"/><path d="M8,-30 v14 h14" fill="none" stroke="' + C.ink + '" stroke-width="4"/><path d="M-12,-6 h24 M-12,6 h24 M-12,18 h16" stroke="' + C.mut + '" stroke-width="4" stroke-linecap="round"/>',
    perisai: '<path d="M0,-32 L28,-21 V2 Q28,24 0,34 Q-28,24 -28,2 V-21Z" fill="' + C.grn + '"/><path d="M-12,0 l9,9 l16,-18" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    api: '<path d="M0,30 q-24,0 -24,-22 q0,-18 16,-34 q0,16 10,20 q4,-12 -2,-24 q24,14 24,38 q0,22 -24,22z" fill="' + C.org + '"/><path d="M0,30 q-10,0 -10,-10 q0,-10 10,-18 q10,8 10,18 q0,10 -10,10z" fill="' + C.amb + '"/>',
    labu: '<path d="M-8,-28 h16 M-5,-28 v18 l-20,32 q-4,8 6,8 h38 q10,0 6,-8 l-20,-32 v-18" fill="none" stroke="' + C.ink + '" stroke-width="4" stroke-linejoin="round"/><path d="M-17,12 h34 l6,10 q2,6 -4,6 h-38 q-6,0 -4,-6z" fill="' + C.blu + '"/>',
    hati: '<path d="M0,26 q-30,-18 -30,-36 q0,-16 15,-16 q10,0 15,10 q5,-10 15,-10 q15,0 15,16 q0,18 -30,36z" fill="' + C.red + '"/>',
    asap: '<path d="M-28,10 q-6,-18 12,-20 q4,-16 22,-12 q16,-8 22,10 q14,2 10,16 q-2,10 -14,8 h-40 q-14,0 -12,-2z" fill="' + C.mut + '"/><path d="M-16,24 v8 M0,24 v12 M16,24 v8" stroke="' + C.blu + '" stroke-width="4" stroke-linecap="round"/>',
    palang: '<rect x="-26" y="-26" width="52" height="52" rx="12" fill="' + C.red + '"/><path d="M0,-14 v28 M-14,0 h28" stroke="#fff" stroke-width="8" stroke-linecap="round"/>',
    tamu: '<circle cy="-16" r="11" fill="' + C.blu + '"/><path d="M-20,28 v-16 q0,-14 20,-14 q20,0 20,14 v16z" fill="' + C.blu + '"/><rect x="-9" y="6" width="18" height="12" rx="2" fill="#fff"/>',
    pekerja: '<circle cy="-14" r="11" fill="' + C.ink + '"/><path d="M-13,-20 a13,12 0 0 1 26,0z" fill="' + C.amb + '"/><rect x="-16" y="-22" width="32" height="4" rx="2" fill="#D9A400"/><path d="M-20,28 v-16 q0,-14 20,-14 q20,0 20,14 v16z" fill="' + C.org + '"/>',
    koin: '<circle r="26" fill="' + C.amb + '"/><circle r="19" fill="none" stroke="#C99700" stroke-width="3"/><text y="8" font-size="22" font-weight="800" text-anchor="middle" fill="' + C.ink + '">Rp</text>',
    piramida: '<path d="M0,-28 L12,-8 H-12Z" fill="' + C.red + '"/><path d="M-14,-4 H14 L22,10 H-22Z" fill="' + C.org + '"/><path d="M-24,14 H24 L32,28 H-32Z" fill="' + C.amb + '"/>',
    gedung: '<rect x="-22" y="-28" width="44" height="58" rx="3" fill="' + C.blu + '"/><path d="M-12,-18 h8 M4,-18 h8 M-12,-4 h8 M4,-4 h8 M-12,10 h8 M4,10 h8" stroke="#fff" stroke-width="5"/>'
  };

  // ikon tambahan (Modul 2 dst)
  I.uu = '<rect x="-24" y="-30" width="48" height="60" rx="4" fill="' + C.red + '"/><rect x="-18" y="-24" width="36" height="48" rx="2" fill="#fff"/><path d="M-11,-12 h22 M-11,-3 h22 M-11,6 h16 M-11,15 h12" stroke="' + C.ink + '" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="16" r="7" fill="' + C.amb + '"/>';
  I.timbangan = '<path d="M0,-28 v54 M-18,26 h36 M-26,-18 h52" stroke="' + C.ink + '" stroke-width="4" stroke-linecap="round"/><path d="M-26,-18 l-10,20 h20z M26,-18 l-10,20 h20z" fill="' + C.amb + '" stroke="' + C.ink + '" stroke-width="2.5" stroke-linejoin="round"/>';
  I.gerbang = '<rect x="-30" y="-24" width="8" height="52" fill="' + C.ink + '"/><rect x="22" y="-24" width="8" height="52" fill="' + C.ink + '"/><rect x="-22" y="-14" width="44" height="7" fill="' + C.amb + '"/><rect x="-22" y="-14" width="11" height="7" fill="' + C.ink + '"/><rect x="0" y="-14" width="11" height="7" fill="' + C.ink + '"/>';
  I.palu = '<rect x="-26" y="-22" width="30" height="16" rx="4" fill="#8B5A2B" transform="rotate(-35)"/><rect x="-3" y="-8" width="7" height="40" rx="3" fill="#8B5A2B" transform="rotate(-35)"/><rect x="-28" y="22" width="40" height="8" rx="3" fill="' + C.ink + '"/>';
  I.kalender = '<rect x="-26" y="-22" width="52" height="50" rx="6" fill="#fff" stroke="' + C.ink + '" stroke-width="4"/><rect x="-26" y="-22" width="52" height="14" rx="6" fill="' + C.red + '"/><path d="M-14,-30 v12 M14,-30 v12" stroke="' + C.ink + '" stroke-width="4" stroke-linecap="round"/><text y="20" font-size="20" font-weight="800" text-anchor="middle" fill="' + C.ink + '">12</text>';
  I.dokter = '<path d="M-14,-26 v18 q0,16 14,16 q14,0 14,-16 v-18" fill="none" stroke="' + C.ink + '" stroke-width="4" stroke-linecap="round"/><path d="M0,8 v8 q0,14 14,14 q10,0 10,-10 v-6" fill="none" stroke="' + C.ink + '" stroke-width="4"/><circle cx="24" cy="10" r="7" fill="' + C.blu + '"/>';
  I.papan = '<rect x="-28" y="-26" width="56" height="40" rx="4" fill="#fff" stroke="' + C.ink + '" stroke-width="4"/><path d="M-18,-14 h36 M-18,-4 h36 M-18,6 h22" stroke="' + C.mut + '" stroke-width="3.5" stroke-linecap="round"/><path d="M-14,14 v16 M14,14 v16" stroke="' + C.ink + '" stroke-width="4"/>';
  I.panel = '<rect x="-22" y="-28" width="44" height="58" rx="4" fill="' + C.mut + '"/><rect x="-16" y="-22" width="32" height="20" rx="2" fill="#fff"/><path d="M4,-20 l-8,9 h6 l-4,8" stroke="' + C.amb + '" stroke-width="3" fill="none" stroke-linejoin="round"/><circle cx="-8" cy="12" r="4" fill="' + C.grn + '"/><circle cx="8" cy="12" r="4" fill="' + C.red + '"/>';
  I.kapal = '<path d="M-30,6 h60 l-10,18 h-40z" fill="' + C.blu + '"/><rect x="-12" y="-16" width="24" height="22" fill="#fff" stroke="' + C.ink + '" stroke-width="3"/><path d="M0,-28 v12" stroke="' + C.ink + '" stroke-width="3"/><path d="M-34,28 q8,-6 16,0 t16,0 t16,0 t16,0" stroke="' + C.blu + '" stroke-width="3" fill="none"/>';
  I.tambang = '<path d="M-30,28 L0,-20 L30,28Z" fill="#8B6B4A"/><path d="M-10,28 v-14 a10,10 0 0 1 20,0 v14z" fill="' + C.ink + '"/><path d="M-22,-24 l14,14 M-8,-24 l-14,14" stroke="' + C.mut + '" stroke-width="4" stroke-linecap="round"/>';
  I.pesawat = '<path d="M-30,4 L30,-6 q8,0 4,6 L-26,10z" fill="' + C.blu + '"/><path d="M0,0 l-14,-22 h8 l18,20z M-2,6 l-10,18 h8 l14,-18z" fill="' + C.mut + '"/>';
  I.menara = '<path d="M0,-30 L-16,30 M0,-30 L16,30 M-12,14 h24 M-8,-2 h16 M-5,-16 h10" stroke="' + C.ink + '" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M8,-30 q8,6 0,14 M14,-34 q14,10 0,24" stroke="' + C.red + '" stroke-width="3" fill="none"/>';
  I.kelompok = '<circle cx="-16" cy="-10" r="9" fill="' + C.blu + '"/><circle cx="16" cy="-10" r="9" fill="' + C.org + '"/><circle cy="-16" r="10" fill="' + C.ink + '"/><path d="M-30,24 v-8 q0,-12 14,-12 q14,0 14,12 v8z" fill="' + C.blu + '"/><path d="M2,24 v-8 q0,-12 14,-12 q14,0 14,12 v8z" fill="' + C.org + '"/><path d="M-14,26 v-10 q0,-14 14,-14 q14,0 14,14 v10z" fill="' + C.ink + '"/>';
  I.gembok = '<rect x="-20" y="-4" width="40" height="32" rx="5" fill="' + C.amb + '"/><path d="M-12,-4 v-10 a12,12 0 0 1 24,0 v10" fill="none" stroke="' + C.ink + '" stroke-width="5"/><circle cy="10" r="5" fill="' + C.ink + '"/>';
  I.lapor = '<path d="M-22,-30 h30 l14,14 v46 h-44z" fill="#fff" stroke="' + C.ink + '" stroke-width="4" stroke-linejoin="round"/><path d="M-12,-8 h24 M-12,4 h24 M-12,16 h14" stroke="' + C.mut + '" stroke-width="4" stroke-linecap="round"/><circle cx="18" cy="20" r="12" fill="' + C.red + '"/><path d="M18,13 v8 M18,26 v1" stroke="#fff" stroke-width="4" stroke-linecap="round"/>';

  // ikon tambahan (Modul 3)
  I.buku = '<path d="M-28,-22 q14,-6 28,2 q14,-8 28,-2 v46 q-14,-6 -28,2 q-14,-8 -28,-2z" fill="#fff" stroke="' + C.ink + '" stroke-width="4" stroke-linejoin="round"/><path d="M0,-20 v46" stroke="' + C.ink + '" stroke-width="3"/><path d="M-20,-8 h12 M-20,2 h12 M8,-8 h12 M8,2 h12" stroke="' + C.mut + '" stroke-width="3" stroke-linecap="round"/>';
  I.stres = '<circle r="22" fill="' + C.ly + '" stroke="' + C.ink + '" stroke-width="4"/><path d="M-10,-6 l6,4 M10,-6 l-6,4" stroke="' + C.ink + '" stroke-width="3.5" stroke-linecap="round"/><path d="M-9,12 q4,-5 9,0 q5,5 9,0" stroke="' + C.ink + '" stroke-width="3" fill="none"/><path d="M-20,-28 l5,8 l-8,-2 l6,9 M22,-30 l-4,9 l8,-3 l-6,9" stroke="' + C.red + '" stroke-width="3" fill="none" stroke-linejoin="round"/>';
  I.mesin = '<rect x="-30" y="-6" width="60" height="30" rx="4" fill="' + C.mut + '"/><rect x="-24" y="-24" width="22" height="18" rx="3" fill="' + C.blu + '"/><circle cx="14" cy="-14" r="10" fill="none" stroke="' + C.ink + '" stroke-width="4"/><circle cx="14" cy="-14" r="3" fill="' + C.ink + '"/><rect x="-22" y="4" width="10" height="8" fill="' + C.amb + '"/><rect x="-6" y="4" width="10" height="8" fill="' + C.grn + '"/>';
  I.jam = '<circle r="26" fill="#fff" stroke="' + C.ink + '" stroke-width="4"/><path d="M0,-16 v16 l11,8" stroke="' + C.ink + '" stroke-width="4" fill="none" stroke-linecap="round"/><circle r="3" fill="' + C.red + '"/>';
  I.kaca = '<circle cx="-6" cy="-6" r="17" fill="' + C.lb + '" stroke="' + C.ink + '" stroke-width="5"/><path d="M7,7 l18,18" stroke="' + C.ink + '" stroke-width="8" stroke-linecap="round"/>';
  I.target = '<circle r="26" fill="' + C.red + '"/><circle r="18" fill="#fff"/><circle r="10" fill="' + C.red + '"/><path d="M4,-4 l22,-22 M18,-26 h8 v8" stroke="' + C.ink + '" stroke-width="4" fill="none" stroke-linecap="round"/>';

  I.gear = function (r, cls, fill) { return '<g class="spin' + (cls ? ' ' + cls : '') + '">' + gear(r || 24, 8, fill || C.mut) + '</g>'; };
  function ik(n) { return typeof I[n] === 'function' ? I[n](24) : (I[n] || ''); }
  function icon(name, x, y, sc, attr) { return '<g' + at(x, y, sc) + '><g' + (attr || '') + '>' + I[name] + '</g></g>'; }
  /** Animasi otomatis: SVG/HTML + teks keterangan per adegan, mengikuti narasi. */
  function auto(v, A, body, caps, show) {
    v.innerHTML = body + '<p class="animmsg" aria-live="polite"></p>';
    var msg = v.querySelector('.animmsg');
    A.scenes(caps.length, { show: function (k) { msg.textContent = caps[k]; if (show) show(k); } });
  }
  function msgBox(v) { var p = document.createElement('p'); p.className = 'animmsg'; p.setAttribute('aria-live', 'polite'); v.appendChild(p); return p; }

  /** Pilah/cocokkan interaktif: tiap kartu dijawab dengan salah satu tombol pilihan; umpan balik per kartu. */
  function pilah(v, A, o) {
    var salah = 0, beres = {};
    v.innerHTML = (o.atas || '') + '<div class="pl">' + o.items.map(function (it, i) {
      return '<div class="pli" data-i="' + i + '"><div class="plt">' + (it.ikon ? '<svg viewBox="-40 -40 80 80" aria-hidden="true">' + ik(it.ikon) + '</svg>' : '') + '<span>' + it.t + '</span></div>' +
        '<div class="plb">' + o.opsi.map(function (op, j) { return '<button type="button" class="btn sm ghost" data-j="' + j + '">' + op + '</button>'; }).join('') + '</div><div class="plf" aria-live="polite"></div></div>';
    }).join('') + '</div>';
    var msg = msgBox(v);
    function reset() {
      salah = 0; beres = {};
      v.querySelectorAll('.pli').forEach(function (c) { c.className = 'pli'; c.querySelector('.plf').textContent = ''; c.querySelectorAll('button').forEach(function (b) { b.disabled = false; b.classList.remove('pick'); }); });
      msg.textContent = o.intro;
    }
    v.querySelectorAll('.pli').forEach(function (c) {
      var it = o.items[Number(c.getAttribute('data-i'))];
      c.querySelectorAll('button').forEach(function (b) {
        b.onclick = function () {
          var j = Number(b.getAttribute('data-j')), ok = j === it.k;
          c.querySelectorAll('button').forEach(function (x) { x.classList.toggle('pick', x === b); });
          c.className = 'pli ' + (ok ? 'ok' : 'no');
          c.querySelector('.plf').textContent = (ok ? '✓ ' : '✗ ') + (ok ? (it.f || 'Tepat.') : (it.fs || it.f || 'Belum tepat, coba lagi.'));
          if (ok) { beres[c.getAttribute('data-i')] = 1; c.querySelectorAll('button').forEach(function (x) { x.disabled = true; }); } else salah++;
          var n = Object.keys(beres).length;
          if (n === o.items.length) { msg.textContent = o.selesai + (salah ? ' (Anda sempat keliru ' + salah + ' kali.)' : ''); A.done(o.catat + ' · keliru ' + salah + ' kali'); }
          else msg.textContent = n + ' dari ' + o.items.length + ' sudah tepat.';
        };
      });
    });
    A.onReplay(reset); reset();
  }
  /** Peta kartu: klik kartu untuk membuka isinya; selesai bila semua dibuka. */
  function peta(v, A, o) {
    v.innerHTML = '<div class="pt" style="--kol:' + (o.kolom || 4) + '">' + o.items.map(function (it, i) {
      return '<button type="button" class="ptk" data-i="' + i + '" aria-expanded="false"><b>' + it.a + '</b><span>' + it.b + '</span></button>';
    }).join('') + '</div><div class="ptd" aria-live="polite"></div>';
    var msg = msgBox(v), det = v.querySelector('.ptd'), buka = {};
    function reset() { buka = {}; v.querySelectorAll('.ptk').forEach(function (b) { b.classList.remove('on', 'seen'); b.setAttribute('aria-expanded', 'false'); }); det.innerHTML = ''; det.className = 'ptd'; msg.textContent = o.intro; }
    v.querySelectorAll('.ptk').forEach(function (b) {
      b.onclick = function () {
        var i = Number(b.getAttribute('data-i')), it = o.items[i];
        v.querySelectorAll('.ptk').forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-expanded', 'false'); });
        b.classList.add('on', 'seen'); b.setAttribute('aria-expanded', 'true'); buka[i] = 1;
        det.className = 'ptd on'; det.innerHTML = '<b>' + it.a + ' · ' + it.b + '</b><br>' + it.isi;
        var n = Object.keys(buka).length;
        if (n === o.items.length) { msg.textContent = o.selesai; A.done(o.catat); } else msg.textContent = n + ' dari ' + o.items.length + ' sudah dibuka.';
      };
    });
    A.onReplay(reset); reset();
  }
  /** Daftar centang yang membuka sebuah tombol. */
  function centang(v, A, o) {
    v.innerHTML = '<div class="ck">' + o.items.map(function (t, i) { return '<button type="button" class="cki" data-i="' + i + '" aria-pressed="false"><span class="ckb"></span><span>' + t + '</span></button>'; }).join('') +
      '</div><div class="animctl"><button type="button" class="btn amber" id="ckgo" disabled>' + o.tombol + '</button></div>';
    var msg = msgBox(v), go = v.querySelector('#ckgo');
    function upd() { var n = v.querySelectorAll('.cki.on').length; go.disabled = n < o.items.length; if (n < o.items.length) msg.textContent = o.intro + ' (' + n + '/' + o.items.length + ')'; }
    function reset() { v.querySelectorAll('.cki').forEach(function (b) { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }); go.classList.remove('done'); upd(); }
    v.querySelectorAll('.cki').forEach(function (b) { b.onclick = function () { var on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); upd(); }; });
    go.onclick = function () { go.classList.add('done'); msg.textContent = o.selesai; A.done(o.catat); };
    A.onReplay(reset); reset();
  }
  return { ik: ik, pilah: pilah, peta: peta, centang: centang, C: C, svg: svg, T: T, S: S, O: O, at: at, I: I, icon: icon, auto: auto, msgBox: msgBox };
})();
})();

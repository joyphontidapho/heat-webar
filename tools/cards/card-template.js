/*
 * card-template.js — สร้างภาพการ์ดเป้าหมาย (SVG) ขนาด A5 แนวนอน
 * ใช้ในหน้า tools/cards/cards.html (เปิดผ่านเบราว์เซอร์)
 *
 * หลักการออกแบบเพื่อให้ MindAR จับภาพได้แม่น:
 *   - ลายเส้น/รูปทรงหลากหลาย ความต่างสีสูง กระจายทั่วการ์ด
 *   - ไม่ใช้ลายซ้ำ (รูปทรงพื้นหลังสุ่มแบบกำหนด seed ต่างกันทุกใบ)
 *   - ไม่มีพื้นที่สีเรียบขนาดใหญ่
 */
(function () {
  "use strict";
  var W = 2100, H = 1480; // หน่วย 0.1 มม. (210 × 148 มม.)
  var FONT = "Sarabun, 'Noto Sans Thai', sans-serif";

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var PALETTE = ["#0f172a", "#c2410c", "#1d4ed8", "#15803d", "#7c3aed", "#b45309", "#be123c", "#0e7490"];

  /** รูปทรงพื้นหลังแบบสุ่ม ไม่ซ้ำ (เพิ่มจุดเด่นให้ระบบจับภาพ) */
  function doodles(seed, zones) {
    var r = rng(seed), out = [];
    function blocked(x, y, s) {
      return zones.some(function (z) { return x + s > z[0] && x - s < z[0] + z[2] && y + s > z[1] && y - s < z[1] + z[3]; });
    }
    var tries = 0;
    while (out.length < 230 && tries < 5000) {
      tries++;
      var x = 40 + r() * (W - 80), y = 40 + r() * (H - 80);
      var s = 14 + r() * 34;
      if (blocked(x, y, s + 6)) continue;
      var c = PALETTE[Math.floor(r() * PALETTE.length)];
      var rot = Math.floor(r() * 360);
      var kind = Math.floor(r() * 7);
      var sw = (3 + r() * 4).toFixed(1);
      var g;
      if (kind === 0) g = '<circle cx="0" cy="0" r="' + s.toFixed(1) + '" fill="none" stroke="' + c + '" stroke-width="' + sw + '"/>';
      else if (kind === 1) g = '<polygon points="0,' + (-s).toFixed(1) + ' ' + (s * 0.87).toFixed(1) + ',' + (s / 2).toFixed(1) + ' ' + (-s * 0.87).toFixed(1) + ',' + (s / 2).toFixed(1) + '" fill="' + c + '"/>';
      else if (kind === 2) g = '<rect x="' + (-s / 2).toFixed(1) + '" y="' + (-s / 2).toFixed(1) + '" width="' + s.toFixed(1) + '" height="' + (s * 0.6).toFixed(1) + '" fill="none" stroke="' + c + '" stroke-width="' + sw + '"/>';
      else if (kind === 3) g = '<path d="M' + (-s) + ',0 q' + (s / 2) + ',' + (-s) + ' ' + s + ',0 t' + s + ',0" fill="none" stroke="' + c + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
      else if (kind === 4) g = '<path d="M0,' + (-s) + ' L' + (s * 0.3) + ',' + (-s * 0.3) + ' L' + s + ',0 L' + (s * 0.3) + ',' + (s * 0.3) + ' L0,' + s + ' L' + (-s * 0.3) + ',' + (s * 0.3) + ' L' + (-s) + ',0 L' + (-s * 0.3) + ',' + (-s * 0.3) + 'Z" fill="' + c + '"/>';
      else if (kind === 5) g = '<g fill="' + c + '"><circle cx="' + (-s * 0.6) + '" cy="0" r="' + (s * 0.35) + '"/><circle cx="' + (s * 0.6) + '" cy="' + (s * 0.2) + '" r="' + (s * 0.45) + '"/><line x1="' + (-s * 0.6) + '" y1="0" x2="' + (s * 0.6) + '" y2="' + (s * 0.2) + '" stroke="' + c + '" stroke-width="' + sw + '"/></g>';
      else g = '<path d="M' + (-s) + ',' + (-s * 0.4) + ' L' + s + ',' + (s * 0.4) + ' M' + (-s * 0.4) + ',' + s + ' L' + (s * 0.4) + ',' + (-s) + '" stroke="' + c + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
      out.push('<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + rot + ')">' + g + '</g>');
    }
    return out.join("");
  }

  // ---------------- ภาพประกอบของแต่ละฉาก ----------------
  function beaker(x, y, w, h, fill, label, waves) {
    var s = '<g transform="translate(' + x + ' ' + y + ')">';
    s += '<path d="M0,0 L0,' + h + ' Q0,' + (h + 30) + ' 30,' + (h + 30) + ' L' + (w - 30) + ',' + (h + 30) + ' Q' + w + ',' + (h + 30) + ' ' + w + ',' + h + ' L' + w + ',0" fill="none" stroke="#0f172a" stroke-width="10"/>';
    s += '<path d="M-20,-6 L' + (w + 20) + ',-6" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>';
    s += '<rect x="8" y="' + (h * 0.35) + '" width="' + (w - 16) + '" height="' + (h * 0.65 + 18) + '" fill="' + fill + '" opacity="0.35"/>';
    for (var i = 0; i < 5; i++) s += '<path d="M10,' + (h * 0.35 + 6 + i * 4) + ' q' + (w / 8) + ',-14 ' + (w / 4) + ',0 t' + (w / 4) + ',0 t' + (w / 4) + ',0 t' + (w / 4 - 20) + ',0" fill="none" stroke="' + fill + '" stroke-width="5" opacity="' + (i === 0 ? 1 : 0) + '"/>';
    for (var k = 1; k <= 4; k++) s += '<line x1="' + (w - 60) + '" y1="' + (h * k / 5) + '" x2="' + (w - 10) + '" y2="' + (h * k / 5) + '" stroke="#0f172a" stroke-width="6"/>';
    var r = rng(waves);
    for (var j = 0; j < 18; j++) s += '<circle cx="' + (30 + r() * (w - 60)).toFixed(0) + '" cy="' + (h * 0.42 + r() * h * 0.5).toFixed(0) + '" r="' + (12 + r() * 6).toFixed(0) + '" fill="' + fill + '" stroke="#0f172a" stroke-width="4"/>';
    s += '<text x="' + (w / 2) + '" y="' + (h + 100) + '" font-family="' + FONT + '" font-weight="700" font-size="56" text-anchor="middle" fill="#0f172a">' + esc(label) + '</text>';
    return s + "</g>";
  }
  function flame(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><path d="M0,-90 C40,-40 60,-10 40,30 C25,60 -25,60 -40,30 C-60,-10 -20,-30 0,-90Z" fill="#f97316" stroke="#7c2d12" stroke-width="8"/><path d="M0,-30 C20,0 25,15 15,35 C5,50 -15,50 -20,35 C-28,15 -10,0 0,-30Z" fill="#fde047"/></g>';
  }
  function snow(x, y, s) {
    var g = '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" stroke="#1d4ed8" stroke-width="10" stroke-linecap="round">';
    for (var a = 0; a < 6; a++) g += '<g transform="rotate(' + (a * 60) + ')"><line x1="0" y1="0" x2="0" y2="-70"/><line x1="0" y1="-45" x2="-18" y2="-62"/><line x1="0" y1="-45" x2="18" y2="-62"/></g>';
    return g + "</g>";
  }
  function thermometer(x, y, hgt, level, color) {
    return '<g transform="translate(' + x + ' ' + y + ')"><rect x="-18" y="0" width="36" height="' + hgt + '" rx="18" fill="#fff" stroke="#0f172a" stroke-width="8"/>' +
      '<rect x="-8" y="' + (hgt * (1 - level)) + '" width="16" height="' + (hgt * level) + '" fill="' + color + '"/>' +
      '<circle cx="0" cy="' + (hgt + 26) + '" r="34" fill="' + color + '" stroke="#0f172a" stroke-width="8"/></g>';
  }

  var ART = {
    "ar-1a": function () {
      return beaker(430, 470, 420, 430, "#3B82F6", "บีกเกอร์ A", 7) +
        beaker(1130, 470, 420, 430, "#3B82F6", "บีกเกอร์ B", 19) +
        snow(330, 560, 0.9) + flame(1650, 640, 1.1) +
        thermometer(990, 470, 360, 0.3, "#3B82F6") + thermometer(1720, 330, 220, 0.75, "#dc2626");
    },
    "ar-3a": function () {
      var g = '<g transform="translate(330 400)">';
      g += '<path d="M0,0 L0,600 L1150,600" fill="none" stroke="#0f172a" stroke-width="12"/>';
      g += '<path d="M0,560 L180,470 L420,470 L640,170 L940,170 L1100,120" fill="none" stroke="#1d4ed8" stroke-width="18" stroke-linejoin="round"/>';
      g += '<path d="M0,470 L1150,470 M0,170 L1150,170" stroke="#c2410c" stroke-width="6" stroke-dasharray="26 18"/>';
      g += '<text x="-30" y="485" font-family="' + FONT + '" font-size="54" font-weight="700" text-anchor="end" fill="#c2410c">0</text>';
      g += '<text x="-30" y="185" font-family="' + FONT + '" font-size="54" font-weight="700" text-anchor="end" fill="#c2410c">100</text>';
      g += '<text x="575" y="690" font-family="' + FONT + '" font-size="54" font-weight="700" text-anchor="middle" fill="#0f172a">เวลา →</text>';
      g += "</g>";
      // ก้อนน้ำแข็ง กาต้มน้ำ ไอน้ำ
      g += '<g transform="translate(470 1120)"><rect x="-70" y="-70" width="140" height="140" rx="18" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="10"/><path d="M-40,-30 L20,-50 M-30,20 L40,0" stroke="#fff" stroke-width="12" stroke-linecap="round"/></g>';
      g += '<g transform="translate(1230 1030)"><path d="M-110,40 Q-110,-70 0,-70 Q110,-70 110,40 Z" fill="#94a3b8" stroke="#0f172a" stroke-width="10"/><path d="M110,-10 L190,-60" stroke="#0f172a" stroke-width="18" stroke-linecap="round"/><rect x="-130" y="40" width="260" height="30" rx="12" fill="#0f172a"/></g>';
      g += '<g fill="none" stroke="#64748b" stroke-width="10" stroke-linecap="round"><path d="M1430,950 q-30,-40 0,-80 t0,-80"/><path d="M1480,920 q-30,-40 0,-80 t0,-80"/></g>';
      g += flame(1230, 1180, 0.7);
      return g;
    }
  };

  /** QR เป็น SVG (จากไลบรารี qrcode-generator) */
  function qrSvg(text, x, y, size) {
    var qr = window.qrcode(0, "M");
    qr.addData(text);
    qr.make();
    var n = qr.getModuleCount();
    var q = 4; // quiet zone
    var cell = size / (n + q * 2);
    var s = '<g transform="translate(' + x + ' ' + y + ')"><rect width="' + size + '" height="' + size + '" fill="#fff"/>';
    var d = "";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (qr.isDark(r, c)) d += "M" + ((c + q) * cell).toFixed(2) + "," + ((r + q) * cell).toFixed(2) + "h" + cell.toFixed(2) + "v" + cell.toFixed(2) + "h-" + cell.toFixed(2) + "z";
    }
    return s + '<path d="' + d + '" fill="#000"/></g>';
  }

  function sceneUrl(cfg, id) {
    return cfg.siteUrl + "scenes/" + id + ".html?openExternalBrowser=1";
  }

  /** สร้าง SVG การ์ดเต็มใบ */
  function buildCard(id, cfg, seed) {
    var sc = cfg.scenes[id];
    var zones = [
      [0, 0, 1500, 210],          // แถบหัว
      [1660, 1040, 440, 440],     // QR
      [0, 1250, 1640, 230]        // คำถามนำ
    ];
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="210mm" height="148mm">';
    s += '<rect width="' + W + '" height="' + H + '" fill="#fffbeb"/>';
    s += doodles(seed, zones);
    s += (ART[id] ? ART[id]() : "");
    // แถบหัว
    s += '<rect x="40" y="40" width="330" height="140" rx="22" fill="#0f172a"/>';
    s += '<text x="205" y="138" font-family="' + FONT + '" font-weight="700" font-size="92" text-anchor="middle" fill="#fff">' + esc(sc.code) + "</text>";
    s += '<text x="400" y="104" font-family="' + FONT + '" font-weight="700" font-size="64" fill="#0f172a">' + esc(sc.title) + "</text>";
    s += '<text x="400" y="166" font-family="' + FONT + '" font-size="42" fill="#475569">' + esc(cfg.kitTitle) + "</text>";
    // คำถามนำ
    s += '<rect x="40" y="1270" width="1590" height="170" rx="22" fill="#fff" stroke="#c2410c" stroke-width="8"/>';
    s += '<text x="80" y="1335" font-family="' + FONT + '" font-weight="700" font-size="44" fill="#c2410c">คำถามนำ</text>';
    s += '<text x="80" y="1405" font-family="' + FONT + '" font-size="50" fill="#0f172a">' + esc(sc.cardQuestion || "") + "</text>";
    // QR
    s += '<rect x="1680" y="1060" width="380" height="380" rx="20" fill="#fff" stroke="#0f172a" stroke-width="6"/>';
    s += qrSvg(sceneUrl(cfg, id), 1700, 1070, 340);
    s += '<text x="1870" y="1432" font-family="' + FONT + '" font-size="34" text-anchor="middle" fill="#0f172a">สแกนเปิดฉาก</text>';
    // กรอบตัดการ์ด
    s += '<rect x="8" y="8" width="' + (W - 16) + '" height="' + (H - 16) + '" fill="none" stroke="#0f172a" stroke-width="10" rx="30"/>';
    return s + "</svg>";
  }

  window.HeatCards = { buildCard: buildCard, qrSvg: qrSvg, sceneUrl: sceneUrl, W: W, H: H };
})();

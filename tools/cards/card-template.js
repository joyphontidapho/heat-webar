/*
 * card-template.js — สร้างภาพการ์ดเป้าหมาย (SVG) ขนาด A5 แนวนอน
 * ใช้ในหน้า tools/cards/cards.html (เปิดผ่านเบราว์เซอร์)
 *
 * หลักการออกแบบเพื่อให้ MindAR จับภาพได้แม่น:
 *   - ลายเส้น/รูปทรงหลากหลาย ความต่างสีสูง กระจายทั่วการ์ด
 *   - พื้นหลังเป็นไอคอนลายเส้นสีเดียว วางห่างกัน (ตำแหน่งสุ่มแบบกำหนด seed ต่างกันทุกใบ ไม่ใช่ลายซ้ำ)
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

  // ไอคอนลายเส้นธีมวิทยาศาสตร์ (สีเดียว) ใช้เป็นลายพื้นหลัง — แต่ละแบบรูปทรงต่างกัน ไม่ใช่ลายซ้ำ
  var ICONS = [
    // บีกเกอร์
    '<path d="M-30,-40 L-30,35 Q-30,45 -20,45 L20,45 Q30,45 30,35 L30,-40 M-38,-40 L38,-40 M-30,5 L30,5"/>',
    // ขวดรูปชมพู่
    '<path d="M-10,-45 L-10,-15 L-38,40 Q-40,46 -32,46 L32,46 Q40,46 38,40 L10,-15 L10,-45 M-16,-45 L16,-45 M-24,18 L24,18"/>',
    // เทอร์มอมิเตอร์
    '<path d="M-8,25 L-8,-40 Q0,-50 8,-40 L8,25"/><circle cx="0" cy="35" r="14"/><path d="M14,-30 L22,-30 M14,-15 L22,-15 M14,0 L22,0"/>',
    // โมเลกุล
    '<circle cx="-28" cy="12" r="12"/><circle cx="26" cy="18" r="10"/><circle cx="0" cy="-26" r="15"/><path d="M-19,4 L-9,-14 M18,10 L8,-12"/>',
    // เกล็ดน้ำแข็ง
    '<path d="M0,-42 L0,42 M-36,-21 L36,21 M-36,21 L36,-21 M-8,-34 L0,-26 L8,-34 M-8,34 L0,26 L8,34"/>',
    // เปลวไฟ
    '<path d="M0,-44 C24,-14 34,4 22,26 C12,44 -12,44 -22,26 C-34,4 -12,-12 0,-44Z M0,0 C10,14 10,24 4,32 C-2,38 -10,32 -8,24"/>',
    // หยดน้ำ
    '<path d="M0,-42 C18,-14 30,4 30,18 C30,36 16,44 0,44 C-16,44 -30,36 -30,18 C-30,4 -18,-14 0,-42Z M-14,18 Q-14,30 -2,32"/>',
    // หลอดทดลอง
    '<path d="M-10,-44 L-10,30 Q-10,44 0,44 Q10,44 10,30 L10,-44 M-15,-44 L15,-44 M-10,8 L10,8"/>',
    // ดวงอาทิตย์
    '<circle cx="0" cy="0" r="18"/><path d="M0,-44 L0,-30 M0,30 L0,44 M-44,0 L-30,0 M30,0 L44,0 M-31,-31 L-21,-21 M21,21 L31,31 M-31,31 L-21,21 M21,-21 L31,-31"/>',
    // ก้อนน้ำแข็ง
    '<path d="M-30,-14 L-6,-34 L34,-26 L34,22 L8,40 L-30,30 Z M-30,-14 L8,-6 L34,-26 M8,-6 L8,40"/>'
  ];

  /**
   * ลายพื้นหลัง: ไอคอนลายเส้นสีเดียว วางห่างกันพอดี ไม่ทับกัน
   * ช่วยให้ MindAR มีจุดเด่นกระจายทั่วการ์ด แต่ดูเรียบร้อยกว่ารูปทรงสุ่มหลายสี
   */
  function iconPattern(seed, zones) {
    var r = rng(seed), out = [], pts = [];
    var MIN_GAP = 165;
    function blocked(x, y, s) {
      return zones.some(function (z) { return x + s > z[0] && x - s < z[0] + z[2] && y + s > z[1] && y - s < z[1] + z[3]; });
    }
    var tries = 0, k = Math.floor(r() * ICONS.length);
    while (tries < 6000) {
      tries++;
      var x = 70 + r() * (W - 140), y = 70 + r() * (H - 140);
      var sc = 0.95 + r() * 0.5;
      if (blocked(x, y, 50 * sc + 10)) continue;
      if (pts.some(function (p) { return (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y) < MIN_GAP * MIN_GAP; })) continue;
      pts.push([x, y]);
      var rot = Math.round((r() - 0.5) * 50);
      k = (k + 1 + Math.floor(r() * 3)) % ICONS.length;
      out.push('<g transform="translate(' + x.toFixed(0) + ' ' + y.toFixed(0) + ') rotate(' + rot + ') scale(' + sc.toFixed(2) + ')">' + ICONS[k] + "</g>");
    }
    return '<g fill="none" stroke="#64748b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">' + out.join("") + "</g>";
  }

  // ---------------- ภาพประกอบของแต่ละฉาก ----------------
  function beaker(x, y, w, h, fill, label, waves, level) {
    var top = h * (1 - (level || 0.65));
    var s = '<g transform="translate(' + x + ' ' + y + ')">';
    s += '<path d="M0,0 L0,' + h + ' Q0,' + (h + 30) + ' 30,' + (h + 30) + ' L' + (w - 30) + ',' + (h + 30) + ' Q' + w + ',' + (h + 30) + ' ' + w + ',' + h + ' L' + w + ',0" fill="none" stroke="#0f172a" stroke-width="10"/>';
    s += '<path d="M-20,-6 L' + (w + 20) + ',-6" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>';
    s += '<rect x="8" y="' + top + '" width="' + (w - 16) + '" height="' + (h - top + 18) + '" fill="' + fill + '" opacity="0.35"/>';
    for (var i = 0; i < 5; i++) s += '<path d="M10,' + (top + 6 + i * 4) + ' q' + (w / 8) + ',-14 ' + (w / 4) + ',0 t' + (w / 4) + ',0 t' + (w / 4) + ',0 t' + (w / 4 - 20) + ',0" fill="none" stroke="' + fill + '" stroke-width="5" opacity="' + (i === 0 ? 1 : 0) + '"/>';
    for (var k = 1; k <= 4; k++) s += '<line x1="' + (w - 60) + '" y1="' + (h * k / 5) + '" x2="' + (w - 10) + '" y2="' + (h * k / 5) + '" stroke="#0f172a" stroke-width="6"/>';
    var r = rng(waves);
    for (var j = 0; j < 18; j++) s += '<circle cx="' + (30 + r() * (w - 60)).toFixed(0) + '" cy="' + (top + 30 + r() * (h - top - 40)).toFixed(0) + '" r="' + (12 + r() * 6).toFixed(0) + '" fill="' + fill + '" stroke="#0f172a" stroke-width="4"/>';
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

  // พื้นที่ภาพประกอบหลักของแต่ละฉาก (ไม่วางไอคอนพื้นหลังทับ)
  var ART_ZONES = {
    "ar-1a": [[250, 300, 1540, 800]],
    "ar-3a": [[220, 360, 1260, 760], [1150, 900, 420, 360], [370, 1020, 200, 200]],
    "ar-1b": [[150, 280, 1450, 960]],
    "ar-2a": [[260, 260, 1500, 960]],
    "ar-2b": [[260, 260, 1500, 960]],
    "ar-3b": [[340, 300, 1400, 940]],
    "ar-4a": [[250, 260, 1300, 600]],
    "ar-4b": [[240, 330, 1560, 860]],
    "ar-5a": [[240, 200, 1620, 960]],
    "ar-5b": [[250, 200, 1550, 1000]]
  };

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
    },
    "ar-1b": function () {
      var g = '<g transform="translate(560 300)">';
      g += '<rect x="-40" y="0" width="80" height="760" rx="40" fill="#fff" stroke="#0f172a" stroke-width="12"/>';
      g += '<rect x="-16" y="380" width="32" height="400" fill="#dc2626"/>';
      g += '<circle cx="0" cy="820" r="80" fill="#dc2626" stroke="#0f172a" stroke-width="12"/>';
      for (var k = 0; k <= 10; k++) {
        var yy = 740 - k * 64;
        g += '<line x1="40" y1="' + yy + '" x2="' + (k % 5 === 0 ? 100 : 80) + '" y2="' + yy + '" stroke="#0f172a" stroke-width="8"/>';
        if (k % 2 === 0) g += '<text x="112" y="' + (yy + 18) + '" font-family="' + FONT + '" font-size="48" font-weight="700" fill="#0f172a">' + (k * 10) + '</text>';
      }
      g += '</g>';
      // ดวงตา + ลูกศรระดับสายตา
      g += '<g transform="translate(250 680)"><path d="M-80,0 Q0,-70 80,0 Q0,70 -80,0Z" fill="#fff" stroke="#0f172a" stroke-width="10"/><circle cx="10" cy="0" r="28" fill="#1d4ed8"/><circle cx="12" cy="0" r="12" fill="#0f172a"/></g>';
      g += '<path d="M350,680 L490,680" stroke="#16a34a" stroke-width="14"/><path d="M490,650 L530,680 L490,710Z" fill="#16a34a"/>';
      // แว่นขยาย + อนุภาค
      g += '<g transform="translate(1250 700)"><circle r="300" fill="#fff" stroke="#0f172a" stroke-width="22"/>';
      var r = rng(77);
      for (var j = 0; j < 26; j++) g += '<circle cx="' + ((r() - 0.5) * 380).toFixed(0) + '" cy="' + (-40 + r() * 210).toFixed(0) + '" r="34" fill="#dc2626" stroke="#0f172a" stroke-width="6"/>';
      g += '<path d="M210,210 L330,330" stroke="#0f172a" stroke-width="40" stroke-linecap="round"/></g>';
      g += '<path d="M620,1120 L960,900" stroke="#334155" stroke-width="6" stroke-dasharray="20 14"/>';
      return g;
    },
    "ar-2a": function () {
      return beaker(420, 420, 400, 460, "#3B82F6", "น้ำ 100 g", 8, 0.4) + beaker(1160, 420, 400, 460, "#3B82F6", "น้ำ 200 g", 12, 0.8) +
        flame(620, 1150, 0.9) + flame(1360, 1150, 0.9) + thermometer(880, 360, 360, 0.6, "#dc2626") + thermometer(1620, 360, 360, 0.35, "#dc2626");
    },
    "ar-2b": function () {
      return beaker(420, 420, 400, 460, "#3B82F6", "น้ำ 100 g", 9, 0.6) + beaker(1160, 420, 400, 460, "#EAB308", "น้ำมันพืช 100 g", 14, 0.6) +
        flame(620, 1150, 0.9) + flame(1360, 1150, 0.9) + thermometer(880, 360, 360, 0.35, "#dc2626") + thermometer(1620, 360, 360, 0.7, "#dc2626");
    },
    "ar-3b": function () {
      var g = '<g transform="translate(420 380)">';
      for (var i = 0; i < 6; i++) for (var j = 0; j < 5; j++) {
        var broken = (i + j) % 4 === 0 && j < 2;
        var cx = i * 120 + (broken ? 30 : 0), cy = j * 120 + (broken ? -40 : 0);
        if (j < 4 && !broken) g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + (cy + 120) + '" stroke="#1d4ed8" stroke-width="8"/>';
        if (i < 5 && !broken) g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + 120) + '" y2="' + cy + '" stroke="#1d4ed8" stroke-width="8"/>';
        g += '<circle cx="' + cx + '" cy="' + cy + '" r="40" fill="#3B82F6" stroke="#0f172a" stroke-width="6"/>';
      }
      g += '</g>';
      g += thermometer(1350, 360, 520, 0.5, "#dc2626");
      g += '<text x="1470" y="660" font-family="' + FONT + '" font-size="110" font-weight="700" fill="#c2410c">0 °C</text>';
      g += '<g transform="translate(1600 920)"><path d="M0,-80 C40,-30 60,0 60,30 C60,70 30,90 0,90 C-30,90 -60,70 -60,30 C-60,0 -40,-30 0,-80Z" fill="#93c5fd" stroke="#1d4ed8" stroke-width="10"/></g>';
      g += flame(1400, 1120, 0.8);
      return g;
    },
    "ar-4a": function () {
      var g = '<g transform="translate(700 760)"><ellipse rx="230" ry="80" fill="none" stroke="#0f172a" stroke-width="40"/><ellipse rx="230" ry="80" fill="none" stroke="#9ca3af" stroke-width="22"/></g>';
      g += '<path d="M930,760 L1500,760" stroke="#78350f" stroke-width="34" stroke-linecap="round"/>';
      g += '<circle cx="700" cy="480" r="190" fill="#9ca3af" stroke="#0f172a" stroke-width="14"/><path d="M600,400 Q640,340 720,330" stroke="#fff" stroke-width="22" fill="none" stroke-linecap="round"/>';
      g += '<path d="M1000,400 L1120,400 M1000,520 L1120,520" stroke="#c2410c" stroke-width="14" stroke-linecap="round"/>';
      g += flame(1300, 560, 1.4) + snow(320, 450, 1);
      return g;
    },
    "ar-4b": function () {
      var g = '<rect x="300" y="420" width="140" height="260" fill="#334155" stroke="#0f172a" stroke-width="10"/><rect x="260" y="680" width="220" height="60" fill="#0f172a"/>';
      g += '<path d="M440,520 Q1100,520 1250,1050" fill="none" stroke="#B87333" stroke-width="56"/>';
      g += '<path d="M440,572 Q1040,572 1190,1060" fill="none" stroke="#9CA3AF" stroke-width="52"/>';
      g += '<path d="M440,494 Q1110,494 1276,1044 M440,598 Q1030,598 1164,1066" fill="none" stroke="#0f172a" stroke-width="8"/>';
      g += '<text x="760" y="460" font-family="' + FONT + '" font-size="64" font-weight="700" fill="#7c2d12">ทองแดง</text>';
      g += '<text x="520" y="720" font-family="' + FONT + '" font-size="64" font-weight="700" fill="#1f2937">เหล็ก</text>';
      g += flame(980, 1080, 1.2) + thermometer(1650, 380, 420, 0.8, "#dc2626");
      return g;
    },
    "ar-5a": function () {
      var g = '<rect x="260" y="560" width="1560" height="60" fill="#a8a29e" stroke="#0f172a" stroke-width="8"/>';
      for (var k = 0; k < 13; k++) g += '<rect x="' + (290 + k * 118) + '" y="520" width="56" height="44" fill="#78350f" stroke="#0f172a" stroke-width="6"/>';
      g += '<rect x="280" y="470" width="740" height="46" fill="#6b7280" stroke="#0f172a" stroke-width="8"/><rect x="1060" y="470" width="740" height="46" fill="#6b7280" stroke="#0f172a" stroke-width="8"/>';
      g += '<path d="M1040,420 L1040,450 M1020,440 L1040,460 L1060,440" stroke="#c2410c" stroke-width="10" fill="none"/>';
      g += '<rect x="300" y="860" width="660" height="60" fill="#cbd5e1" stroke="#0f172a" stroke-width="8"/><rect x="1000" y="860" width="660" height="60" fill="#cbd5e1" stroke="#0f172a" stroke-width="8"/>';
      g += '<rect x="330" y="920" width="70" height="220" fill="#94a3b8" stroke="#0f172a" stroke-width="8"/><rect x="945" y="920" width="70" height="220" fill="#94a3b8" stroke="#0f172a" stroke-width="8"/><rect x="1560" y="920" width="70" height="220" fill="#94a3b8" stroke="#0f172a" stroke-width="8"/>';
      g += '<g transform="translate(1650 300)"><circle r="60" fill="#f59e0b"/>';
      for (var a = 0; a < 8; a++) g += '<line x1="0" y1="-85" x2="0" y2="-120" stroke="#f59e0b" stroke-width="14" stroke-linecap="round" transform="rotate(' + (a * 45) + ')"/>';
      return g + '</g>';
    },
    "ar-5b": function () {
      var g = '<rect x="250" y="1150" width="1500" height="40" fill="#65a30d"/>';
      [380, 1580].forEach(function (x) {
        g += '<rect x="' + (x - 22) + '" y="330" width="44" height="830" fill="#78716c" stroke="#0f172a" stroke-width="8"/>';
        g += '<rect x="' + (x - 110) + '" y="330" width="220" height="30" fill="#57534e" stroke="#0f172a" stroke-width="6"/>';
      });
      g += '<path d="M400,340 Q980,800 1560,340" fill="none" stroke="#111827" stroke-width="14"/>';
      g += '<path d="M400,340 Q980,520 1560,340" fill="none" stroke="#475569" stroke-width="8" stroke-dasharray="26 16"/>';
      g += '<g transform="translate(1250 280)"><circle r="56" fill="#f59e0b"/>';
      for (var a = 0; a < 8; a++) g += '<line x1="0" y1="-78" x2="0" y2="-108" stroke="#f59e0b" stroke-width="12" stroke-linecap="round" transform="rotate(' + (a * 45) + ')"/>';
      g += '</g><g transform="translate(700 260)"><path d="M-60,0 A60,60 0 0,1 60,0 Z" fill="#fb923c" stroke="#0f172a" stroke-width="6"/><line x1="-90" y1="0" x2="90" y2="0" stroke="#0f172a" stroke-width="8"/></g>';
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
    s += iconPattern(seed, zones.concat(ART_ZONES[id] || []));
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

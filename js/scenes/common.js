/*
 * common.js — ชิ้นส่วน 3D ที่หลายฉากใช้ร่วมกัน
 *   HeatParts.thermometer  เทอร์มอมิเตอร์ (หลอด กระเปาะ ของเหลว สเกล)
 *   HeatParts.zoomWindow   หน้าต่างซูมทรงกลม สำหรับแสดงอนุภาคขยาย
 *   HeatParts.flame        เปลวไฟ
 *   HeatParts.beaker       บีกเกอร์แก้ว + ระดับของเหลว
 */
(function () {
  "use strict";

  function fmtTemp(t) {
    var v = Math.round(t);
    if (Object.is(v, -0)) v = 0;
    return v + " °C";
  }

  /**
   * เทอร์มอมิเตอร์
   * opts: { position, height, radius, min, max, value, color, step (ระยะขีดสเกล), showScale, labelSide }
   * คืนค่า { el, set(t), levelY(t) }  levelY = ตำแหน่ง y ของผิวของเหลว (พิกัดภายในเทอร์มอมิเตอร์)
   */
  function thermometer(parent, ctx, opts) {
    var ent = ctx.ent;
    var H = opts.height || 0.4, R = opts.radius || 0.016;
    var min = opts.min === undefined ? 0 : opts.min, max = opts.max === undefined ? 100 : opts.max;
    var color = opts.color || "#DC2626";
    var g = ent("a-entity", { position: opts.position || "0 0 0" }, parent);
    var bulbR = R * 2.1;
    var bottom = -H / 2;              // ปลายล่างของหลอด (บนกระเปาะ)
    var scale0 = bottom + bulbR * 1.4; // ตำแหน่งขีด min
    var scale1 = H / 2 - R * 2;        // ตำแหน่งขีด max

    ent("a-cylinder", { radius: R, height: H, "segments-radial": 24,
      material: "color: #e2e8f0; opacity: 0.35; transparent: true; depthWrite: false" }, g);
    ent("a-sphere", { radius: R, position: "0 " + (H / 2) + " 0", "segments-width": 16, "segments-height": 8,
      material: "color: #e2e8f0; opacity: 0.35; transparent: true; depthWrite: false" }, g);
    ent("a-sphere", { radius: bulbR, position: "0 " + (bottom - bulbR * 0.6) + " 0", "segments-width": 24, "segments-height": 16,
      material: "color: " + color + "; roughness: 0.4" }, g);
    var col = ent("a-cylinder", { radius: R * 0.55, height: 0.01, "segments-radial": 16, material: "color: " + color }, g);

    if (opts.showScale !== false) {
      var step = opts.step || (max - min > 100 ? 50 : (max - min > 50 ? 20 : 10));
      var right = opts.labelSide !== "left";
      var sw = 0.075, sh = H;
      ctx.canvasPlane(g, {
        w: sw, h: sh, px: 160, position: (right ? (R + sw / 2 + 0.004) : -(R + sw / 2 + 0.004)) + " 0 0",
        draw: function (c, W, Hc) {
          var toY = function (t) { return Hc * (0.5 - (scale0 + (t - min) / (max - min) * (scale1 - scale0)) / sh); };
          c.font = '700 26px "Sarabun", sans-serif';
          c.fillStyle = "#0f172a"; c.strokeStyle = "#0f172a"; c.textBaseline = "middle";
          c.textAlign = right ? "left" : "right";
          for (var t = min; t <= max + 1e-6; t += step / 2) {
            var y = toY(t), major = Math.abs((t - min) % step) < 1e-6;
            c.lineWidth = major ? 4 : 2;
            c.beginPath();
            if (right) { c.moveTo(0, y); c.lineTo(major ? 30 : 18, y); } else { c.moveTo(W, y); c.lineTo(W - (major ? 30 : 18), y); }
            c.stroke();
            if (major) c.fillText(String(Math.round(t)), right ? 36 : W - 36, y);
          }
        }
      });
    }

    function levelY(t) {
      var f = Math.max(0, Math.min(1, (t - min) / (max - min)));
      return scale0 + f * (scale1 - scale0);
    }
    function set(t) {
      var top = levelY(t);
      var hgt = top - bottom;
      col.setAttribute("height", hgt);
      col.setAttribute("position", "0 " + (bottom + hgt / 2) + " 0");
    }
    set(opts.value === undefined ? min : opts.value);
    return { el: g, set: set, levelY: levelY };
  }

  /**
   * หน้าต่างซูมทรงกลม: กรอบ + พื้นหลัง + หัวข้อ
   * opts: { position, radius, title }
   * คืนค่า { el, inner }  ใส่กล่องอนุภาคใน inner
   */
  function zoomWindow(parent, ctx, opts) {
    var ent = ctx.ent;
    var r = opts.radius || 0.15;
    var g = ent("a-entity", { position: opts.position || "0 0 0" }, parent);
    ent("a-circle", { radius: r, "segments": 48, position: "0 0 -0.02",
      material: "color: #ffffff; opacity: 0.9; transparent: true; shader: flat" }, g);
    ent("a-torus", { radius: r, "radius-tubular": 0.006, "segments-tubular": 64, material: "color: #334155" }, g);
    if (opts.title) {
      ent("a-entity", { position: "0 " + (r + 0.035) + " 0.01", "th-label": { text: opts.title, size: 0.026, border: "#334155" } }, g);
    }
    var inner = ent("a-entity", {}, g);
    return { el: g, inner: inner };
  }

  /** เปลวไฟ (กระพริบเล็กน้อย) */
  function flame(parent, ctx, opts) {
    var ent = ctx.ent;
    var s = opts.scale || 1;
    var g = ent("a-entity", { position: opts.position || "0 0 0", scale: s + " " + s + " " + s }, parent);
    ent("a-cone", { "radius-bottom": 0.03, "radius-top": 0.001, height: 0.09, position: "0 0.045 0",
      material: "color: #f97316; emissive: #f97316; emissiveIntensity: 0.6",
      animation: "property: scale; from: 1 0.9 1; to: 1 1.12 1; dir: alternate; loop: true; dur: 380; easing: easeInOutSine" }, g);
    ent("a-cone", { "radius-bottom": 0.016, "radius-top": 0.001, height: 0.05, position: "0 0.028 0.012",
      material: "color: #fde047; emissive: #fde047; emissiveIntensity: 0.8" }, g);
    ent("a-cylinder", { radius: 0.04, height: 0.012, position: "0 -0.006 0", material: "color: #334155" }, g);
    return g;
  }

  /**
   * บีกเกอร์ + กล่องอนุภาคด้านใน + ระดับของเหลว
   * opts: { position, radius, height, color, tempC, count, seed, label }
   * คืนค่า { el, particles (entity), setTemp(t), sim() }
   */
  function beaker(parent, ctx, opts) {
    var ent = ctx.ent;
    var R = opts.radius || 0.11, H = opts.height || 0.26;
    var g = ent("a-entity", { position: opts.position || "0 0 0" }, parent);
    ent("a-cylinder", { radius: R, height: H, "open-ended": "true", "segments-radial": 36,
      material: "color: #dbeafe; opacity: 0.28; transparent: true; side: double; depthWrite: false" }, g);
    ent("a-circle", { radius: R, rotation: "-90 0 0", position: "0 " + (-H / 2) + " 0",
      material: "color: #bfdbfe; opacity: 0.5; transparent: true; side: double" }, g);
    ent("a-torus", { radius: R, "radius-tubular": 0.0035, rotation: "90 0 0", position: "0 " + (H / 2) + " 0",
      material: "color: #94a3b8" }, g);
    var box = R * 1.35;
    var boxH = opts.boxHeight || (H - 0.02);
    var pb = ent("a-entity", { position: "0 " + (-H / 2 + boxH / 2 + 0.005) + " 0",
      "particle-box": { w: box, h: boxH, d: box, color: opts.color, state: "liquid", tempC: opts.tempC, showBox: false,
        seed: opts.seed || 1, count: opts.count || 0 } }, g);
    var water = ent("a-cylinder", { radius: R - 0.005, height: 0.05, "segments-radial": 36,
      material: "color: " + opts.color + "; opacity: 0.18; transparent: true; depthWrite: false" }, g);
    function fit() {
      var comp = pb.components["particle-box"];
      if (!comp) return;
      var hl = comp.sim.liquidHeight() + 0.02;
      var base = -H / 2 + 0.005;
      water.setAttribute("height", hl);
      water.setAttribute("position", "0 " + (base + hl / 2) + " 0");
    }
    if (pb.hasLoaded) fit(); else pb.addEventListener("loaded", fit);
    pb.addEventListener("particles-updated", fit);
    if (opts.label) {
      ent("a-entity", { position: "0 " + (-H / 2 - 0.04) + " 0.01", "th-label": { text: opts.label, size: 0.028 } }, g);
    }
    return {
      el: g, particles: pb,
      setTemp: function (t) { pb.setAttribute("particle-box", { tempC: t }); },
      sim: function () { return pb.components["particle-box"] && pb.components["particle-box"].sim; }
    };
  }

  window.HeatParts = { thermometer: thermometer, zoomWindow: zoomWindow, flame: flame, beaker: beaker, fmtTemp: fmtTemp };
})();

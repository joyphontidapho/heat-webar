/*
 * AR-5B สายไฟฟ้าระหว่างเสา 2 ต้น
 * - กลางวัน (ร้อน) สายไฟขยายตัวยาวขึ้น จึงหย่อนมาก · เช้ามืด (เย็น) สายไฟหดตัว จึงตึง
 * การโต้ตอบ: สวิตช์ กลางวัน/เช้ามืด
 */
window.HeatScenes.register("ar-5b", {
  build: function (stage, ctx) {
    var sc = ctx.scene, ent = ctx.ent;
    var N = 32;
    var XL = -0.36, XR = 0.28, TOP = 0.16, BASE = -0.3;

    // พื้นดิน + เสา + คานขวาง
    ent("a-box", { width: 0.9, height: 0.02, depth: 0.12, position: "-0.04 " + (BASE - 0.01) + " 0", material: "color: #65a30d" }, stage);
    [XL, XR].forEach(function (x) {
      ent("a-cylinder", { radius: 0.012, height: TOP - BASE + 0.03, position: x + " " + ((TOP + BASE) / 2 + 0.015) + " 0", material: "color: #78716c" }, stage);
      ent("a-box", { width: 0.1, height: 0.012, depth: 0.02, position: x + " " + TOP + " 0", material: "color: #57534e" }, stage);
      ent("a-cylinder", { radius: 0.007, height: 0.02, position: x + " " + (TOP + 0.014) + " 0", material: "color: #e2e8f0" }, stage);
    });
    // เส้นประระดับจุดยึด (เทียบความหย่อน)
    var dashes = 16;
    for (var d = 0; d < dashes; d++) {
      var x = XL + (d + 0.25) * (XR - XL) / dashes;
      ent("a-box", { width: (XR - XL) / dashes * 0.5, height: 0.003, depth: 0.003, position: (x + (XR - XL) / dashes * 0.25) + " " + (TOP + 0.024) + " 0.01", material: "color: #94a3b8; shader: flat" }, stage);
    }

    var wire = [];
    for (var i = 0; i < N; i++) wire.push(ent("a-cylinder", { radius: 0.0045, height: 0.02, "segments-radial": 8, material: "color: #111827" }, stage));

    var sagLabel = ent("a-entity", { "th-label": { text: "", size: 0.024, bg: "rgba(254,243,199,0.95)" } }, stage);
    var tLabel = ent("a-entity", { position: "0.38 0.28 0.03", "th-label": { text: "", size: 0.03, border: "#c2410c", minWidth: 0.22 } }, stage);
    var sky = { day: false };
    var icon = ctx.canvasPlane(stage, {
      w: 0.11, h: 0.11, px: 220, position: "0.4 0.14 0",
      draw: function (c, W, H) {
        if (sky.day) {
          c.fillStyle = "#f59e0b"; c.beginPath(); c.arc(W / 2, H / 2, W * 0.2, 0, Math.PI * 2); c.fill();
          c.strokeStyle = "#f59e0b"; c.lineWidth = 12; c.lineCap = "round";
          for (var a = 0; a < 8; a++) { var t = a * Math.PI / 4; c.beginPath(); c.moveTo(W / 2 + Math.cos(t) * W * 0.3, H / 2 + Math.sin(t) * H * 0.3); c.lineTo(W / 2 + Math.cos(t) * W * 0.44, H / 2 + Math.sin(t) * H * 0.44); c.stroke(); }
        } else {
          // ดวงอาทิตย์ครึ่งดวงที่ขอบฟ้า (เช้ามืด)
          c.fillStyle = "#1e3a8a"; c.fillRect(0, 0, W, H * 0.62);
          c.fillStyle = "#fb923c"; c.beginPath(); c.arc(W / 2, H * 0.62, W * 0.22, Math.PI, 0); c.fill();
          c.fillStyle = "#334155"; c.fillRect(0, H * 0.62, W, H * 0.38);
        }
      }
    });

    var state = { day: false, sag: sc.dawnSag, target: sc.dawnSag, length: 0 };

    function wireY(u, sag) { var v = 2 * u - 1; return TOP + 0.02 - sag * (1 - v * v); }

    function layout() {
      var len = 0;
      for (var i = 0; i < N; i++) {
        var u0 = i / N, u1 = (i + 1) / N;
        var x0 = XL + u0 * (XR - XL), x1 = XL + u1 * (XR - XL);
        var y0 = wireY(u0, state.sag), y1 = wireY(u1, state.sag);
        var dx = x1 - x0, dy = y1 - y0, l = Math.sqrt(dx * dx + dy * dy);
        len += l;
        wire[i].setAttribute("position", ((x0 + x1) / 2) + " " + ((y0 + y1) / 2) + " 0.01");
        wire[i].setAttribute("height", l + 0.002);
        wire[i].setAttribute("rotation", "0 0 " + (Math.atan2(dy, dx) * 180 / Math.PI - 90));
      }
      state.length = len;
      var mx = (XL + XR) / 2;
      sagLabel.setAttribute("position", mx + " " + (wireY(0.5, state.sag) - 0.045) + " 0.03");
      sagLabel.setAttribute("th-label", { text: state.sag > (sc.dawnSag + sc.daySag) / 2 ? "หย่อนมาก" : "ตึง" });
    }

    function refreshText() {
      tLabel.setAttribute("th-label", { text: (state.day ? sc.dayLabel : sc.dawnLabel) + " " + ctx.formatTemp(state.day ? sc.dayC : sc.dawnC) });
      sky.day = state.day; icon.redraw();
      ctx.ui.setInfo(state.day ? sc.dayNote : sc.dawnNote);
    }

    ctx.ui.addToggle(sc.timeLabel, [{ label: sc.dawnLabel, value: false }, { label: sc.dayLabel, value: true }], false,
      function (v) { state.day = v; state.target = v ? sc.daySag : sc.dawnSag; refreshText(); });

    var driver = ent("a-entity", { "on-tick": "" }, stage);
    driver.onTick = function (dt) {
      if (window.HeatApp.paused || state.sag === state.target) return;
      var step = dt * 0.08;
      state.sag = state.sag < state.target ? Math.min(state.target, state.sag + step) : Math.max(state.target, state.sag - step);
      layout();
    };

    layout(); refreshText();
    window.__scene = {
      state: state,
      set: function (day) { state.day = day; state.sag = state.target = day ? sc.daySag : sc.dawnSag; layout(); refreshText(); }
    };
  }
});

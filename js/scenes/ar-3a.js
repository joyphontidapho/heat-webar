/*
 * AR-3A กราฟการเปลี่ยนสถานะของน้ำ
 * กราฟอุณหภูมิกับเวลา: น้ำแข็ง -10 °C → น้ำ → ไอน้ำ 110 °C (ช่วงราบที่ 0 °C และ 100 °C)
 * ข้างกราฟมีกล่องอนุภาคที่เปลี่ยนตามช่วงที่เลือก (5 ช่วง)
 * การโต้ตอบ: แตะช่วงบนกราฟ หรือกดปุ่มช่วงด้านล่าง
 *
 * กราฟเป็นแบบ "ย่อสัดส่วน" (ไม่ตามสเกล) เพื่อให้เห็นครบทั้ง 5 ช่วง
 * ความกว้างแต่ละช่วงตั้งได้ใน config.js → scenes["ar-3a"].segments[].width
 */
window.HeatScenes.register("ar-3a", {
  build: function (stage, ctx) {
    var sc = ctx.scene;
    var color = ctx.cfg.colors.water;
    var ent = ctx.ent;
    var THREE = window.AFRAME.THREE;
    var segs = sc.segments;

    // ---------------- กราฟ (วาดบน canvas) ----------------
    var GW = 0.58, GH = 0.46;            // ขนาดกราฟบนการ์ด (หน่วยโลก)
    var CW = 1160, CH = 920;             // ขนาด canvas (px)
    var PL = 150, PR = 40, PT = 92, PB = 190; // ขอบพื้นที่พล็อต
    var Y_MIN = -20, Y_MAX = 120;
    var totalW = segs.reduce(function (a, s) { return a + s.width; }, 0);
    var bounds = []; // [x0, x1] ของแต่ละช่วงในหน่วย 0–1
    var acc = 0;
    segs.forEach(function (s) { bounds.push([acc / totalW, (acc + s.width) / totalW]); acc += s.width; });

    function px(u) { return PL + u * (CW - PL - PR); }
    function py(tc) { return PT + (1 - (tc - Y_MIN) / (Y_MAX - Y_MIN)) * (CH - PT - PB); }

    var canvas = document.createElement("canvas");
    canvas.width = CW; canvas.height = CH;
    var tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;

    var graph = ent("a-plane", { class: "clickable", width: GW, height: GH, position: "-0.2 0 0",
      material: "shader: flat; transparent: true" }, stage);
    graph.addEventListener("loaded", function () {
      var mesh = graph.getObject3D("mesh");
      mesh.material.map = tex;
      mesh.material.needsUpdate = true;
    });

    var F = '"Sarabun", "Noto Sans Thai", sans-serif';
    function drawGraph(active) {
      var c = canvas.getContext("2d");
      c.clearRect(0, 0, CW, CH);
      c.fillStyle = "rgba(255,255,255,0.95)";
      roundRect(c, 0, 0, CW, CH, 36); c.fill();
      c.strokeStyle = "#94a3b8"; c.lineWidth = 4; c.stroke();

      // ชื่อกราฟ
      c.fillStyle = "#0f172a"; c.font = "700 46px " + F; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(sc.graphTitle, CW / 2, 48);

      // แถบเน้นช่วงที่เลือก
      if (active >= 0) {
        c.fillStyle = "rgba(251, 191, 36, 0.22)";
        c.fillRect(px(bounds[active][0]), PT, px(bounds[active][1]) - px(bounds[active][0]), CH - PT - PB);
      }

      // เส้นตาราง + ตัวเลขแกน y
      c.font = "400 34px " + F; c.textAlign = "right";
      [-10, 0, 20, 40, 60, 80, 100, 110].forEach(function (t) {
        var y = py(t);
        var key = t === 0 || t === 100;
        c.strokeStyle = key ? "rgba(194,65,12,0.55)" : "rgba(148,163,184,0.45)";
        c.lineWidth = key ? 3 : 2;
        c.setLineDash(key ? [14, 10] : []);
        c.beginPath(); c.moveTo(PL, y); c.lineTo(CW - PR, y); c.stroke();
        c.setLineDash([]);
        c.fillStyle = key ? "#c2410c" : "#334155";
        c.fillText(String(t), PL - 14, y);
      });

      // แกน
      c.strokeStyle = "#0f172a"; c.lineWidth = 4;
      c.beginPath(); c.moveTo(PL, PT - 10); c.lineTo(PL, CH - PB); c.lineTo(CW - PR + 10, CH - PB); c.stroke();
      c.save(); c.translate(42, PT + (CH - PT - PB) / 2); c.rotate(-Math.PI / 2);
      c.textAlign = "center"; c.fillStyle = "#0f172a"; c.font = "700 34px " + F;
      c.fillText(sc.axisY, 0, 0); c.restore();
      c.textAlign = "center"; c.font = "700 34px " + F; c.fillStyle = "#0f172a";
      c.fillText(sc.axisX + " →", PL + (CW - PL - PR) / 2, CH - 34);

      // เส้นกราฟ
      segs.forEach(function (s, i) {
        c.strokeStyle = i === active ? "#c2410c" : "#1d4ed8";
        c.lineWidth = i === active ? 12 : 8;
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(px(bounds[i][0]), py(s.from));
        c.lineTo(px(bounds[i][1]), py(s.to));
        c.stroke();
      });

      // ชื่อช่วงใต้แกน x
      segs.forEach(function (s, i) {
        var cx = (px(bounds[i][0]) + px(bounds[i][1])) / 2;
        c.font = (i === active ? "700 " : "400 ") + "32px " + F;
        c.fillStyle = i === active ? "#c2410c" : "#334155";
        c.fillText(s.short, cx, CH - PB + 40);
        c.fillStyle = "#64748b"; c.font = "400 26px " + F;
        c.fillText("ช่วง " + (i + 1), cx, CH - PB + 80);
        if (i > 0) {
          c.strokeStyle = "rgba(148,163,184,0.5)"; c.lineWidth = 2;
          c.beginPath(); c.moveTo(px(bounds[i][0]), CH - PB); c.lineTo(px(bounds[i][0]), CH - PB + 96); c.stroke();
        }
      });

      // หมายเหตุ "ไม่ตามสเกล"
      c.textAlign = "right"; c.font = "400 26px " + F; c.fillStyle = "#64748b";
      c.fillText("(" + ctx.cfg.text.notToScale + ")", CW - PR, PT - 22);
      tex.needsUpdate = true;
    }

    // จุดบอกตำแหน่งบนกราฟ
    var marker = ent("a-sphere", { radius: 0.012, color: "#dc2626", position: "-0.2 0 0.006",
      material: "shader: flat" }, stage);
    function canvasToLocal(x, y) {
      return { x: -0.2 + (x / CW - 0.5) * GW, y: (0.5 - y / CH) * GH };
    }

    // ---------------- กล่องอนุภาค ----------------
    var BOX = { w: 0.3, h: 0.34, d: 0.16 };
    var boxX = 0.3, boxY = -0.01;
    var pb = ent("a-entity", { position: boxX + " " + boxY + " 0",
      "particle-box": { w: BOX.w, h: BOX.h, d: BOX.d, color: color, state: "solid", tempC: -10, seed: 5 } }, stage);
    var tempLabel = ent("a-entity", { position: boxX + " " + (boxY + BOX.h / 2 + 0.05) + " 0.02",
      "th-label": { text: "อุณหภูมิ " + ctx.formatTemp(-10), size: 0.036, border: "#c2410c", minWidth: 0.26 } }, stage);
    var stateLabel = ent("a-entity", { position: boxX + " " + (boxY - BOX.h / 2 - 0.045) + " 0.02",
      "th-label": { text: segs[0].label, size: 0.03, minWidth: 0.26 } }, stage);

    // ---------------- ปุ่มด้านล่าง ----------------
    var buttons = segs.map(function (s, i) {
      return ctx.ui.addButton((i + 1) + " " + s.short, function () { select(i); }, { secondary: true });
    });

    // ---------------- ตรรกะการเล่น ----------------
    var state = { seg: 0, p: 0, hold: 0, epoch: 0, lastTempShown: null };

    function tempAt(s, p) { return s.from + (s.to - s.from) * p; }

    function apply() {
      var s = segs[state.seg];
      var p = state.p;
      var t = tempAt(s, p);
      pb.setAttribute("particle-box", {
        state: s.state, next: s.next || "", fraction: s.next ? p : 0, tempC: t, epoch: state.epoch
      });
      var shown = Math.round(t);
      if (shown !== state.lastTempShown) {
        state.lastTempShown = shown;
        tempLabel.setAttribute("th-label", { text: "อุณหภูมิ " + ctx.formatTemp(t) });
      }
      var pt = canvasToLocal(px(bounds[state.seg][0] + (bounds[state.seg][1] - bounds[state.seg][0]) * p), py(t));
      marker.object3D.position.set(pt.x, pt.y, 0.006);
    }

    function select(i) {
      state.seg = i; state.p = 0; state.hold = 0; state.epoch++;
      state.lastTempShown = null;
      var s = segs[i];
      drawGraph(i);
      stateLabel.setAttribute("th-label", { text: s.label });
      ctx.ui.setInfo("ช่วง " + (i + 1) + " · " + s.label + ": " + s.note);
      buttons.forEach(function (b, k) { ctx.ui.setActive(b, k === i); });
      apply();
    }

    // แตะบนกราฟเพื่อเลือกช่วง
    graph.addEventListener("click", function (e) {
      if (window.HeatApp.justDragged()) return;
      var hit = e.detail && e.detail.intersection;
      if (!hit || !hit.uv) return;
      var x = hit.uv.x * CW;
      var u = (x - PL) / (CW - PL - PR);
      if (u < 0 || u > 1) return;
      for (var i = 0; i < bounds.length; i++) {
        if (u >= bounds[i][0] && u <= bounds[i][1]) { select(i); return; }
      }
    });

    // เดินเวลา: จุดบนกราฟวิ่งผ่านช่วงที่เลือก แล้ววนซ้ำ
    var driver = ent("a-entity", { "on-tick": "" }, stage);
    driver.onTick = function (dt) {
      if (window.HeatApp.paused) return;
      if (state.p >= 1) {
        state.hold += dt;
        if (state.hold > 1.5) { state.p = 0; state.hold = 0; state.epoch++; state.lastTempShown = null; apply(); }
        return;
      }
      state.p = Math.min(1, state.p + dt / (sc.sweepSeconds || 7));
      apply();
    };

    function roundRect(c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }

    // วาดกราฟใหม่เมื่อฟอนต์ไทยโหลดเสร็จ
    if (document.fonts && document.fonts.load) {
      document.fonts.load('700 32px "Sarabun"', "กขค").then(function () { drawGraph(state.seg); });
    }
    select(0);

    // เปิดให้ทดสอบอัตโนมัติอ่าน/ควบคุมได้
    window.__scene = {
      select: select, state: state, segments: segs,
      particleSim: function () { return pb.components["particle-box"] && pb.components["particle-box"].sim; },
      setProgress: function (p) { state.p = p; apply(); }
    };
  }
});

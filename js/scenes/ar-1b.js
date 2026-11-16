/*
 * AR-1B เทอร์มอมิเตอร์ขยายใหญ่
 * - หน้าต่างซูมแสดงอนุภาคของเหลวในกระเปาะ ร้อนขึ้น → เร็วขึ้น ห่างกันขึ้น (ขนาดเท่าเดิม)
 * - ของเหลวในหลอดเลื่อนขึ้นตามอุณหภูมิ
 * - ลูกศรและดวงตาแสดงระดับสายตาที่ถูกต้องเมื่ออ่านค่า (อยู่ระดับเดียวกับผิวของเหลว)
 * การโต้ตอบ: แถบเลื่อนอุณหภูมิ 0–100 °C
 */
window.HeatScenes.register("ar-1b", {
  build: function (stage, ctx) {
    var sc = ctx.scene, ent = ctx.ent, P = window.HeatParts;
    var color = ctx.cfg.colors.thermoLiquid;
    var t0 = sc.startC;

    // เทอร์มอมิเตอร์
    var TX = -0.17, TY = 0.0;
    var th = P.thermometer(stage, ctx, { position: TX + " " + TY + " 0", height: 0.54, radius: 0.017,
      min: sc.minC, max: sc.maxC, value: t0, color: color, step: 10 });

    var tempLabel = ent("a-entity", { position: TX + " " + (TY + 0.32) + " 0.02",
      "th-label": { text: "อุณหภูมิ " + ctx.formatTemp(t0), size: 0.034, border: "#c2410c", minWidth: 0.24 } }, stage);

    // ดวงตา + ลูกศรระดับสายตา (เลื่อนตามผิวของเหลว)
    var eyeG = ent("a-entity", { position: "0 0 0.01" }, stage);
    ctx.canvasPlane(eyeG, {
      w: 0.08, h: 0.05, px: 200, position: (TX - 0.24) + " 0 0",
      draw: function (c, W, H) {
        c.lineWidth = 8; c.strokeStyle = "#0f172a"; c.fillStyle = "#ffffff";
        c.beginPath(); c.moveTo(10, H / 2); c.quadraticCurveTo(W / 2, -H * 0.25, W - 10, H / 2);
        c.quadraticCurveTo(W / 2, H * 1.25, 10, H / 2); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = "#1d4ed8"; c.beginPath(); c.arc(W * 0.58, H / 2, H * 0.27, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#0f172a"; c.beginPath(); c.arc(W * 0.6, H / 2, H * 0.12, 0, Math.PI * 2); c.fill();
      }
    });
    var arrowLen = 0.17;
    ent("a-cylinder", { radius: 0.0035, height: arrowLen, rotation: "0 0 90", position: (TX - 0.19 + arrowLen / 2) + " 0 0",
      material: "color: #16a34a; shader: flat" }, eyeG);
    ent("a-cone", { "radius-bottom": 0.012, "radius-top": 0, height: 0.025, rotation: "0 0 -90",
      position: (TX - 0.19 + arrowLen + 0.006) + " 0 0", material: "color: #16a34a; shader: flat" }, eyeG);
    ent("a-entity", { position: (TX - 0.24) + " -0.05 0", "th-label": { text: sc.eyeLabel, size: 0.022, color: "#166534" } }, eyeG);

    // หน้าต่างซูมอนุภาคในกระเปาะ
    var ZX = 0.26, ZY = -0.01, ZR = 0.21;
    var zoom = P.zoomWindow(stage, ctx, { position: ZX + " " + ZY + " 0", radius: ZR, title: sc.zoomTitle });
    var pb = ent("a-entity", { position: "0 0 0",
      "particle-box": { w: 0.28, h: 0.28, d: 0.14, color: color, state: "liquid", tempC: t0, showBox: false, seed: 21, count: 24 } }, zoom.inner);
    // เส้นเชื่อมกระเปาะกับหน้าต่างซูม
    var bulbY = TY - 0.27 - 0.036 * 0.6;
    ent("a-entity", { line: "start: " + (TX + 0.04) + " " + bulbY + " 0; end: " + (ZX - ZR * 0.92) + " " + (ZY - ZR * 0.38) + " 0; color: #334155" }, stage);
    ent("a-ring", { "radius-inner": 0.036, "radius-outer": 0.043, position: TX + " " + bulbY + " 0.02", material: "color: #334155; shader: flat" }, stage);

    function setTemp(t) {
      th.set(t);
      eyeG.object3D.position.y = TY + th.levelY(t);
      pb.setAttribute("particle-box", { tempC: t });
      tempLabel.setAttribute("th-label", { text: "อุณหภูมิ " + ctx.formatTemp(t) });
      state.tempC = t;
    }
    var state = { tempC: t0 };

    ctx.ui.setInfo(sc.note);
    ctx.ui.addSlider(sc.sliderLabel, { min: sc.minC, max: sc.maxC, step: 1, value: t0, unit: "°C" }, setTemp);
    setTemp(t0);

    window.__scene = {
      state: state, setTemp: setTemp,
      columnTop: function () { return th.levelY(state.tempC); },
      eyeY: function () { return eyeG.object3D.position.y - TY; },
      sim: function () { return pb.components["particle-box"].sim; }
    };
  }
});

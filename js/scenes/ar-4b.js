/*
 * AR-4B แถบโลหะคู่ทองแดง–เหล็ก
 * - ทองแดงขยายตัวมากกว่าเหล็ก เมื่อร้อนแถบจึงโค้ง โดยทองแดงอยู่ด้านนอกของส่วนโค้ง
 * การโต้ตอบ: แถบเลื่อนอุณหภูมิ
 *
 * วาดแถบเป็นชิ้นเล็ก ๆ ต่อกันตามส่วนโค้ง (ชั้นบน = ทองแดง, ชั้นล่าง = เหล็ก)
 * จุดศูนย์กลางความโค้งอยู่ด้านเหล็ก ชั้นทองแดงจึงยาวกว่าและอยู่ด้านนอก
 */
window.HeatScenes.register("ar-4b", {
  build: function (stage, ctx) {
    var sc = ctx.scene, ent = ctx.ent, P = window.HeatParts;
    var C = ctx.cfg.colors;
    var N = 28, LEN = 0.62, T = 0.022, D = 0.07;
    var X0 = -0.33, Y0 = 0.08;

    // แท่นยึดปลายซ้าย
    ent("a-box", { width: 0.06, height: 0.12, depth: 0.1, position: (X0 - 0.03) + " " + Y0 + " 0", material: "color: #334155" }, stage);
    ent("a-box", { width: 0.1, height: 0.03, depth: 0.12, position: (X0 - 0.03) + " " + (Y0 - 0.075) + " 0", material: "color: #1e293b" }, stage);

    var cu = [], fe = [];
    for (var i = 0; i < N; i++) {
      cu.push(ent("a-box", { width: LEN / N, height: T, depth: D, material: "color: " + C.copper + "; metalness: 0.5; roughness: 0.35" }, stage));
      fe.push(ent("a-box", { width: LEN / N, height: T, depth: D, material: "color: " + C.metal + "; metalness: 0.5; roughness: 0.4" }, stage));
    }

    var cuLabel = ent("a-entity", { "th-label": { text: sc.copperLabel, size: 0.028, color: "#7c2d12", border: C.copper } }, stage);
    var feLabel = ent("a-entity", { "th-label": { text: sc.ironLabel, size: 0.028, color: "#1f2937", border: C.metal } }, stage);
    var tLabel = ent("a-entity", { position: "0.12 0.29 0.03",
      "th-label": { text: "อุณหภูมิ " + ctx.formatTemp(sc.startC), size: 0.034, border: "#c2410c", minWidth: 0.26 } }, stage);
    var flame = P.flame(stage, ctx, { position: "0.14 -0.13 0", scale: 1.1 });

    var geo = { kappa: 0, cu: [], fe: [], center: null };

    /** ตำแหน่งบนเส้นกึ่งกลางที่ระยะ s และมุมเอียง */
    function mid(s, k) {
      if (Math.abs(k) < 1e-6) return { x: X0 + s, y: Y0, a: 0 };
      return { x: X0 + Math.sin(k * s) / k, y: Y0 - (1 - Math.cos(k * s)) / k, a: -k * s };
    }

    function setTemp(t) {
      var k = sc.bendPer100C * Math.max(0, t - sc.minC) / 100;
      geo.kappa = k; geo.cu = []; geo.fe = [];
      geo.center = k > 1e-6 ? { x: X0, y: Y0 - 1 / k } : null;
      var ds = LEN / N;
      for (var i = 0; i < N; i++) {
        var m = mid((i + 0.5) * ds, k);
        var nx = -Math.sin(m.a), ny = Math.cos(m.a); // ทิศตั้งฉากชี้ขึ้น (ด้านทองแดง)
        var deg = m.a * 180 / Math.PI;
        var cuPos = { x: m.x + nx * T / 2, y: m.y + ny * T / 2 };
        var fePos = { x: m.x - nx * T / 2, y: m.y - ny * T / 2 };
        cu[i].setAttribute("position", cuPos.x + " " + cuPos.y + " 0");
        fe[i].setAttribute("position", fePos.x + " " + fePos.y + " 0");
        cu[i].setAttribute("rotation", "0 0 " + deg);
        fe[i].setAttribute("rotation", "0 0 " + deg);
        cu[i].setAttribute("width", ds * (1 + k * T / 2) + 0.001);
        fe[i].setAttribute("width", ds * (1 - k * T / 2) + 0.001);
        geo.cu.push(cuPos); geo.fe.push(fePos);
      }
      var lm = mid(LEN * 0.3, k);
      cuLabel.setAttribute("position", (lm.x) + " " + (lm.y + 0.05) + " 0.05");
      feLabel.setAttribute("position", (lm.x) + " " + (lm.y - 0.05) + " 0.05");
      tLabel.setAttribute("th-label", { text: "อุณหภูมิ " + ctx.formatTemp(t) });
      var f = (t - sc.minC) / (sc.maxC - sc.minC);
      flame.object3D.visible = f > 0.02;
      flame.object3D.scale.setScalar(0.6 + f * 0.8);
      state.tempC = t;
    }
    var state = { tempC: sc.startC };

    ctx.ui.setInfo(sc.note);
    ctx.ui.addSlider(sc.sliderLabel, { min: sc.minC, max: sc.maxC, step: 1, value: sc.startC, unit: "°C" }, setTemp);
    setTemp(sc.startC);

    window.__scene = { state: state, setTemp: setTemp, geometry: function () { return geo; } };
  }
});

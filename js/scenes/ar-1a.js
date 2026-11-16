/*
 * AR-1A น้ำเย็นกับน้ำร้อน
 * บีกเกอร์ 2 ใบวางคู่กัน อนุภาคในน้ำร้อนเคลื่อนที่เร็วกว่า
 * การโต้ตอบ: แตะบีกเกอร์เพื่อแสดงป้ายอุณหภูมิ (หรือกดปุ่มด้านล่าง)
 * ข้อความและอุณหภูมิทั้งหมดอยู่ใน config.js → scenes["ar-1a"]
 */
window.HeatScenes.register("ar-1a", {
  build: function (stage, ctx) {
    var sc = ctx.scene;
    var color = ctx.cfg.colors.water;
    var ent = ctx.ent;

    var R = 0.15;      // รัศมีบีกเกอร์
    var H = 0.34;      // ความสูงบีกเกอร์
    var BOX = 0.2;     // กล่องอนุภาคด้านใน (พอดีในบีกเกอร์)
    var xs = [-0.23, 0.23];
    var labels = [];
    var revealed = [false, false];

    sc.beakers.forEach(function (bk, i) {
      var g = ent("a-entity", { position: xs[i] + " 0.0 0" }, stage);

      // แก้วบีกเกอร์
      ent("a-cylinder", {
        radius: R, height: H, "open-ended": "true", "segments-radial": 40,
        material: "color: #dbeafe; opacity: 0.28; transparent: true; side: double; depthWrite: false"
      }, g);
      ent("a-circle", { radius: R, rotation: "-90 0 0", position: "0 " + (-H / 2) + " 0",
        material: "color: #bfdbfe; opacity: 0.5; transparent: true; side: double" }, g);
      ent("a-torus", { radius: R, "radius-tubular": 0.004, rotation: "90 0 0", position: "0 " + (H / 2) + " 0",
        material: "color: #94a3b8" }, g);

      // อนุภาคน้ำ
      var pb = ent("a-entity", {
        "particle-box": "w: " + BOX + "; h: " + (H - 0.02) + "; d: " + BOX + "; color: " + color +
          "; state: liquid; tempC: " + bk.tempC + "; showBox: false; seed: " + (11 + i * 7)
      }, g);

      // ระดับน้ำ (สีฟ้าโปร่ง) ตามความสูงของชั้นอนุภาค
      var water = ent("a-cylinder", {
        radius: R - 0.006, height: 0.1, "segments-radial": 40,
        material: "color: " + color + "; opacity: 0.16; transparent: true; depthWrite: false"
      }, g);
      function fitWater() {
        var comp = pb.components["particle-box"];
        if (!comp) return;
        var hl = comp.sim.liquidHeight() + 0.03;
        water.setAttribute("height", hl);
        water.setAttribute("position", "0 " + (-H / 2 + hl / 2) + " 0");
      }
      if (pb.hasLoaded) fitWater(); else pb.addEventListener("loaded", fitWater);

      // ชื่อบีกเกอร์ (ใต้บีกเกอร์)
      ent("a-entity", { position: "0 " + (-H / 2 - 0.045) + " 0.01",
        "th-label": { text: bk.label, size: 0.032 } }, g);

      // ป้ายอุณหภูมิ (เหนือบีกเกอร์) — ซ่อนตัวเลขไว้จนกว่าจะแตะ
      var lab = ent("a-entity", { position: "0 " + (H / 2 + 0.075) + " 0.03",
        "th-label": { text: "? °C\n" + sc.tapToReveal, size: 0.03, border: "#94a3b8" } }, g);
      labels.push(lab);

      // พื้นที่สำหรับแตะ (โปร่งใส)
      var hit = ent("a-cylinder", { class: "clickable", radius: R + 0.02, height: H + 0.16, position: "0 0.03 0",
        material: "opacity: 0; transparent: true; depthWrite: false" }, g);
      hit.addEventListener("click", function () {
        if (window.HeatApp.justDragged()) return;
        setReveal(i, !revealed[i]);
      });
    });

    function setReveal(i, on) {
      revealed[i] = on;
      var bk = sc.beakers[i];
      labels[i].setAttribute("th-label", on
        ? { text: "อุณหภูมิ " + ctx.formatTemp(bk.tempC), size: 0.04, border: "#c2410c" }
        : { text: "? °C\n" + sc.tapToReveal, size: 0.03, border: "#94a3b8" });
      syncButton();
    }

    ctx.ui.setInfo(sc.hint);
    var btn = ctx.ui.addButton(sc.showAllTemps, function () {
      var all = revealed[0] && revealed[1];
      setReveal(0, !all); setReveal(1, !all);
    });
    function syncButton() {
      var all = revealed[0] && revealed[1];
      btn.textContent = all ? sc.hideAllTemps : sc.showAllTemps;
      ctx.ui.setActive(btn, all);
    }

    // เปิดให้ทดสอบอัตโนมัติอ่านค่าได้
    window.__scene = { revealed: revealed, setReveal: setReveal };
  }
});

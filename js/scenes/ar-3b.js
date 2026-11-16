/*
 * AR-3B น้ำแข็งหลอมเหลวที่ 0 °C
 * - กดเติมความร้อนทีละขั้น โครงผลึกค่อย ๆ แตกออก (อนุภาคหลุดเป็นของเหลวทีละส่วน)
 * - ป้ายอุณหภูมิค้างที่ 0 °C ตลอด และความเร็วเฉลี่ยของอนุภาคคงที่
 * - ตัวนับ "ความร้อนที่ให้ (J)" = L × m ÷ จำนวนขั้น ต่อการกด 1 ครั้ง
 */
window.HeatScenes.register("ar-3b", {
  build: function (stage, ctx) {
    var sc = ctx.scene, ent = ctx.ent, P = window.HeatParts;
    var L = ctx.cfg.constants.L_fusion;
    var stepJ = L * sc.massG / sc.steps;
    var BOX = { w: 0.34, h: 0.36, d: 0.16 }, BX = -0.14, BY = -0.02;

    var pb = ent("a-entity", { position: BX + " " + BY + " 0",
      "particle-box": { w: BOX.w, h: BOX.h, d: BOX.d, color: ctx.cfg.colors.water, state: "solid", next: "liquid", fraction: 0, tempC: 0, seed: 41 } }, stage);
    ent("a-entity", { position: BX + " " + (BY + BOX.h / 2 + 0.05) + " 0.02",
      "th-label": { text: "อุณหภูมิ " + ctx.formatTemp(0), size: 0.036, border: "#c2410c", minWidth: 0.3 } }, stage);
    var meltLabel = ent("a-entity", { position: BX + " " + (BY - BOX.h / 2 - 0.045) + " 0.02",
      "th-label": { text: "หลอมเหลวแล้ว 0%", size: 0.028, minWidth: 0.3 } }, stage);

    // ด้านขวา: เทอร์มอมิเตอร์ (ค้างที่ 0 °C) ตัวนับความร้อน และมาตรวัดความเร็ว
    var th = P.thermometer(stage, ctx, { position: "0.12 0.02 0", height: 0.4, radius: 0.012,
      min: -10, max: 10, value: 0, color: "#DC2626", step: 5 });
    var qLabel = ent("a-entity", { position: "0.33 0.2 0.02",
      "th-label": { text: sc.counterLabel + "\n0 J", size: 0.03, border: "#1d4ed8", minWidth: 0.24 } }, stage);
    ent("a-entity", { position: "0.33 0.04 0.02",
      "th-label": { text: sc.speedLabel, size: 0.022, bg: "none" } }, stage);
    // แถบความเร็ว: ความยาวคำนวณจากความเร็วจริงของระบบอนุภาค (คงที่เพราะอุณหภูมิคงที่)
    ent("a-plane", { width: 0.22, height: 0.03, position: "0.33 -0.01 0.01", material: "color: #e2e8f0; shader: flat" }, stage);
    var bar = ent("a-plane", { width: 0.01, height: 0.03, position: "0.33 -0.01 0.015", material: "color: #f97316; shader: flat" }, stage);
    var speedText = ent("a-entity", { position: "0.33 -0.06 0.02",
      "th-label": { text: sc.speedSame, size: 0.024, bg: "none", color: "#c2410c" } }, stage);

    var state = { step: 0, fraction: 0, target: 0, joules: 0, speeds: [] };

    function sim() { return pb.components["particle-box"] && pb.components["particle-box"].sim; }
    function updateBar() {
      var s = sim();
      if (!s) return;
      var v = s.targetSpeed("solid");
      state.speeds.push(v);
      var ref = window.HeatParticles.BASE.solidAmp * window.HeatParticles.BASE.solidOmega * window.HeatParticles.speedFactor(20);
      var w = Math.max(0.01, Math.min(0.22, 0.22 * 0.6 * v / ref));
      bar.setAttribute("width", w);
      bar.setAttribute("position", (0.33 - 0.11 + w / 2) + " -0.01 0.015");
    }

    function render() {
      th.set(0);
      qLabel.setAttribute("th-label", { text: sc.counterLabel + "\n" + Math.round(state.joules).toLocaleString("th-TH") + " J" });
      meltLabel.setAttribute("th-label", { text: "หลอมเหลวแล้ว " + Math.round(state.target * 100) + "%" });
      updateBar();
    }

    var heatBtn = ctx.ui.addButton(sc.heatButton + " (+" + Math.round(stepJ) + " J)", function () {
      if (state.step >= sc.steps) return;
      state.step++;
      state.joules = state.step * stepJ;
      state.target = state.step / sc.steps;
      render();
      if (state.step >= sc.steps) { heatBtn.disabled = true; ctx.ui.setInfo(sc.doneNote); }
    });
    ctx.ui.addButton(sc.resetButton, function () {
      state.step = 0; state.joules = 0; state.target = 0; state.fraction = 0;
      pb.setAttribute("particle-box", { fraction: 0, epoch: (pb.getAttribute("particle-box").epoch || 0) + 1 });
      heatBtn.disabled = false;
      ctx.ui.setInfo(sc.note);
      render();
    }, { secondary: true });

    // โครงผลึกแตกออกอย่างค่อยเป็นค่อยไปหลังกดแต่ละครั้ง
    var driver = ent("a-entity", { "on-tick": "" }, stage);
    driver.onTick = function (dt) {
      if (window.HeatApp.paused || state.fraction === state.target) return;
      state.fraction = Math.min(state.target, state.fraction + dt * 0.12);
      pb.setAttribute("particle-box", { fraction: state.fraction });
    };

    ctx.ui.setInfo(sc.note);
    if (pb.hasLoaded) render(); else pb.addEventListener("loaded", render);

    window.__scene = {
      state: state, sim: sim, stepJ: stepJ,
      press: function () { heatBtn.click(); },
      settle: function () { state.fraction = state.target; pb.setAttribute("particle-box", { fraction: state.fraction }); }
    };
  }
});

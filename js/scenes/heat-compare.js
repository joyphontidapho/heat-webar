/*
 * heat-compare.js — ใช้ร่วมกันโดย AR-2A และ AR-2B
 * สารสองภาชนะได้รับความร้อนเท่ากัน (เปลวไฟเท่ากัน) แล้วเปรียบเทียบอุณหภูมิที่เพิ่มขึ้น
 *   ΔT = Q ÷ (m × c)   โดย Q = กำลังแหล่งความร้อน × เวลา
 * AR-2A: น้ำ 100 g กับ 200 g → ใบ 100 g ร้อนขึ้นเร็วเป็น 2 เท่า
 * AR-2B: น้ำ 100 g กับน้ำมันพืช 100 g → น้ำมันร้อนขึ้นเร็วกว่าราว 2 เท่า (c ต่างกัน)
 */
(function () {
  var MAX_TEMP = { water: 100, oil: 150 };

  function build(stage, ctx) {
    var sc = ctx.scene, ent = ctx.ent, P = window.HeatParts, K = ctx.cfg.constants;
    var cOf = { water: K.c_water, oil: K.c_oil };
    var colorOf = { water: ctx.cfg.colors.water, oil: ctx.cfg.colors.oil };
    var Q = sc.heaterPowerW * sc.heatSeconds; // ความร้อนที่ให้ต่อการกด 1 ครั้ง (J) เท่ากันทุกภาชนะ
    var xs = [-0.22, 0.2];
    var maxMass = Math.max.apply(null, sc.containers.map(function (c) { return c.massG; }));

    var items = sc.containers.map(function (c, i) {
      var g = ent("a-entity", { position: xs[i] + " 0.04 0" }, stage);
      // จำนวนอนุภาคแปรตามมวล (20–40 ลูก) ให้เห็นว่ามวลมากกว่า = สารมากกว่า
      var count = sc.containers[0].massG === sc.containers[1].massG ? 30 : Math.round(20 + 20 * (c.massG - Math.min(sc.containers[0].massG, sc.containers[1].massG)) / Math.max(1, maxMass - Math.min(sc.containers[0].massG, sc.containers[1].massG)));
      var bk = P.beaker(g, ctx, { position: "0 0 0", radius: 0.1, height: 0.25, color: colorOf[c.substance],
        tempC: sc.startTempC, seed: 31 + i * 5, count: count });
      // ป้ายชื่อแปะหน้าบีกเกอร์ (เหมือนสติกเกอร์)
      ent("a-entity", { position: "0 -0.035 0.105", "th-label": { text: c.label, size: 0.026 } }, g);
      var th = P.thermometer(g, ctx, { position: "0.135 0.03 0.02", height: 0.3, radius: 0.009,
        min: 0, max: c.substance === "oil" ? 150 : 100, value: sc.startTempC, color: "#DC2626", step: c.substance === "oil" ? 50 : 20 });
      var fl = P.flame(g, ctx, { position: "0 -0.235 0", scale: 1 });
      fl.object3D.visible = false;
      var tLabel = ent("a-entity", { position: "0 0.185 0.02",
        "th-label": { text: "อุณหภูมิ " + ctx.formatTemp(sc.startTempC), size: 0.03, border: "#c2410c", minWidth: 0.25 } }, g);
      var dLabel = ent("a-entity", { position: "0 0.24 0.02",
        "th-label": { text: "เพิ่มขึ้น 0.0 °C", size: 0.026, bg: "rgba(254,243,199,0.95)", minWidth: 0.25 } }, g);
      if (sc.showC) {
        ent("a-entity", { position: "0 -0.08 0.105",
          "th-label": { text: "c = " + cOf[c.substance].toFixed(1) + " J/g·°C", size: 0.024, bg: "rgba(255,255,255,0.92)" } }, g);
      }
      return { cfg: c, bk: bk, th: th, flame: fl, tLabel: tLabel, dLabel: dLabel, temp: sc.startTempC, from: sc.startTempC, to: sc.startTempC };
    });

    var timeLabel = ent("a-entity", { position: "0 -0.24 0.02",
      "th-label": { text: "เวลา 0 วินาที", size: 0.024, bg: "rgba(15,23,42,0.85)", color: "#ffffff" } }, stage);
    var qLabel = ent("a-entity", { position: "0 -0.3 0.02",
      "th-label": { text: "ความร้อนที่ให้แต่ละใบ 0 J (เท่ากัน)", size: 0.024, bg: "rgba(255,255,255,0.92)" } }, stage);

    var state = { heating: false, t: 0, presses: 0, totalQ: 0 };

    function deltaFor(item, q) { return q / (item.cfg.massG * cOf[item.cfg.substance]); }

    function render() {
      items.forEach(function (it) {
        it.th.set(it.temp);
        it.bk.setTemp(it.temp);
        it.tLabel.setAttribute("th-label", { text: "อุณหภูมิ " + it.temp.toFixed(1) + " °C" });
        it.dLabel.setAttribute("th-label", { text: "เพิ่มขึ้น " + (it.temp - sc.startTempC).toFixed(1) + " °C" });
      });
    }

    function summary() {
      var d0 = items[0].temp - sc.startTempC, d1 = items[1].temp - sc.startTempC;
      if (state.totalQ === 0) { ctx.ui.setInfo(sc.hint); return; }
      var fast = d0 >= d1 ? 0 : 1, slow = 1 - fast;
      var ratio = Math.max(d0, d1) / Math.max(1e-9, Math.min(d0, d1));
      ctx.ui.setInfo(items[fast].cfg.label + " อุณหภูมิเพิ่มขึ้นเร็วกว่า " + items[slow].cfg.label +
        " ประมาณ " + ratio.toFixed(1) + " เท่า (ได้รับความร้อนเท่ากัน " + state.totalQ.toLocaleString("th-TH") + " J)");
    }

    var heatBtn = ctx.ui.addButton(sc.heatButton, function () {
      if (state.heating) return;
      var blocked = items.some(function (it) { return it.temp + deltaFor(it, Q) > MAX_TEMP[it.cfg.substance] + 1e-9; });
      if (blocked) { ctx.ui.setInfo(sc.maxNote); return; }
      state.heating = true; state.t = 0; state.presses++;
      items.forEach(function (it) { it.from = it.temp; it.to = it.temp + deltaFor(it, Q); it.flame.object3D.visible = true; });
      heatBtn.disabled = true;
    });
    ctx.ui.addButton(sc.resetButton, function () {
      state.heating = false; state.t = 0; state.presses = 0; state.totalQ = 0;
      items.forEach(function (it) { it.temp = sc.startTempC; it.flame.object3D.visible = false; });
      heatBtn.disabled = false;
      timeLabel.setAttribute("th-label", { text: "เวลา 0 วินาที" });
      qLabel.setAttribute("th-label", { text: "ความร้อนที่ให้แต่ละใบ 0 J (เท่ากัน)" });
      render(); summary();
    }, { secondary: true });

    // แอนิเมชันให้ความร้อน: 30 วินาทีจำลอง เล่นจริง 3 วินาที
    var REAL_SECONDS = 3;
    var driver = ent("a-entity", { "on-tick": "" }, stage);
    driver.onTick = function (dt) {
      if (!state.heating || window.HeatApp.paused) return;
      state.t = Math.min(1, state.t + dt / REAL_SECONDS);
      items.forEach(function (it) { it.temp = it.from + (it.to - it.from) * state.t; });
      var simSec = (state.presses - 1) * sc.heatSeconds + state.t * sc.heatSeconds;
      timeLabel.setAttribute("th-label", { text: "เวลา " + Math.round(simSec) + " วินาที" });
      var q = Math.round((state.presses - 1) * Q + state.t * Q);
      qLabel.setAttribute("th-label", { text: "ความร้อนที่ให้แต่ละใบ " + q.toLocaleString("th-TH") + " J (เท่ากัน)" });
      render();
      if (state.t >= 1) {
        state.heating = false;
        state.totalQ = state.presses * Q;
        items.forEach(function (it) { it.temp = it.to; it.flame.object3D.visible = false; });
        heatBtn.disabled = false;
        render(); summary();
      }
    };

    ctx.ui.setInfo(sc.hint);
    render();

    window.__scene = {
      state: state, items: items, Q: Q,
      deltas: function () { return items.map(function (it) { return it.temp - sc.startTempC; }); },
      heatNow: function () { // ให้ความร้อนทันที 1 ครั้ง (สำหรับการทดสอบ)
        items.forEach(function (it) { it.temp += deltaFor(it, Q); });
        state.presses++; state.totalQ = state.presses * Q; render(); summary();
      }
    };
  }

  window.HeatScenes.register("ar-2a", { build: build });
  window.HeatScenes.register("ar-2b", { build: build });
})();

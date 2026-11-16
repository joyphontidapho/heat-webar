/*
 * AR-4A ลูกบอลโลหะกับวงแหวน
 * - ตอนเย็น ลูกบอลลอดผ่านวงแหวนได้ ตอนร้อน ลูกบอลขยายตัวจึงค้างอยู่บนวงแหวน
 * - หน้าต่างซูมแสดงอนุภาคโลหะ: ร้อนแล้วระยะห่างเพิ่ม ขนาดอนุภาคเท่าเดิม
 * การโต้ตอบ: สวิตช์ เย็น/ร้อน
 */
window.HeatScenes.register("ar-4a", {
  build: function (stage, ctx) {
    var sc = ctx.scene, ent = ctx.ent, P = window.HeatParts;
    var metal = ctx.cfg.colors.metal;

    var RX = -0.17, RY = -0.02;          // ตำแหน่งวงแหวน
    var BALL_R = 0.058;                   // รัศมีลูกบอลตอนเย็น
    var HOT_R = BALL_R * (1 + sc.expansionVisual);
    var TUBE = 0.009;
    var RING_INNER = (BALL_R + HOT_R) / 2; // อยู่ระหว่างลูกบอลเย็นกับลูกบอลร้อน
    var RING_R = RING_INNER + TUBE;
    var TILT = 72;                        // เอียงวงแหวนให้เห็นเป็นวงรี

    // วงแหวน + ด้ามจับ
    var ring = ent("a-entity", { position: RX + " " + RY + " 0", rotation: TILT + " 0 0" }, stage);
    ent("a-torus", { radius: RING_R, "radius-tubular": TUBE, "segments-tubular": 64, material: "color: #6b7280; metalness: 0.6; roughness: 0.35" }, ring);
    ent("a-cylinder", { radius: 0.007, height: 0.2, rotation: "0 0 90", position: (RX + RING_R + 0.1) + " " + RY + " 0", material: "color: #78350f" }, stage);

    var ball = ent("a-sphere", { radius: BALL_R, "segments-width": 32, "segments-height": 20, position: RX + " 0.26 0",
      material: "color: " + metal + "; metalness: 0.6; roughness: 0.3; emissive: #000000" }, stage);

    var tLabel = ent("a-entity", { position: RX + " 0.31 0.03",
      "th-label": { text: "อุณหภูมิ " + ctx.formatTemp(sc.coldC), size: 0.032, border: "#1d4ed8", minWidth: 0.26 } }, stage);

    // หน้าต่างซูมอนุภาคโลหะ
    var zoom = P.zoomWindow(stage, ctx, { position: "0.25 -0.02 0", radius: 0.19, title: sc.zoomTitle });
    var pb = ent("a-entity", { position: "0 0.0 0",
      "particle-box": { w: 0.26, h: 0.26, d: 0.12, color: metal, state: "solid", tempC: sc.coldC, showBox: false, seed: 51 } }, zoom.inner);

    var state = { hot: false, y: 0.26, phase: "fall", wait: 0, stuck: false, passed: false };
    var restY = RY + Math.sqrt(Math.max(0, Math.pow(HOT_R + TUBE, 2) - RING_R * RING_R));

    function apply(hot) {
      state.hot = hot;
      var r = hot ? HOT_R : BALL_R;
      ball.setAttribute("radius", r);
      ball.setAttribute("material", { color: hot ? "#d97706" : metal, emissive: hot ? "#7c2d12" : "#000000" });
      var t = hot ? sc.hotC : sc.coldC;
      tLabel.setAttribute("th-label", { text: "อุณหภูมิ " + ctx.formatTemp(t), border: hot ? "#c2410c" : "#1d4ed8" });
      pb.setAttribute("particle-box", { tempC: t });
      ctx.ui.setInfo(hot ? sc.hotNote : sc.coldNote);
      state.y = 0.26; state.phase = "fall"; state.wait = 0; state.stuck = false; state.passed = false;
    }

    ctx.ui.addToggle(sc.toggleLabel, [
      { label: sc.coldLabel + " (" + ctx.formatTemp(sc.coldC) + ")", value: false },
      { label: sc.hotLabel + " (" + ctx.formatTemp(sc.hotC) + ")", value: true }
    ], false, apply);

    // ลูกบอลตกลงมา: ลอดผ่าน (เย็น) หรือค้างบนวงแหวน (ร้อน) แล้ววนซ้ำ
    var driver = ent("a-entity", { "on-tick": "" }, stage);
    function step(dt) {
      if (state.phase === "fall") {
        state.y -= dt * 0.16;
        var ballR = state.hot ? HOT_R : BALL_R;
        if (ballR > RING_INNER && state.y <= restY) { state.y = restY; state.phase = "wait"; state.stuck = true; }
        if (state.y < RY - 0.08) state.passed = true;
        if (state.y <= -0.25) { state.y = -0.25; state.phase = "wait"; }
      } else {
        state.wait += dt;
        if (state.wait > 1.6) { state.y = 0.26; state.wait = 0; state.phase = "fall"; }
      }
      ball.object3D.position.y = state.y;
    }
    driver.onTick = function (dt) { if (!window.HeatApp.paused) step(dt); };

    apply(false);
    window.__scene = {
      state: state, apply: apply, ringInner: RING_INNER, coldR: BALL_R, hotR: HOT_R,
      sim: function () { return pb.components["particle-box"].sim; },
      run: function (seconds) { for (var t = 0; t < seconds; t += 1 / 60) step(1 / 60); }
    };
  }
});

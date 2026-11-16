/*
 * AR-5A รางรถไฟและรอยต่อสะพาน
 * - กลางคืน (เย็น) รางหดตัว ช่องว่างกว้าง · กลางวัน (ร้อน) รางขยายตัว ช่องว่างแคบลง
 * - ตัวเลือก "ไม่เว้นรอยต่อ": กลางวันรางขยายตัวไม่มีที่ไปจึงโก่ง และพื้นสะพานดันกันจนยกตัว
 * การโต้ตอบ: สวิตช์ กลางวัน/กลางคืน และ เว้น/ไม่เว้นรอยต่อ
 */
window.HeatScenes.register("ar-5a", {
  build: function (stage, ctx) {
    var sc = ctx.scene, ent = ctx.ent;
    var N = 12;                 // จำนวนชิ้นต่อรางหนึ่งท่อน
    var L = 0.22;               // ความยาวรางหนึ่งท่อนตอนกลางคืน
    var GAP = 0.04;             // ช่องว่างตอนกลางคืน (เมื่อเว้นรอยต่อ)
    var E = sc.expansionVisual; // สัดส่วนความยาวที่เพิ่มตอนกลางวัน

    // ---------------- รางรถไฟ (ด้านบน) ----------------
    var RY = 0.12;
    ent("a-box", { width: 0.56, height: 0.035, depth: 0.12, position: "-0.2 " + (RY - 0.05) + " -0.01", material: "color: #a8a29e; roughness: 1" }, stage);
    for (var k = 0; k < 7; k++) {
      ent("a-box", { width: 0.035, height: 0.02, depth: 0.12, position: (-0.44 + k * 0.075) + " " + (RY - 0.026) + " 0", material: "color: #78350f" }, stage);
    }
    function railPieces() {
      var arr = [];
      for (var i = 0; i < N; i++) arr.push(ent("a-box", { width: L / N + 0.002, height: 0.026, depth: 0.04, material: "color: #6b7280; metalness: 0.6; roughness: 0.35" }, stage));
      return arr;
    }
    var left = railPieces(), right = railPieces();
    var LEFT_END = -0.46, RIGHT_END = LEFT_END + 2 * L + GAP;

    ent("a-entity", { position: "-0.24 " + (RY + 0.08) + " 0.02", "th-label": { text: sc.railTitle, size: 0.028 } }, stage);
    var railGapLabel = ent("a-entity", { position: (LEFT_END + L + GAP / 2) + " " + (RY - 0.095) + " 0.03", "th-label": { text: "ช่องว่าง", size: 0.022, bg: "rgba(254,243,199,0.95)" } }, stage);

    // ---------------- รอยต่อสะพาน (ด้านล่าง) ----------------
    var BY = -0.17;
    var BL = 0.2;
    var B_LEFT = -0.44, B_RIGHT = B_LEFT + 2 * BL + GAP;
    ent("a-box", { width: 0.05, height: 0.14, depth: 0.08, position: (B_LEFT + 0.02) + " " + (BY - 0.09) + " 0", material: "color: #94a3b8" }, stage);
    ent("a-box", { width: 0.05, height: 0.14, depth: 0.08, position: (B_RIGHT - 0.02) + " " + (BY - 0.09) + " 0", material: "color: #94a3b8" }, stage);
    ent("a-box", { width: 0.06, height: 0.14, depth: 0.08, position: (B_LEFT + BL + GAP / 2) + " " + (BY - 0.09) + " 0", material: "color: #94a3b8" }, stage);
    var slabL = ent("a-entity", {}, stage), slabR = ent("a-entity", {}, stage);
    var slabLBox = ent("a-box", { height: 0.035, depth: 0.12, material: "color: #cbd5e1" }, slabL);
    var slabRBox = ent("a-box", { height: 0.035, depth: 0.12, material: "color: #cbd5e1" }, slabR);
    ent("a-entity", { position: (B_LEFT + BL) + " " + (BY + 0.07) + " 0.02", "th-label": { text: sc.bridgeTitle, size: 0.028 } }, stage);

    // ---------------- ป้ายอุณหภูมิ + ดวงอาทิตย์/ดวงจันทร์ ----------------
    var tLabel = ent("a-entity", { position: "0.32 0.2 0.03", "th-label": { text: "", size: 0.032, border: "#c2410c", minWidth: 0.24 } }, stage);
    var sky = { day: true };
    var icon = ctx.canvasPlane(stage, {
      w: 0.12, h: 0.12, px: 240, position: "0.32 0.05 0",
      draw: function (c, W, H) {
        if (sky.day) {
          c.fillStyle = "#f59e0b"; c.beginPath(); c.arc(W / 2, H / 2, W * 0.2, 0, Math.PI * 2); c.fill();
          c.strokeStyle = "#f59e0b"; c.lineWidth = 12; c.lineCap = "round";
          for (var a = 0; a < 8; a++) { var t = a * Math.PI / 4; c.beginPath(); c.moveTo(W / 2 + Math.cos(t) * W * 0.3, H / 2 + Math.sin(t) * H * 0.3); c.lineTo(W / 2 + Math.cos(t) * W * 0.44, H / 2 + Math.sin(t) * H * 0.44); c.stroke(); }
        } else {
          c.fillStyle = "#1e3a8a"; c.beginPath(); c.arc(W / 2, H / 2, W * 0.46, 0, Math.PI * 2); c.fill();
          c.fillStyle = "#fde68a"; c.beginPath(); c.arc(W * 0.48, H / 2, W * 0.26, 0, Math.PI * 2); c.fill();
          c.fillStyle = "#1e3a8a"; c.beginPath(); c.arc(W * 0.6, H * 0.42, W * 0.24, 0, Math.PI * 2); c.fill();
        }
      }
    });

    var state = { day: false, gap: true, f: 0, target: 0, railGap: GAP, bridgeGap: GAP, buckle: 0, lift: 0 };

    /** วางชิ้นรางตามความยาว len จากปลายคงที่ (dir = +1 จากซ้าย, -1 จากขวา) และความโก่ง amp */
    function layRail(pieces, fixedX, dir, len, amp) {
      var ds = len / N;
      for (var i = 0; i < N; i++) {
        var s0 = i * ds, s1 = (i + 1) * ds;
        var y0 = amp * Math.sin(Math.PI * s0 / len), y1 = amp * Math.sin(Math.PI * s1 / len);
        var x0 = fixedX + dir * s0;
        var x1 = fixedX + dir * s1;
        var dx = (x1 - x0), dy = (y1 - y0);
        var segLen = Math.sqrt(dx * dx + dy * dy);
        pieces[i].setAttribute("position", ((x0 + x1) / 2) + " " + (RY + (y0 + y1) / 2) + " 0.01");
        pieces[i].setAttribute("rotation", "0 0 " + (Math.atan2(dy, dx) * 180 / Math.PI));
        pieces[i].setAttribute("width", Math.max(segLen, 0.001) + 0.002);
      }
    }

    function layout() {
      var f = state.f; // 0 = กลางคืน, 1 = กลางวัน
      var grow = L * E * f;
      if (state.gap) {
        // รางยาวขึ้นเข้าหากัน ช่องว่างแคบลง
        state.railGap = GAP - 2 * grow;
        state.buckle = 0;
        layRail(left, LEFT_END, 1, L + grow, 0);
        layRail(right, RIGHT_END, -1, L + grow, 0);
      } else {
        // ไม่เว้นรอยต่อ: รางชนกันตั้งแต่กลางคืน กลางวันยาวขึ้นแต่ไม่มีที่ไป → โก่งขึ้น
        state.railGap = 0;
        var half = L + GAP / 2;
        var excess = (half + grow) / half - 1;               // สัดส่วนความยาวส่วนเกิน
        state.buckle = (2 * half / Math.PI) * Math.sqrt(Math.max(0, excess)); // ความสูงส่วนโก่งโดยประมาณ
        layRail(left, LEFT_END, 1, half, state.buckle);
        layRail(right, LEFT_END + 2 * half, -1, half, state.buckle);
      }
      railGapLabel.object3D.visible = state.gap;

      // สะพาน
      var bgrow = BL * E * f;
      var bl, br, lift = 0;
      if (state.gap) {
        state.bridgeGap = GAP - 2 * bgrow;
        bl = BL + bgrow; br = BL + bgrow;
      } else {
        state.bridgeGap = 0;
        bl = BL + GAP / 2; br = BL + GAP / 2;
        lift = Math.asin(Math.min(0.5, Math.sqrt(2 * bgrow / bl))) * 180 / Math.PI * 0.6;
      }
      state.lift = lift;
      slabLBox.setAttribute("width", bl); slabRBox.setAttribute("width", br);
      slabL.setAttribute("position", B_LEFT + " " + BY + " 0"); slabL.setAttribute("rotation", "0 0 " + lift);
      slabLBox.setAttribute("position", (bl / 2) + " 0 0");
      slabR.setAttribute("position", B_RIGHT + " " + BY + " 0"); slabR.setAttribute("rotation", "0 0 " + (-lift));
      slabRBox.setAttribute("position", (-br / 2) + " 0 0");
    }

    function refreshText() {
      var t = state.day ? sc.dayC : sc.nightC;
      tLabel.setAttribute("th-label", { text: (state.day ? sc.dayLabel : sc.nightLabel) + " " + ctx.formatTemp(t) });
      sky.day = state.day; icon.redraw();
      var n = sc.notes;
      ctx.ui.setInfo(state.gap ? (state.day ? n.dayGap : n.nightGap) : (state.day ? n.dayNoGap : n.nightNoGap));
    }

    ctx.ui.addToggle(sc.timeLabel, [{ label: sc.nightLabel, value: false }, { label: sc.dayLabel, value: true }], false,
      function (v) { state.day = v; state.target = v ? 1 : 0; refreshText(); });
    ctx.ui.addToggle(sc.jointLabel, [{ label: sc.gapLabel, value: true }, { label: sc.noGapLabel, value: false }], true,
      function (v) { state.gap = v; layout(); refreshText(); });

    // เปลี่ยนความยาวอย่างนุ่มนวลเมื่อสลับช่วงเวลา
    var driver = ent("a-entity", { "on-tick": "" }, stage);
    driver.onTick = function (dt) {
      if (window.HeatApp.paused || state.f === state.target) return;
      var step = dt * 0.8;
      state.f = state.f < state.target ? Math.min(state.target, state.f + step) : Math.max(state.target, state.f - step);
      layout();
    };

    layout(); refreshText();
    window.__scene = {
      state: state,
      set: function (day, gap) { state.day = day; state.gap = gap; state.target = state.f = day ? 1 : 0; layout(); refreshText(); }
    };
  }
});

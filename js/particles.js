/*
 * particles.js — ระบบอนุภาคที่ใช้ร่วมกันทุกฉาก
 *
 * แบ่งเป็น 2 ส่วน:
 *   1) ParticleSim  : คำนวณตำแหน่งอนุภาค (ไม่ขึ้นกับ A-Frame จึงทดสอบแยกได้)
 *   2) particle-box : คอมโพเนนต์ A-Frame ที่วาดอนุภาคด้วย InstancedMesh (วาดครั้งเดียวทั้งกล่อง)
 *
 * กฎทางวิทยาศาสตร์ที่ระบบนี้รักษาไว้เสมอ:
 *   - ขนาดอนุภาคคงที่ทุกอุณหภูมิ (ไม่มีการ scale อนุภาคเลย)
 *   - ความเร็ว/แอมพลิจูดการสั่น ขึ้นกับอุณหภูมิอย่างเดียว
 *     ดังนั้นขณะเปลี่ยนสถานะ (อุณหภูมิคงที่) ความเร็วเฉลี่ยจึงคงที่
 *   - ระยะห่างเฉลี่ยในของแข็ง/ของเหลว เพิ่มขึ้นเล็กน้อยเมื่อร้อน
 */
(function () {
  "use strict";

  var T_REF_K = 293.15; // 20 °C เป็นค่าอ้างอิง (speedFactor = 1)

  function cfgParticles() {
    return (window.HEAT_CONFIG && window.HEAT_CONFIG.particles) || {};
  }

  /** ตัวคูณความเร็วตามอุณหภูมิ: (T/Tref)^(0.5·k) โดย k = speedExaggeration
   *  k = 1 คือ v ∝ √T ตามจริง, k > 1 ขยายความต่างแต่ทิศทางเหมือนเดิม */
  function speedFactor(tempC) {
    var k = cfgParticles().speedExaggeration || 1;
    var tK = Math.max(1, tempC + 273.15);
    return Math.pow(tK / T_REF_K, 0.5 * k);
  }

  /** ตัวคูณระยะห่างของของแข็ง/ของเหลว (1 ที่ 0 °C) */
  function spacingFactor(tempC) {
    var g = cfgParticles().spacingGrowthPer100C;
    if (g === undefined) g = 0.1;
    return Math.max(0.9, 1 + g * (tempC / 100));
  }

  /** ตัวสุ่มที่กำหนด seed ได้ (ผลซ้ำได้ทุกครั้ง ใช้ทดสอบได้) */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ค่าพื้นฐาน (หน่วย: ความกว้างการ์ด = 1)
  var BASE = {
    liquidSpeed: 0.07,   // ความเร็วของเหลวที่ 20 °C
    gasSpeed: 0.24,      // ความเร็วแก๊สที่ 20 °C
    solidAmp: 0.006,     // แอมพลิจูดการสั่นของแข็งที่ 20 °C
    solidOmega: 16,      // ความถี่การสั่น (rad/s)
    latticeGap: 1.18,    // ระยะห่างโครงผลึก = 2r × ค่านี้ (ที่ 0 °C)
    liquidGap: 1.08      // ระยะใกล้สุดของเหลว = 2r × ค่านี้
  };

  /**
   * ParticleSim
   * opts: { count, radius, w, h, d, state, next, fraction, tempC, seed }
   *   state    : "solid" | "liquid" | "gas"
   *   next     : สถานะปลายทางระหว่างเปลี่ยนสถานะ (หรือ null)
   *   fraction : 0–1 สัดส่วนอนุภาคที่เปลี่ยนไปเป็น next แล้ว
   * พิกัดในกล่อง: x ∈ [-w/2, w/2], y ∈ [-h/2, h/2], z ∈ [-d/2, d/2]
   */
  function ParticleSim(opts) {
    var p = cfgParticles();
    this.count = clampInt(opts.count || p.countPerBox || 32, 20, 40);
    this.radius = opts.radius || p.radius || 0.022;
    this.w = opts.w || 0.3;
    this.h = opts.h || 0.3;
    this.d = opts.d || 0.15;
    this.rand = mulberry32(opts.seed || 1);
    this.time = 0;
    this.particles = [];
    for (var i = 0; i < this.count; i++) {
      this.particles.push({
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        hx: 0, hy: 0, hz: 0,           // ตำแหน่งในโครงผลึก (lattice)
        ph: [this.rand() * 6.283, this.rand() * 6.283, this.rand() * 6.283],
        mode: "solid"
      });
    }
    this.state = null;
    this.configure({
      state: opts.state || "liquid",
      next: opts.next || null,
      fraction: opts.fraction || 0,
      tempC: opts.tempC === undefined ? 20 : opts.tempC
    }, true);
  }

  function clampInt(v, lo, hi) {
    return Math.max(lo, Math.min(hi, Math.round(v)));
  }

  ParticleSim.prototype._latticeDims = function () {
    var nz = 2;
    var nx = Math.ceil(Math.sqrt(this.count / nz));
    var ny = Math.ceil(this.count / (nx * nz));
    return [nx, ny, nz];
  };

  /** คำนวณตำแหน่งโครงผลึกตามอุณหภูมิ (ฐานอยู่ที่ก้นกล่อง) */
  ParticleSim.prototype._computeLattice = function () {
    var dims = this._latticeDims();
    var gap = 2 * this.radius * BASE.latticeGap * spacingFactor(this.tempC);
    var nx = dims[0], ny = dims[1], nz = dims[2];
    var floor = -this.h / 2 + this.radius + 0.004;
    var idx = 0;
    for (var j = 0; j < ny && idx < this.count; j++) {
      for (var k = 0; k < nz && idx < this.count; k++) {
        for (var i = 0; i < nx && idx < this.count; i++) {
          var p = this.particles[idx++];
          p.hx = (i - (nx - 1) / 2) * gap;
          p.hy = floor + j * gap;
          p.hz = (k - (nz - 1) / 2) * gap;
        }
      }
    }
  };

  /** ความสูงของชั้นของเหลว (ให้อนุภาคชิดกัน) */
  ParticleSim.prototype.liquidHeight = function () {
    var gap = 2 * this.radius * BASE.liquidGap * spacingFactor(this.tempC);
    var area = Math.max(1e-6, (this.w - 2 * this.radius) * (this.d - 2 * this.radius));
    var nLiquidLike = 0;
    for (var i = 0; i < this.count; i++) {
      if (this.particles[i].mode !== "gas") nLiquidLike++;
    }
    var hgt = (nLiquidLike * gap * gap * gap * 1.25) / area + 2 * this.radius;
    return Math.min(this.h, hgt);
  };

  /**
   * ตั้งค่าสถานะ/อุณหภูมิ/สัดส่วนการเปลี่ยนสถานะ
   * อนุภาคที่ "เปลี่ยนก่อน" คืออนุภาคชั้นบนสุด (ผิวหน้า) เรียงลงไป
   */
  ParticleSim.prototype.configure = function (c, reset) {
    var changedState = reset || c.state !== this.state || c.next !== this.next;
    this.state = c.state;
    this.next = c.next || null;
    this.fraction = Math.max(0, Math.min(1, c.fraction || 0));
    this.tempC = c.tempC;
    this._computeLattice();

    if (changedState || !this.order) {
      // ลำดับการเปลี่ยนสถานะ: ชั้นบนก่อน (y มาก) แล้วสุ่มในชั้นเดียวกัน
      var self = this;
      this.order = this.particles.map(function (p, i) { return { i: i, key: -p.hy + self.rand() * 0.001 }; })
        .sort(function (a, b) { return a.key - b.key; })
        .map(function (o) { return o.i; });
    }

    var nNext = this.next ? Math.round(this.fraction * this.count) : 0;
    for (var r = 0; r < this.count; r++) {
      var p = this.particles[this.order[r]];
      var mode = r < nNext ? this.next : this.state;
      if (reset || changedState) {
        this._place(p, mode);
      } else if (p.mode !== mode) {
        this._kick(p, mode); // เปลี่ยนสถานะจากตำแหน่งปัจจุบัน (ต่อเนื่อง ไม่กระโดด)
      }
      p.mode = mode;
    }
  };

  /** วางอนุภาคใหม่ตามสถานะ (ใช้ตอนเริ่ม/เปลี่ยนฉาก) */
  ParticleSim.prototype._place = function (p, mode) {
    var r = this.radius;
    if (mode === "solid") {
      p.x = p.hx; p.y = p.hy; p.z = p.hz;
      p.vx = p.vy = p.vz = 0;
      return;
    }
    if (mode === "liquid") {
      var hl = this.liquidHeight();
      p.x = (this.rand() - 0.5) * (this.w - 2 * r);
      p.y = -this.h / 2 + r + this.rand() * Math.max(0.001, hl - 2 * r);
      p.z = (this.rand() - 0.5) * (this.d - 2 * r);
    } else {
      p.x = (this.rand() - 0.5) * (this.w - 2 * r);
      p.y = (this.rand() - 0.5) * (this.h - 2 * r);
      p.z = (this.rand() - 0.5) * (this.d - 2 * r);
    }
    this._kick(p, mode);
  };

  /** ให้ความเร็วเริ่มต้นแบบทิศสุ่มตามอุณหภูมิ */
  ParticleSim.prototype._kick = function (p, mode) {
    var v = this.targetSpeed(mode);
    var th = this.rand() * Math.PI * 2;
    var cz = this.rand() * 2 - 1;
    var s = Math.sqrt(1 - cz * cz);
    p.vx = v * s * Math.cos(th);
    p.vy = v * s * Math.sin(th);
    p.vz = v * cz;
    if (mode === "gas") p.vy = Math.abs(p.vy) + v * 0.3; // หลุดออกจากผิวของเหลวขึ้นด้านบน
  };

  /** ความเร็วเป้าหมายของแต่ละสถานะ (ขึ้นกับอุณหภูมิเท่านั้น) */
  ParticleSim.prototype.targetSpeed = function (mode) {
    var f = speedFactor(this.tempC);
    if (mode === "gas") return BASE.gasSpeed * f;
    if (mode === "liquid") return BASE.liquidSpeed * f;
    return BASE.solidAmp * BASE.solidOmega * f; // ความเร็วสูงสุดของการสั่น
  };

  /** แอมพลิจูดการสั่นของของแข็ง */
  ParticleSim.prototype.solidAmplitude = function () {
    // จำกัดไม่ให้สั่นเกินระยะห่างในโครงผลึก (สำหรับโลหะที่อุณหภูมิสูงมาก)
    return Math.min(BASE.solidAmp * speedFactor(this.tempC), this.radius * 0.45);
  };

  /** เดินเวลาไป dt วินาที */
  ParticleSim.prototype.step = function (dt) {
    dt = Math.min(dt, 0.05); // กันกระโดดเมื่อเฟรมช้า
    this.time += dt;
    var t = this.time;
    var r = this.radius;
    var hw = this.w / 2 - r, hh = this.h / 2 - r, hd = this.d / 2 - r;
    var amp = this.solidAmplitude();
    var om = BASE.solidOmega;
    var liqTop = -this.h / 2 + this.liquidHeight() - r;
    var vLiq = this.targetSpeed("liquid");
    var vGas = this.targetSpeed("gas");
    var minDist = 2 * r * BASE.liquidGap * spacingFactor(this.tempC);
    var ps = this.particles;
    var i, p;

    // 1) อัปเดตตามสถานะ
    for (i = 0; i < ps.length; i++) {
      p = ps[i];
      if (p.mode === "solid") {
        // ดึงเข้าหาตำแหน่งโครงผลึก (นุ่มนวล) + สั่นรอบจุดเดิม
        var tx = p.hx + amp * Math.sin(om * t + p.ph[0]);
        var ty = p.hy + amp * Math.sin(om * 1.13 * t + p.ph[1]);
        var tz = p.hz + amp * Math.sin(om * 0.91 * t + p.ph[2]);
        var a = Math.min(1, dt * 12);
        p.x += (tx - p.x) * a; p.y += (ty - p.y) * a; p.z += (tz - p.z) * a;
        continue;
      }
      if (p.mode === "liquid") {
        // เดินสุ่ม (ไหลเลื่อนผ่านกัน) และรักษาอัตราเร็วให้ใกล้ค่าเป้าหมาย
        var j = vLiq * 2.5 * dt;
        p.vx += (this.rand() - 0.5) * j * 4;
        p.vy += (this.rand() - 0.5) * j * 4 - 0.02 * dt; // แรงโน้มถ่วงเล็กน้อย
        p.vz += (this.rand() - 0.5) * j * 4;
        normalizeTo(p, vLiq);
      } else {
        normalizeTo(p, vGas); // แก๊ส: เส้นตรง อัตราเร็วคงที่ตามอุณหภูมิ
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;

      // ชนผนัง (สะท้อน)
      if (p.x < -hw) { p.x = -hw; p.vx = Math.abs(p.vx); }
      if (p.x > hw) { p.x = hw; p.vx = -Math.abs(p.vx); }
      if (p.z < -hd) { p.z = -hd; p.vz = Math.abs(p.vz); }
      if (p.z > hd) { p.z = hd; p.vz = -Math.abs(p.vz); }
      if (p.y < -hh) { p.y = -hh; p.vy = Math.abs(p.vy); }
      var top = p.mode === "liquid" ? Math.min(hh, liqTop) : hh;
      if (p.y > top) {
        // ของเหลว: ผิวหน้าเป็นขอบนุ่ม ดันกลับลงมา
        p.y = p.mode === "liquid" ? Math.max(-hh, top - 0.001) : top;
        p.vy = -Math.abs(p.vy);
      }
    }

    // 2) แรงผลักระหว่างอนุภาคของเหลว (ไม่ให้ซ้อนกัน) — ของแข็งเป็นสิ่งกีดขวางที่ไม่ขยับ
    for (i = 0; i < ps.length; i++) {
      p = ps[i];
      if (p.mode !== "liquid") continue;
      for (var k = 0; k < ps.length; k++) {
        if (k === i) continue;
        var q = ps[k];
        if (q.mode === "gas") continue;
        var dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z;
        var d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= minDist * minDist || d2 < 1e-12) continue;
        var dist = Math.sqrt(d2);
        var push = (minDist - dist) / dist;
        var share = q.mode === "liquid" ? 0.5 : 1.0;
        p.x += dx * push * share; p.y += dy * push * share; p.z += dz * push * share;
        if (q.mode === "liquid") { q.x -= dx * push * 0.5; q.y -= dy * push * 0.5; q.z -= dz * push * 0.5; }
      }
      if (p.y < -hh) p.y = -hh;
      if (p.x < -hw) p.x = -hw; if (p.x > hw) p.x = hw;
      if (p.z < -hd) p.z = -hd; if (p.z > hd) p.z = hd;
    }
  };

  function normalizeTo(p, v) {
    var s = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
    if (s < 1e-9) { p.vx = v; return; }
    var k = v / s;
    p.vx *= k; p.vy *= k; p.vz *= k;
  }

  /** ค่าเฉลี่ยอัตราเร็วของอนุภาคในสถานะที่กำหนด (ใช้ในการทดสอบ) */
  ParticleSim.prototype.meanSpeed = function (mode) {
    return this.targetSpeed(mode);
  };

  window.HeatParticles = {
    ParticleSim: ParticleSim,
    speedFactor: speedFactor,
    spacingFactor: spacingFactor,
    mulberry32: mulberry32,
    BASE: BASE
  };

  // -------------------------------------------------------------------
  // คอมโพเนนต์ A-Frame
  // -------------------------------------------------------------------
  if (!window.AFRAME) return;
  var THREE = window.AFRAME.THREE;

  window.AFRAME.registerComponent("particle-box", {
    schema: {
      w: { type: "number", default: 0.3 },
      h: { type: "number", default: 0.3 },
      d: { type: "number", default: 0.15 },
      count: { type: "int", default: 0 },
      color: { type: "color", default: "#3B82F6" },
      state: { type: "string", default: "liquid" },
      next: { type: "string", default: "" },
      fraction: { type: "number", default: 0 },
      tempC: { type: "number", default: 20 },
      showBox: { type: "boolean", default: true },
      seed: { type: "int", default: 1 },
      epoch: { type: "int", default: 0 }   // เปลี่ยนค่านี้เมื่อต้องการวางอนุภาคใหม่ทั้งหมด
    },

    init: function () {
      var data = this.data;
      this.sim = new ParticleSim({
        count: data.count || undefined,
        w: data.w, h: data.h, d: data.d,
        state: data.state, next: data.next || null,
        fraction: data.fraction, tempC: data.tempC, seed: data.seed
      });
      var r = this.sim.radius;
      // อนุภาคทุกลูกใช้ geometry เดียวกัน รัศมีคงที่ (ห้าม scale)
      var geo = new THREE.SphereGeometry(r, 14, 10);
      var mat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.45, metalness: 0.05 });
      this.mesh = new THREE.InstancedMesh(geo, mat, this.sim.count);
      this.mesh.frustumCulled = false;
      this.el.setObject3D("particles", this.mesh);

      if (data.showBox) {
        var boxGeo = new THREE.BoxGeometry(data.w, data.h, data.d);
        var edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(boxGeo),
          new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.8 })
        );
        var glass = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({
          color: 0xe2e8f0, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide
        }));
        var g = new THREE.Group();
        g.add(glass); g.add(edges);
        this.el.setObject3D("box", g);
      }
      this._m = new THREE.Matrix4();
      this._writeMatrices();
    },

    update: function (old) {
      if (!this.sim || !old || Object.keys(old).length === 0) return;
      var d = this.data;
      if (old.color !== d.color) this.mesh.material.color.set(d.color);
      var reset = old.epoch !== d.epoch;
      if (reset || old.state !== d.state || old.next !== d.next || old.fraction !== d.fraction || old.tempC !== d.tempC) {
        this.sim.configure({ state: d.state, next: d.next || null, fraction: d.fraction, tempC: d.tempC }, reset);
        this.el.emit("particles-updated", { liquidHeight: this.sim.liquidHeight() }, false);
      }
    },

    tick: function (t, dtMs) {
      if (window.HeatApp && window.HeatApp.paused) return;
      if (!dtMs) return;
      this.sim.step(dtMs / 1000);
      this._writeMatrices();
    },

    _writeMatrices: function () {
      var ps = this.sim.particles;
      for (var i = 0; i < ps.length; i++) {
        this._m.makeTranslation(ps[i].x, ps[i].y, ps[i].z); // แปลตำแหน่งอย่างเดียว ไม่มี scale
        this.mesh.setMatrixAt(i, this._m);
      }
      this.mesh.instanceMatrix.needsUpdate = true;
    },

    remove: function () {
      this.el.removeObject3D("particles");
      this.el.removeObject3D("box");
    }
  });
})();

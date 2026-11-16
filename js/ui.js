/*
 * ui.js — ส่วนที่ใช้ร่วมกันทุกฉาก
 *   - สถานะแอป (หยุด/เล่น)
 *   - ทะเบียนฉาก (HeatScenes)
 *   - คอมโพเนนต์ A-Frame: th-label (ข้อความไทยบนวัตถุ 3D), ar-hold, drag-rotate, viewer-fit
 *   - แถบบน/ล่าง หน้าขออนุญาตกล้อง ข้อความแนะนำ และการเริ่มฉาก (HeatUI.boot)
 */
(function () {
  "use strict";

  var CFG = window.HEAT_CONFIG;
  var T = CFG.text;

  // ------------------------------------------------------------------
  // สถานะแอป
  // ------------------------------------------------------------------
  var listeners = [];
  var lastDragAt = 0;
  window.HeatApp = {
    paused: false,
    setPaused: function (v) {
      this.paused = !!v;
      listeners.forEach(function (fn) { fn(window.HeatApp.paused); });
    },
    onPauseChange: function (fn) { listeners.push(fn); },
    /** true ถ้าเพิ่งลากหมุน (ใช้กันการแตะโดนวัตถุตอนลาก) */
    justDragged: function () { return Date.now() - lastDragAt < 250; }
  };

  // ------------------------------------------------------------------
  // ทะเบียนฉาก: แต่ละฉากเรียก HeatScenes.register("ar-1a", { build: fn })
  // ------------------------------------------------------------------
  var registry = {};
  window.HeatScenes = {
    register: function (id, def) { registry[id] = def; },
    get: function (id) { return registry[id]; }
  };

  /** แทนค่า {code} ในข้อความ */
  function fmt(s, vars) {
    return String(s).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] !== undefined ? vars[k] : ""; });
  }

  /** แสดงอุณหภูมิพร้อมหน่วย เช่น "-10 °C" */
  function formatTemp(c) {
    var v = Math.round(c);
    if (Object.is(v, -0)) v = 0;
    return v + " °C";
  }

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('400 32px "Sarabun"', "กขค 0123"),
      document.fonts.load('700 32px "Sarabun"', "กขค 0123")
    ]).catch(function () {});
  }

  // ------------------------------------------------------------------
  // คอมโพเนนต์ A-Frame
  // ------------------------------------------------------------------
  if (window.AFRAME) {
    var THREE = window.AFRAME.THREE;

    /**
     * th-label: วาดข้อความไทยลง canvas แล้วแปะบนแผ่นระนาบ
     * (ฟอนต์ในตัว A-Frame ไม่รองรับภาษาไทย จึงต้องวาดเอง)
     */
    window.AFRAME.registerComponent("th-label", {
      schema: {
        text: { type: "string", default: "" },
        size: { type: "number", default: 0.04 },     // ความสูงตัวอักษร (หน่วยโลก)
        color: { type: "color", default: "#0f172a" },
        bg: { type: "string", default: "rgba(255,255,255,0.92)" },
        border: { type: "string", default: "" },
        bold: { type: "boolean", default: true },
        padding: { type: "number", default: 0.35 },  // เท่าของขนาดตัวอักษร
        align: { type: "string", default: "center" },
        minWidth: { type: "number", default: 0 }      // ความกว้างขั้นต่ำ (หน่วยโลก)
      },
      init: function () {
        this.canvas = document.createElement("canvas");
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.colorSpace = THREE.SRGBColorSpace;
        this.texture.anisotropy = 4;
        this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false });
        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
        this.mesh.renderOrder = 10;
        this.el.setObject3D("mesh", this.mesh);
        var self = this;
        fontsReady().then(function () { self.draw(); });
      },
      update: function () { this.draw(); },
      draw: function () {
        var d = this.data;
        var px = 64; // ความสูงตัวอักษรบน canvas (px)
        var ctx = this.canvas.getContext("2d");
        var font = (d.bold ? "700 " : "400 ") + px + 'px "Sarabun", "Noto Sans Thai", sans-serif';
        var lines = String(d.text).split("\n");
        ctx.font = font;
        var maxW = 0;
        lines.forEach(function (l) { maxW = Math.max(maxW, ctx.measureText(l).width); });
        var pad = px * d.padding;
        // ภาษาไทยมีสระ/วรรณยุกต์บนและล่าง จึงเผื่อความสูงบรรทัดมากกว่าปกติ
        var lineH = px * 1.6;
        var minWpx = (d.minWidth / d.size) * px;
        var w = Math.ceil(Math.max(maxW + pad * 2, minWpx, px));
        var h = Math.ceil(lines.length * lineH + pad * 2);
        this.canvas.width = w; this.canvas.height = h;
        ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, w, h);
        if (d.bg && d.bg !== "none") {
          ctx.fillStyle = d.bg;
          roundRect(ctx, 2, 2, w - 4, h - 4, px * 0.35);
          ctx.fill();
          if (d.border) { ctx.lineWidth = 4; ctx.strokeStyle = d.border; ctx.stroke(); }
        }
        ctx.font = font;
        ctx.fillStyle = d.color;
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = d.align === "left" ? "left" : "center";
        var x = d.align === "left" ? pad : w / 2;
        lines.forEach(function (l, i) {
          // วางเส้นฐานให้มีที่ว่างทั้งด้านบน (ไม้เอก/สระบน) และด้านล่าง (สระอุ/อู)
          ctx.fillText(l, x, pad + lineH * i + lineH * 0.68);
        });
        this.texture.needsUpdate = true;
        var scale = d.size / px;
        this.mesh.scale.set(w * scale, h * scale, 1);
      },
      remove: function () {
        this.el.removeObject3D("mesh");
        this.texture.dispose();
        this.material.dispose();
      }
    });

    /**
     * ar-hold: คัดลอกตำแหน่งจากจุดยึดการ์ด (anchor) และค้างฉากไว้
     * ตามเวลาที่ตั้งใน config เมื่อการ์ดหลุดเฟรม เพื่อลดการกระพริบ
     */
    window.AFRAME.registerComponent("ar-hold", {
      schema: { anchor: { type: "selector" }, holdMs: { type: "number", default: 1000 } },
      init: function () {
        this.el.object3D.matrixAutoUpdate = false;
        this.el.object3D.visible = false;
        this.lastSeen = -Infinity;
        this.shown = false;
      },
      tick: function () {
        var a = this.data.anchor && this.data.anchor.object3D;
        if (!a) return;
        var now = performance.now();
        if (a.visible) {
          this.el.object3D.matrix.copy(a.matrix);
          this.el.object3D.matrixWorldNeedsUpdate = true;
          this.lastSeen = now;
        }
        var show = now - this.lastSeen < (a.visible ? Infinity : this.data.holdMs);
        if (show !== this.shown) {
          this.shown = show;
          this.el.object3D.visible = show;
          this.el.sceneEl.emit(show ? "content-visible" : "content-hidden");
        }
      }
    });

    /** on-tick: เรียกฟังก์ชัน el.onTick(dtSeconds) ทุกเฟรม (ใช้ควบคุมแอนิเมชันของฉาก) */
    window.AFRAME.registerComponent("on-tick", {
      tick: function (t, dt) { if (this.el.onTick && dt) this.el.onTick(Math.min(dt, 100) / 1000); }
    });

    /** drag-rotate: ลากนิ้ว/เมาส์เพื่อหมุนดูโมเดล (โหมด 3D) */
    window.AFRAME.registerComponent("drag-rotate", {
      init: function () {
        var el = this.el, canvas, down = false, sx = 0, sy = 0, moved = 0;
        var self = this;
        this.rx = 0; this.ry = 0;
        function onDown(e) { down = true; moved = 0; sx = e.clientX; sy = e.clientY; }
        function onMove(e) {
          if (!down) return;
          var dx = e.clientX - sx, dy = e.clientY - sy;
          sx = e.clientX; sy = e.clientY;
          moved += Math.abs(dx) + Math.abs(dy);
          if (moved > 6) lastDragAt = Date.now();
          self.ry = Math.max(-80, Math.min(80, self.ry + dx * 0.35));
          self.rx = Math.max(-50, Math.min(50, self.rx + dy * 0.25));
          el.object3D.rotation.set(THREE.MathUtils.degToRad(self.rx), THREE.MathUtils.degToRad(self.ry), 0);
        }
        function onUp() { down = false; }
        function attach() {
          canvas = el.sceneEl.canvas;
          canvas.addEventListener("pointerdown", onDown);
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
          window.addEventListener("pointercancel", onUp);
        }
        if (el.sceneEl.canvas) attach(); else el.sceneEl.addEventListener("render-target-loaded", attach);
      }
    });

    /** viewer-fit: เลื่อนกล้องให้เห็นฉากทั้งหมด ทั้งจอแนวตั้งและแนวนอน */
    window.AFRAME.registerComponent("viewer-fit", {
      schema: { width: { type: "number", default: 1.04 }, height: { type: "number", default: 0.78 } },
      init: function () {
        this.fit = this.fit.bind(this);
        window.addEventListener("resize", this.fit);
        this.fit();
      },
      fit: function () {
        var cam = this.el.getAttribute("camera") || {};
        var fov = THREE.MathUtils.degToRad(cam.fov || 50);
        // พื้นที่ที่ใช้ได้จริง = จอทั้งหมด ลบแถบบนและล่าง
        var top = (document.querySelector(".topbar") || {}).offsetHeight || 0;
        var bottom = (document.querySelector(".bottombar") || {}).offsetHeight || 0;
        var vh = Math.max(200, window.innerHeight - top - bottom);
        var aspect = window.innerWidth / vh;
        var zH = (this.data.height / 2) / Math.tan(fov / 2);
        var zW = (this.data.width / 2) / (Math.tan(fov / 2) * aspect);
        var z = Math.max(zH, zW) * 1.05 * (window.innerHeight / vh);
        // เลื่อนกล้องให้ฉากอยู่กลางพื้นที่ระหว่างแถบบนและแถบล่าง
        var worldPerPx = (2 * z * Math.tan(fov / 2)) / window.innerHeight;
        var yShift = ((bottom - top) / 2) * worldPerPx;
        this.el.object3D.position.set(0, -yShift, z);
      },
      remove: function () { window.removeEventListener("resize", this.fit); }
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ------------------------------------------------------------------
  // ตัวช่วยสร้าง DOM
  // ------------------------------------------------------------------
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") el.textContent = attrs[k];
        else if (k === "class") el.className = attrs[k];
        else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") el.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) el.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return el;
  }

  /** สร้าง entity A-Frame พร้อม attribute */
  function ent(tag, attrs, parent) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (k === "class") { el.className = v; return; }
      el.setAttribute(k, v);
    });
    if (parent) parent.appendChild(el);
    return el;
  }

  function isInAppBrowser() {
    var ua = navigator.userAgent || "";
    return /\bLine\/|FBAN|FBAV|Instagram|MicroMessenger|TikTok/i.test(ua);
  }

  function cameraSupported() {
    return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  // ------------------------------------------------------------------
  // HeatUI.boot — เริ่มหน้าฉาก (mode = "ar" หรือ "viewer")
  // ------------------------------------------------------------------
  function boot(mode, sceneIdOverride) {
    var sceneId = sceneIdOverride || document.body.getAttribute("data-scene");
    var sc = CFG.scenes[sceneId];
    if (!sc || !sc.ready || !window.HeatScenes.get(sceneId)) {
      document.body.appendChild(h("div", { class: "overlay" }, [
        h("div", { class: "panel" }, [
          h("h2", { text: "ยังไม่มีฉากนี้" }),
          h("p", { text: "ฉากนี้ยังไม่เปิดใช้งาน กลับไปเลือกฉากอื่นที่หน้าเมนูได้" }),
          h("a", { class: "btn", href: "../index.html", text: T.backToMenu })
        ])
      ]));
      return;
    }
    document.title = sc.code + " " + sc.title;
    document.body.classList.add("scene-page", mode === "ar" ? "ar-mode" : "viewer-mode");

    // ---------- แถบบน ----------
    var switchHref = mode === "ar" ? "viewer.html?scene=" + sceneId : sceneId + ".html";
    var topbar = h("header", { class: "topbar" }, [
      h("a", { class: "btn ghost", href: "../index.html", "aria-label": T.backToMenu, text: "← " + T.backToMenu }),
      h("div", { class: "scene-name" }, [sc.code + " " + sc.title, h("small", { text: mode === "ar" ? "โหมดกล้อง AR" : "โหมด 3D (ไม่ใช้กล้อง)" })]),
      h("a", { class: "btn ghost", href: switchHref, text: mode === "ar" ? "3D" : "AR" , "aria-label": mode === "ar" ? T.open3D : T.openAR })
    ]);

    // ---------- แถบล่าง ----------
    var info = h("div", { class: "info", "aria-live": "polite" });
    var controls = h("div", { class: "controls" });
    var pauseBtn = h("button", { class: "btn secondary", type: "button", text: T.pause });
    pauseBtn.addEventListener("click", function () { window.HeatApp.setPaused(!window.HeatApp.paused); });
    window.HeatApp.onPauseChange(function (p) {
      pauseBtn.textContent = p ? T.play : T.pause;
      pauseBtn.setAttribute("aria-pressed", p ? "true" : "false");
    });
    var bottombar = h("footer", { class: "bottombar" }, [info, controls]);

    document.body.appendChild(topbar);
    document.body.appendChild(bottombar);

    var ui = {
      setInfo: function (text) { info.textContent = text || ""; },
      /** เพิ่มปุ่มในแถบล่าง (ปุ่มหยุด/เล่นอยู่ท้ายสุดเสมอ) */
      addButton: function (label, onClick, opts) {
        var b = h("button", { class: "btn" + (opts && opts.secondary ? " secondary" : ""), type: "button", text: label });
        b.addEventListener("click", onClick);
        controls.insertBefore(b, pauseBtn.parentNode === controls ? pauseBtn : null);
        return b;
      },
      setActive: function (btn, on) {
        btn.classList.toggle("active", !!on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      }
    };
    controls.appendChild(pauseBtn);

    // ---------- ฉาก A-Frame ----------
    var sceneAttrs = {
      "vr-mode-ui": "enabled: false",
      "device-orientation-permission-ui": "enabled: false",
      renderer: "colorManagement: true; antialias: true; alpha: true",
      "color-space": "sRGB",
      cursor: "rayOrigin: mouse; fuse: false",
      raycaster: "objects: .clickable; far: 20",
      loading: "enabled: false"
    };
    if (mode === "ar") {
      sceneAttrs["mindar-image"] = "imageTargetSrc: ../targets/" + sceneId + ".mind; autoStart: false; maxTrack: 1; " +
        "uiLoading: no; uiScanning: no; uiError: no; filterMinCF: 0.0001; filterBeta: 0.001";
    } else {
      sceneAttrs.background = "color: #e2e8f0";
    }
    var sceneEl = ent("a-scene", sceneAttrs);
    var stage, content;
    if (mode === "ar") {
      ent("a-camera", { position: "0 0 0", "look-controls": "enabled: false", "wasd-controls": "enabled: false" }, sceneEl);
      ent("a-entity", { id: "anchor", "mindar-image-target": "targetIndex: 0" }, sceneEl);
      content = ent("a-entity", { id: "content", "ar-hold": "anchor: #anchor; holdMs: " + (CFG.ar.holdAfterLostMs || 1000) }, sceneEl);
      var orient = ent("a-entity", CFG.ar.standUp ? { rotation: "90 0 0", position: "0 0 0" } : {}, content);
      stage = ent("a-entity", { id: "stage", position: CFG.ar.standUp ? "0 0.36 0" : "0 0 0.02" }, orient);
    } else {
      ent("a-entity", { camera: "fov: 50", "viewer-fit": "", position: "0 0 1.4" }, sceneEl);
      ent("a-entity", { light: "type: ambient; intensity: 0.8" }, sceneEl);
      ent("a-entity", { light: "type: directional; intensity: 0.9", position: "0.6 1.2 1.5" }, sceneEl);
      content = ent("a-entity", { id: "content", "drag-rotate": "" }, sceneEl);
      // แผ่นแทนการ์ด (ให้เห็นขนาดเทียบกับการ์ดจริง)
      ent("a-plane", { width: 1, height: 0.707, position: "0 0 -0.002", material: "color: #f8fafc; shader: flat; opacity: 0.9; transparent: true" }, content);
      stage = ent("a-entity", { id: "stage", position: "0 0 0.02" }, content);
      document.body.appendChild(h("div", { class: "viewer-hint", text: T.viewerHint }));
    }
    document.body.insertBefore(sceneEl, document.body.firstChild);

    var ctx = {
      id: sceneId, cfg: CFG, scene: sc, mode: mode, ui: ui, sceneEl: sceneEl,
      ent: ent, formatTemp: formatTemp, fmt: fmt
    };

    function placeViewerHint() {
      var vhint = document.querySelector(".viewer-hint");
      if (vhint) vhint.style.top = (topbar.offsetHeight + 8) + "px";
    }

    function start() {
      window.HeatScenes.get(sceneId).build(stage, ctx);
      placeViewerHint();
      if (mode === "viewer") {
        var cam = sceneEl.querySelector("[viewer-fit]");
        if (cam && cam.components["viewer-fit"]) cam.components["viewer-fit"].fit();
      }
      if (mode === "ar") setupAR(sceneEl, sc);
      document.body.setAttribute("data-ready", "true");
    }
    if (sceneEl.hasLoaded) start(); else sceneEl.addEventListener("loaded", start);
  }

  // ------------------------------------------------------------------
  // ขั้นตอนเปิดกล้อง (โหมด AR)
  // ------------------------------------------------------------------
  function setupAR(sceneEl, sc) {
    var viewerHref = "viewer.html?scene=" + document.body.getAttribute("data-scene");

    var scan = h("div", { class: "scan-hint", hidden: "" }, [
      h("div", { class: "frame" }),
      h("div", { class: "text", text: fmt(T.scanHint, { code: sc.code }) })
    ]);
    document.body.appendChild(scan);

    var intro = h("div", { class: "overlay", role: "dialog", "aria-modal": "true", "aria-labelledby": "intro-title" }, [
      h("div", { class: "panel" }, [
        h("h2", { id: "intro-title", text: T.cameraIntroTitle }),
        h("p", { text: T.cameraIntroBody }),
        h("div", { class: "stack" }, [
          h("button", { class: "btn", type: "button", id: "start-camera", text: T.cameraStart }),
          h("a", { class: "btn secondary", href: viewerHref, text: T.open3D })
        ])
      ])
    ]);
    var loading = h("div", { class: "overlay", hidden: "" }, [
      h("div", { class: "panel" }, [h("div", { class: "spinner" }), h("p", { text: T.loadingAR })])
    ]);
    var errorBox = h("div", { class: "overlay", hidden: "", role: "alertdialog", "aria-labelledby": "err-title" }, [
      h("div", { class: "panel" }, [
        h("h2", { id: "err-title", text: T.cameraErrorTitle }),
        h("p", { text: T.cameraErrorBody }),
        h("div", { class: "stack" }, [
          h("a", { class: "btn", href: viewerHref, text: T.open3D }),
          h("a", { class: "btn secondary", href: "../index.html", text: T.backToMenu })
        ]),
        isInAppBrowser() ? h("p", { class: "hint", text: T.inAppHint }) : null
      ])
    ]);
    document.body.appendChild(intro);
    document.body.appendChild(loading);
    document.body.appendChild(errorBox);

    function showError() {
      intro.hidden = true; loading.hidden = true; scan.hidden = true;
      errorBox.hidden = false;
    }

    if (!cameraSupported()) {
      intro.hidden = true;
      showError();
      return;
    }

    sceneEl.addEventListener("arError", showError);
    sceneEl.addEventListener("arReady", function () {
      loading.hidden = true;
      scan.hidden = false;
    });
    sceneEl.addEventListener("content-visible", function () { scan.hidden = true; });
    sceneEl.addEventListener("content-hidden", function () { if (loading.hidden && errorBox.hidden) scan.hidden = false; });

    document.getElementById("start-camera").addEventListener("click", function () {
      intro.hidden = true;
      loading.hidden = false;
      try {
        sceneEl.systems["mindar-image-system"].start();
      } catch (e) {
        showError();
      }
    });
  }

  window.HeatUI = {
    boot: boot,
    bootAR: function () { boot("ar"); },
    bootViewer: function () {
      var m = /[?&]scene=([a-z0-9-]+)/i.exec(location.search);
      document.body.setAttribute("data-scene", m ? m[1].toLowerCase() : "");
      boot("viewer");
    },
    formatTemp: formatTemp,
    fmt: fmt,
    h: h
  };
})();

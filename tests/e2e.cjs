/*
 * tests/e2e.cjs — ทดสอบอัตโนมัติด้วย Playwright (Chromium)
 *
 * ตรวจตามเกณฑ์ตรวจรับงานใน Dev Brief ข้อ 10 ส่วนที่ทดสอบด้วยเครื่องได้:
 *   - อนุภาคไม่ขยายขนาดเมื่อร้อน
 *   - น้ำร้อน (60 °C) อนุภาคเร็วกว่าน้ำเย็น (10 °C) และระยะห่างเพิ่มเมื่อร้อน
 *   - AR-3A อุณหภูมิค้างที่ 0 °C และ 100 °C ระหว่างเปลี่ยนสถานะ และความเร็วเฉลี่ยคงที่
 *   - ตัวเลขในฉากมาจาก config.js และเปลี่ยนตามเมื่อแก้ config
 *   - ปฏิเสธสิทธิ์กล้องแล้วมีทางไปโหมด 3D (ไม่เป็นหน้าว่าง)
 *   - ไม่มีการเรียกไฟล์จากนอกเว็บไซต์ของแอปเอง
 *   - ฟอนต์ไทยโหลดได้
 *   - จับการ์ดได้จริงผ่านกล้องจำลอง (ใช้ภาพการ์ดเป็นวิดีโอ)
 *
 * สิ่งที่ทดสอบด้วยเครื่องนี้ไม่ได้: การจับการ์ดผ่านกล้องมือถือจริง แสงจริง ความลื่น (fps) บนมือถือจริง
 *
 * วิธีใช้ (ที่โฟลเดอร์บนสุดของ repo):  node tests/e2e.cjs
 * ต้องมี Node.js 18+, Playwright และ ffmpeg (สำหรับข้อทดสอบกล้องจำลอง)
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(__dirname, ".cache");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png", ".mind": "application/octet-stream" };
const GL_ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.log("  ✗ " + name + (detail !== undefined ? "  → " + JSON.stringify(detail) : "")); }
}

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
      fs.createReadStream(p).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function openScene(browser, base, url, opts = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1000, height: 720 } }, opts.context || {}));
  const page = await ctx.newPage();
  const external = [];
  const errors = [];
  page.on("request", (r) => { if (!r.url().startsWith(base) && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) external.push(r.url()); });
  page.on("pageerror", (e) => errors.push(e.message));
  if (opts.route) await opts.route(page);
  await page.goto(base + url);
  await page.waitForSelector("body[data-ready=true]", { timeout: 20000 });
  return { ctx, page, external, errors };
}

(async () => {
  fs.mkdirSync(CACHE, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ args: GL_ARGS });
  const allExternal = [];

  // ---------------------------------------------------------------
  console.log("\n[1] หน้าเมนู");
  {
    const { ctx, page, external, errors } = await openScene(browser, base, "index.html", {}).catch(async () => {
      const ctx = await browser.newContext(); const page = await ctx.newPage();
      const external = []; const errors = [];
      page.on("request", (r) => { if (!r.url().startsWith(base)) external.push(r.url()); });
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + "index.html"); await page.waitForTimeout(800);
      return { ctx, page, external, errors };
    });
    const cards = await page.$$eval(".scene-card", (els) => els.length);
    check("แสดงครบ 10 ฉาก", cards === 10, cards);
    const links = await page.$$eval(".scene-card a", (els) => els.map((a) => a.getAttribute("href")));
    check("AR-1A และ AR-3A มีปุ่มกล้องและปุ่ม 3D", ["scenes/ar-1a.html", "scenes/viewer.html?scene=ar-1a", "scenes/ar-3a.html", "scenes/viewer.html?scene=ar-3a"].every((l) => links.includes(l)), links);
    const thaiFont = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px "Sarabun"', "กขค"); });
    check("ฟอนต์ไทย Sarabun โหลดได้", thaiFont);
    check("ไม่มี error ใน console", errors.length === 0, errors);
    allExternal.push(...external);
    await ctx.close();
  }

  // ---------------------------------------------------------------
  console.log("\n[2] AR-1A (โหมด 3D)");
  {
    const { ctx, page, external, errors } = await openScene(browser, base, "scenes/viewer.html?scene=ar-1a");
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll("[particle-box]")].map((el) => el.components["particle-box"]);
      const THREE = AFRAME.THREE;
      const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
      const scales = [];
      boxes.forEach((b) => { for (let i = 0; i < b.mesh.count; i++) { b.mesh.getMatrixAt(i, m); m.decompose(p, q, s); scales.push(s.x, s.y, s.z); } });
      const radii = boxes.map((b) => b.mesh.geometry.parameters.radius);
      // วัดความเร็วจริงจากการเคลื่อนที่ของอนุภาค (ทุกขั้น 1/60 วินาที นาน 2 วินาที)
      const measured = boxes.map((b) => {
        const sim = new HeatParticles.ParticleSim({ count: b.sim.count, w: b.sim.w, h: b.sim.h, d: b.sim.d, state: "liquid", tempC: b.data.tempC, seed: 3 });
        let dist = 0;
        for (let k = 0; k < 120; k++) {
          const before = sim.particles.map((pp) => [pp.x, pp.y, pp.z]);
          sim.step(1 / 60);
          sim.particles.forEach((pp, i) => { dist += Math.hypot(pp.x - before[i][0], pp.y - before[i][1], pp.z - before[i][2]); });
        }
        return dist / sim.count / 2;
      });
      return {
        temps: boxes.map((b) => b.data.tempC),
        counts: boxes.map((b) => b.mesh.count),
        radii, scaleMin: Math.min(...scales), scaleMax: Math.max(...scales), measured,
        cfgTemps: HEAT_CONFIG.scenes["ar-1a"].beakers.map((x) => x.tempC)
      };
    });
    check("อุณหภูมิในฉากตรงกับ config.js (10, 60)", JSON.stringify(r.temps) === JSON.stringify(r.cfgTemps), r.temps);
    check("จำนวนอนุภาคต่อกล่อง 20–40", r.counts.every((c) => c >= 20 && c <= 40), r.counts);
    check("อนุภาคทุกลูกขนาดเท่ากัน ไม่มีการขยาย (scale = 1)", Math.abs(r.scaleMin - 1) < 1e-6 && Math.abs(r.scaleMax - 1) < 1e-6, [r.scaleMin, r.scaleMax]);
    check("รัศมีอนุภาคเท่ากันทั้งน้ำเย็นและน้ำร้อน", r.radii[0] === r.radii[1], r.radii);
    check("อนุภาคในน้ำ 60 °C เคลื่อนที่เร็วกว่า 10 °C ชัดเจน (≥ 1.5 เท่า)", r.measured[1] / r.measured[0] >= 1.5, r.measured);

    const before = await page.evaluate(() => window.__scene.revealed.slice());
    const box = await page.locator("a-scene canvas").boundingBox();
    // แตะบีกเกอร์ซ้าย: หาตำแหน่งบนจอจากพิกัด 3D
    const pt = await page.evaluate(() => {
      const THREE = AFRAME.THREE;
      const cam = document.querySelector("a-scene").camera;
      const v = new THREE.Vector3(-0.23, 0, 0.02);
      document.querySelector("#stage").object3D.localToWorld(v);
      v.project(cam);
      const c = document.querySelector("a-scene canvas").getBoundingClientRect();
      return { x: c.left + (v.x + 1) / 2 * c.width, y: c.top + (1 - v.y) / 2 * c.height };
    });
    await page.mouse.move(pt.x, pt.y); await page.waitForTimeout(100); await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.__scene.revealed.slice());
    check("แตะบีกเกอร์แล้วป้ายอุณหภูมิแสดง", before[0] === false && after[0] === true, { before, after });
    const label = await page.evaluate(() => [...document.querySelectorAll("[th-label]")].map((e) => e.getAttribute("th-label").text).find((t) => /อุณหภูมิ/.test(t)));
    check("ป้ายมีหน่วย °C", /10 °C/.test(label || ""), label);
    await page.click("text=" + "หยุด");
    const paused = await page.evaluate(() => HeatApp.paused);
    check("ปุ่มหยุดทำงาน", paused === true);
    await page.screenshot({ path: path.join(CACHE, "ar-1a-viewer.png") });
    check("ไม่มี error ใน console", errors.length === 0, errors);
    allExternal.push(...external);
    await ctx.close();
  }

  // ---------------------------------------------------------------
  console.log("\n[3] AR-3A (โหมด 3D)");
  {
    const { ctx, page, external, errors } = await openScene(browser, base, "scenes/viewer.html?scene=ar-3a");
    await page.evaluate(() => HeatApp.setPaused(true));
    const res = await page.evaluate(() => {
      const out = {};
      const readTemp = () => document.querySelectorAll("[th-label]")[0].getAttribute("th-label").text;
      [0, 1, 2, 3, 4].forEach((i) => {
        __scene.select(i);
        const rows = [];
        [0, 0.25, 0.5, 0.75, 1].forEach((p) => {
          __scene.setProgress(p);
          const el = document.querySelector("[particle-box]");
          const comp = el.components["particle-box"];
          const sim = comp.sim;
          const modes = sim.particles.reduce((a, q) => { a[q.mode] = (a[q.mode] || 0) + 1; return a; }, {});
          rows.push({ p, label: readTemp(), tempC: sim.tempC, speedSolid: sim.targetSpeed("solid"), speedLiquid: sim.targetSpeed("liquid"), amp: sim.solidAmplitude(), modes, radius: sim.radius });
        });
        out[__scene.segments[i].key] = rows;
      });
      return out;
    });
    const melt = res.melt, boil = res.boil;
    check("ช่วงหลอมเหลว: ป้ายค้างที่ 0 °C ตลอด", melt.every((r) => /อุณหภูมิ 0 °C/.test(r.label)), melt.map((r) => r.label));
    check("ช่วงเดือด: ป้ายค้างที่ 100 °C ตลอด", boil.every((r) => /อุณหภูมิ 100 °C/.test(r.label)), boil.map((r) => r.label));
    check("ช่วงหลอมเหลว: ความเร็วสั่นเฉลี่ยคงที่", new Set(melt.map((r) => r.speedSolid.toFixed(9))).size === 1, melt.map((r) => r.speedSolid));
    check("ช่วงเดือด: ความเร็วเฉลี่ยคงที่", new Set(boil.map((r) => r.speedLiquid.toFixed(9))).size === 1);
    check("ช่วงหลอมเหลว: การจัดเรียงเปลี่ยนจากของแข็งเป็นของเหลว", melt[0].modes.solid === 32 && melt[4].modes.liquid === 32, [melt[0].modes, melt[4].modes]);
    check("ช่วงเดือด: ของเหลวกลายเป็นแก๊สทีละส่วน", boil[0].modes.liquid === 32 && boil[2].modes.gas > 0 && boil[4].modes.gas === 32, boil.map((r) => r.modes));
    check("ช่วงน้ำแข็ง: -10 °C → 0 °C และการสั่นแรงขึ้น", /-10 °C/.test(res.ice[0].label) && /0 °C/.test(res.ice[4].label) && res.ice[4].amp > res.ice[0].amp, [res.ice[0].label, res.ice[4].label]);
    check("ช่วงน้ำ: 0 °C → 100 °C", /0 °C/.test(res.water[0].label) && /100 °C/.test(res.water[4].label));
    check("ช่วงไอน้ำ: 100 °C → 110 °C", /100 °C/.test(res.steam[0].label) && /110 °C/.test(res.steam[4].label));
    const radii = Object.values(res).flat().map((r) => r.radius);
    check("รัศมีอนุภาคเท่าเดิมทุกช่วง", new Set(radii).size === 1, [...new Set(radii)]);

    // ระยะห่างของแข็งเพิ่มเมื่อร้อน
    const gaps = await page.evaluate(() => [-10, 0].map((t) => {
      const s = new HeatParticles.ParticleSim({ state: "solid", tempC: t, w: 0.3, h: 0.34, d: 0.16 });
      return s.particles[1].hx - s.particles[0].hx;
    }));
    check("ระยะห่างในโครงผลึกเพิ่มเล็กน้อยเมื่อร้อนขึ้น", gaps[1] > gaps[0], gaps);

    // แตะกราฟช่วงที่ 4 (เดือด)
    const pt = await page.evaluate(() => {
      const THREE = AFRAME.THREE;
      const cam = document.querySelector("a-scene").camera;
      const plane = document.querySelector("a-plane.clickable");
      // ตำแหน่งกลางช่วงที่ 4 (เดือด) บนกราฟ ใกล้แกน x
      const v = new THREE.Vector3(0.13, -0.1, 0.001);
      plane.object3D.localToWorld(v);
      v.project(cam);
      const c = document.querySelector("a-scene canvas").getBoundingClientRect();
      return { x: c.left + (v.x + 1) / 2 * c.width, y: c.top + (1 - v.y) / 2 * c.height };
    });
    await page.mouse.move(pt.x, pt.y); await page.waitForTimeout(100); await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(200);
    const seg = await page.evaluate(() => __scene.state.seg);
    check("แตะบนกราฟแล้วเปลี่ยนช่วงได้", seg === 3, seg);
    await page.evaluate(() => { HeatApp.setPaused(false); __scene.select(1); });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(CACHE, "ar-3a-viewer.png") });
    check("ไม่มี error ใน console", errors.length === 0, errors);
    allExternal.push(...external);
    await ctx.close();
  }

  // ---------------------------------------------------------------
  console.log("\n[4] แก้ config.js แล้วฉากเปลี่ยนตาม");
  {
    const { ctx, page } = await openScene(browser, base, "scenes/viewer.html?scene=ar-1a", {
      route: (page) => page.route("**/config.js", async (route) => {
        const body = fs.readFileSync(path.join(ROOT, "config.js"), "utf8")
          .replace('{ label: "บีกเกอร์ A", tempC: 10 }', '{ label: "บีกเกอร์ ทดสอบ", tempC: 25 }');
        route.fulfill({ body, contentType: "text/javascript" });
      })
    });
    await page.evaluate(() => window.__scene.setReveal(0, true));
    const r = await page.evaluate(() => ({
      temp: document.querySelector("[particle-box]").components["particle-box"].data.tempC,
      labels: [...document.querySelectorAll("[th-label]")].map((e) => e.getAttribute("th-label").text)
    }));
    check("เปลี่ยน tempC ใน config → อนุภาคใช้ค่าใหม่", r.temp === 25, r.temp);
    check("เปลี่ยนข้อความใน config → ป้ายเปลี่ยนตาม", r.labels.includes("บีกเกอร์ ทดสอบ") && r.labels.some((t) => /25 °C/.test(t)), r.labels);
    await ctx.close();
  }

  // ---------------------------------------------------------------
  console.log("\n[5] ปฏิเสธสิทธิ์กล้อง");
  {
    const b2 = await chromium.launch({ args: GL_ARGS.concat(["--use-fake-ui-for-media-stream=deny", "--deny-permission-prompts"]) });
    const { ctx, page, external } = await openScene(b2, base, "scenes/ar-1a.html");
    const introVisible = await page.isVisible("text=ขออนุญาตใช้กล้อง");
    check("แสดงหน้าอธิบายการใช้กล้องก่อนขอสิทธิ์", introVisible);
    check("หน้าอธิบายบอกว่าไม่บันทึก/ไม่ส่งภาพ", await page.isVisible("text=ไม่มีการบันทึกหรือส่งภาพ"));
    await page.click("#start-camera");
    await page.waitForSelector("text=เปิดกล้องไม่ได้", { timeout: 15000 }).catch(() => {});
    const errVisible = await page.isVisible("text=เปิดกล้องไม่ได้");
    check("กล้องถูกปฏิเสธ → แสดงข้อความแนะนำ (ไม่ใช่หน้าว่าง)", errVisible);
    const viewerLink = await page.locator(".overlay:not([hidden]) a", { hasText: "ดูแบบ 3D" }).getAttribute("href").catch(() => null);
    check("มีปุ่มไปโหมด 3D", viewerLink === "viewer.html?scene=ar-1a", viewerLink);
    await page.screenshot({ path: path.join(CACHE, "camera-denied.png") });
    allExternal.push(...external);
    await ctx.close();
    await b2.close();
  }

  // ---------------------------------------------------------------
  console.log("\n[6] จับการ์ดด้วยกล้องจำลอง (ภาพการ์ดเป็นวิดีโอ)");
  for (const id of ["ar-1a", "ar-3a"]) {
    const y4m = path.join(CACHE, id + ".y4m");
    try {
      // วางการ์ดบนพื้นเทา 1280×720 แล้วแปลงเป็นวิดีโอ y4m สำหรับกล้องจำลองของ Chromium
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-loop", "1", "-i", path.join(ROOT, "targets/cards", id + ".png"),
        "-vf", "scale=860:-2,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x6b7280", "-t", "3", "-r", "15", "-pix_fmt", "yuv420p", y4m]);
    } catch (e) {
      check(id + ": สร้างวิดีโอจำลองได้ (ต้องมี ffmpeg)", false, String(e.message).slice(0, 120));
      continue;
    }
    const b3 = await chromium.launch({ args: GL_ARGS.concat(["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--use-file-for-fake-video-capture=" + y4m]) });
    const { ctx, page, external, errors } = await openScene(b3, base, "scenes/" + id + ".html", { context: { permissions: ["camera"] } });
    const t0 = Date.now();
    await page.click("#start-camera");
    const found = await page.waitForFunction(() => document.querySelector("#content").object3D.visible, null, { timeout: 60000 }).then(() => true).catch(() => false);
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    check(id + ": จับการ์ดได้และแสดงฉากบนการ์ด (" + secs + " วินาทีจากกดเปิดกล้อง รวมเวลาโหลดโมเดล)", found);
    const scanHidden = await page.evaluate(() => document.querySelector(".scan-hint").hidden);
    check(id + ": ซ่อนข้อความ 'ส่องกล้อง' เมื่อจับการ์ดได้", found && scanHidden);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(CACHE, id + "-ar-fakecam.png") });
    check(id + ": ไม่มี error ใน console", errors.length === 0, errors);
    allExternal.push(...external);
    await ctx.close();
    await b3.close();
  }

  // ---------------------------------------------------------------
  console.log("\n[7] ความเป็นส่วนตัว");
  check("ไม่มีการเรียกไฟล์/ส่งข้อมูลออกนอกเว็บไซต์ของแอป", allExternal.length === 0, [...new Set(allExternal)]);

  await browser.close();
  server.close();
  console.log(`\nผล: ผ่าน ${passed} ไม่ผ่าน ${failed}`);
  console.log("ภาพหน้าจอ: tests/.cache/*.png");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

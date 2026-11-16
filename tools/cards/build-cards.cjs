/*
 * build-cards.cjs — สร้างไฟล์การ์ดทั้งหมดในคำสั่งเดียว (สำหรับผู้พัฒนา)
 *
 * สิ่งที่ได้:
 *   targets/src/<id>.svg          ไฟล์ต้นฉบับการ์ด (แก้ไขต่อได้ใน Inkscape/Illustrator/Figma)
 *   targets/cards/<id>.png        ภาพการ์ด 300 dpi (2480 × 1748 px) สำหรับพิมพ์
 *   targets/<id>.mind             ไฟล์เป้าหมายที่คอมไพล์ด้วย MindAR 1.2.5
 *   print/cards-A5.pdf            การ์ดทุกใบ หน้าละ 1 ใบ ขนาด A5 แนวนอน
 *   print/qr-codes.pdf            QR ของหน้าเมนูและทุกฉาก
 *
 * ต้องมี: Node.js 18+ และ Playwright (npm i -D playwright && npx playwright install chromium)
 * วิธีใช้ (ที่โฟลเดอร์บนสุดของ repo):
 *   node tools/cards/build-cards.cjs              ทุกฉากที่ ready: true
 *   node tools/cards/build-cards.cjs ar-1a        เฉพาะฉากที่ระบุ
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..", "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml" };

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

function readyScenes() {
  const src = fs.readFileSync(path.join(ROOT, "config.js"), "utf8");
  const window = {};
  new Function("window", src)(window);
  return Object.keys(window.HEAT_CONFIG.scenes).filter((id) => window.HEAT_CONFIG.scenes[id].ready);
}

(async () => {
  const only = process.argv.slice(2);
  const ids = only.length ? only : readyScenes();
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const mm = (v) => Math.round((v / 25.4) * 300); // มม. → px ที่ 300 dpi

  for (const dir of ["targets/src", "targets/cards", "print"]) fs.mkdirSync(path.join(ROOT, dir), { recursive: true });

  for (const id of ids) {
    // 1) SVG ต้นฉบับ + PNG 300 dpi
    const page = await browser.newPage({ viewport: { width: mm(210), height: mm(148) }, deviceScaleFactor: 1 });
    await page.goto(`${base}/tools/cards/cards.html?mode=single&scene=${id}`);
    await page.waitForSelector("body[data-ready=true]");
    await page.evaluate(() => document.fonts.ready);
    const svg = await page.$eval(".page svg", (el) => el.outerHTML);
    fs.writeFileSync(path.join(ROOT, `targets/src/${id}.svg`), svg);
    await page.addStyleTag({ content: ".page, .page svg { width: 100vw !important; height: 100vh !important; }" });
    const png = path.join(ROOT, `targets/cards/${id}.png`);
    await page.screenshot({ path: png, clip: { x: 0, y: 0, width: mm(210), height: mm(148) } });
    await page.close();
    console.log("✓ การ์ด", id);

    // 2) คอมไพล์ .mind (ใช้ภาพย่อกว้าง 1200 px — ใหญ่พอสำหรับการจับภาพ และคอมไพล์เร็ว)
    const cp = await browser.newPage({ viewport: { width: 1200, height: 846 } });
    await cp.goto(`${base}/tools/cards/cards.html?mode=single&scene=${id}`);
    await cp.waitForSelector("body[data-ready=true]");
    await cp.addStyleTag({ content: ".page, .page svg { width: 100vw !important; height: 100vh !important; }" });
    const small = await cp.screenshot({ type: "png" });
    await cp.goto(`${base}/tools/cards/compile.html`);
    await cp.waitForFunction(() => window.compilerReady === true);
    const b64 = await cp.evaluate((src) => window.compileTarget(src), "data:image/png;base64," + small.toString("base64"));
    fs.writeFileSync(path.join(ROOT, `targets/${id}.mind`), Buffer.from(b64, "base64"));
    await cp.close();
    console.log("✓ คอมไพล์", id + ".mind");
  }

  // 3) PDF สำหรับพิมพ์
  const pdfPage = await browser.newPage();
  await pdfPage.goto(`${base}/tools/cards/cards.html?mode=cards`);
  await pdfPage.waitForSelector("body[data-ready=true]");
  await pdfPage.evaluate(() => document.fonts.ready);
  await pdfPage.pdf({ path: path.join(ROOT, "print/cards-A5.pdf"), width: "210mm", height: "148mm", printBackground: true });
  await pdfPage.goto(`${base}/tools/cards/cards.html?mode=qr`);
  await pdfPage.waitForSelector("body[data-ready=true]");
  await pdfPage.evaluate(() => document.fonts.ready);
  await pdfPage.pdf({ path: path.join(ROOT, "print/qr-codes.pdf"), width: "210mm", height: "148mm", printBackground: true });
  console.log("✓ PDF: print/cards-A5.pdf, print/qr-codes.pdf");

  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });

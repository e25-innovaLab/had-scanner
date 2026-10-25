/**
 * Recorre VERA en el frontend real, con cursor visible, y graba video.
 * Uso: BASE_URL=http://localhost:5173 node record_tour.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const OUT_DIR = path.join(__dirname, "build", "pw-video");
const VIEWPORT = { width: 1440, height: 900 };

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

async function injectCursor(page) {
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = `
      #vera-demo-cursor {
        position: fixed;
        width: 22px;
        height: 22px;
        margin-left: -3px;
        margin-top: -3px;
        border-radius: 50%;
        border: 2px solid #0f2d5a;
        background: rgba(37, 99, 140, 0.35);
        box-shadow: 0 0 0 2px rgba(255,255,255,0.9);
        pointer-events: none;
        z-index: 2147483647;
        transition: transform 40ms linear, left 40ms linear, top 40ms linear;
      }
      #vera-demo-cursor.clicking {
        transform: scale(0.75);
        background: rgba(37, 99, 140, 0.65);
      }
    `;
    document.documentElement.appendChild(style);
    const cursor = document.createElement("div");
    cursor.id = "vera-demo-cursor";
    document.documentElement.appendChild(cursor);
    window.__veraCursor = cursor;
  });
}

async function moveTo(page, locator, steps = 18) {
  const target = locator.first();
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error("No bounding box for target");
  const x = box.x + box.width / 2;
  const y = box.y + Math.min(box.height / 2, 18);
  await page.mouse.move(x, y, { steps });
  await page.evaluate(
    ({ x, y }) => {
      const c = window.__veraCursor;
      if (c) {
        c.style.left = `${x}px`;
        c.style.top = `${y}px`;
      }
    },
    { x, y }
  );
  return { x, y };
}

async function clickLoc(page, locator) {
  const { x, y } = await moveTo(page, locator);
  await page.evaluate(() => {
    window.__veraCursor?.classList.add("clicking");
  });
  await page.mouse.click(x, y);
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    window.__veraCursor?.classList.remove("clicking");
  });
}

async function pause(page, ms) {
  await page.waitForTimeout(ms);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: {
      dir: OUT_DIR,
      size: VIEWPORT,
    },
    locale: "es-AR",
  });
  const page = await context.newPage();
  await injectCursor(page);

  console.log("→ Inicio", BASE_URL);
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await pause(page, 1800);

  // Continuar / Empezar de nuevo si hay sesión previa
  const startFresh = page.getByRole("button", { name: "Empezar de nuevo" });
  if (await startFresh.isVisible().catch(() => false)) {
    await clickLoc(page, startFresh);
    await pause(page, 600);
  }

  await clickLoc(page, page.getByRole("button", { name: "Comenzar" }));
  await page.waitForURL("**/analisis/cargar**");
  await pause(page, 1200);

  console.log("→ Cargar (pegar texto)");
  await clickLoc(page, page.getByRole("tab", { name: "Pegar texto" }));
  await pause(page, 500);
  const area = page.locator("textarea").first();
  await moveTo(page, area);
  await area.click();
  await area.fill(
    "Unidad 3 — Homeostasis. La homeostasis es el conjunto de fenómenos de autorregulación que permiten mantener la constancia del medio interno."
  );
  await pause(page, 900);
  await clickLoc(
    page,
    page.getByRole("button", { name: "Siguiente: Analizar" })
  );
  await page.waitForURL("**/analisis/analizar**");

  console.log("→ Analizar (esperar ready)");
  await pause(page, 1200);
  await page.getByText("Listo", { exact: true }).waitFor({ timeout: 20000 });
  await pause(page, 2200);
  await clickLoc(
    page,
    page.getByRole("link", { name: "Siguiente: Revisar" })
  );
  await page.waitForURL("**/analisis/revisar**");

  console.log("→ Revisar");
  await pause(page, 2200);
  await page.mouse.wheel(0, 350);
  await pause(page, 1500);
  await page.mouse.wheel(0, -200);
  await pause(page, 800);
  await clickLoc(
    page,
    page.getByRole("link", { name: "Siguiente: Adaptar" })
  );
  await page.waitForURL("**/analisis/adaptar**");

  console.log("→ Adaptar");
  await pause(page, 1800);
  // Primera dimensión ya suele estar seleccionada; click en Estructura para mostrar filtro
  const dimButtons = page.locator(
    'button[aria-pressed], button:has-text("Estructura")'
  );
  const estructura = page.getByRole("button", { name: /Estructura/i });
  if (await estructura.isVisible().catch(() => false)) {
    await clickLoc(page, estructura);
    await pause(page, 900);
  }
  const comprension = page.getByRole("button", { name: /Comprensión/i });
  if (await comprension.isVisible().catch(() => false)) {
    await clickLoc(page, comprension);
    await pause(page, 1000);
  }
  void dimButtons;

  const revisarBtn = page.getByRole("button", { name: "Revisar" }).first();
  await clickLoc(page, revisarBtn);
  // Overlay "Generando…" ~2s y luego detalle
  await page.waitForURL("**/analisis/detalle**", { timeout: 20000 });

  console.log("→ Detalle");
  await pause(page, 2500);
  const propuesta = page.locator("#propuesta");
  if (await propuesta.isVisible().catch(() => false)) {
    await moveTo(page, propuesta);
    await pause(page, 700);
  }
  await page.mouse.wheel(0, 320);
  await pause(page, 1200);
  await clickLoc(
    page,
    page.getByRole("button", { name: "Guardar y aceptar" })
  );
  await pause(page, 2200);

  if (page.url().includes("/detalle")) {
    const volver = page.getByRole("link", { name: /Volver al resumen/i });
    if (await volver.isVisible().catch(() => false)) {
      await clickLoc(page, volver);
      await page.waitForURL("**/analisis/adaptar**");
      await pause(page, 1600);
    }
  }

  console.log("→ Resultado");
  await clickLoc(
    page,
    page.getByRole("link", { name: "Obtener resultado" })
  );
  await page.waitForURL("**/analisis/resultado**", { timeout: 15000 });
  await pause(page, 2000);

  const descargar = page.getByRole("button", { name: "Descargar" }).first();
  if (await descargar.isVisible().catch(() => false)) {
    await clickLoc(page, descargar);
    await pause(page, 800);
  }

  await page.mouse.wheel(0, 400);
  await pause(page, 1200);
  await page.mouse.wheel(0, 400);
  await pause(page, 1000);

  await clickLoc(page, page.getByRole("button", { name: "Finalizar" }));
  await pause(page, 1500);
  await clickLoc(
    page,
    page.getByRole("button", { name: "Volver a descargar" })
  );
  await pause(page, 1200);
  await clickLoc(page, page.getByRole("button", { name: "Finalizar" }));
  await pause(page, 800);
  await clickLoc(
    page,
    page.getByRole("button", { name: "Finalizar y salir" })
  );
  await page.waitForURL("**/");
  await pause(page, 2000);

  const videoPath = await page.video()?.path();
  await context.close();
  await browser.close();
  console.log("Video raw:", videoPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

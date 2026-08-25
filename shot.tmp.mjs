import { chromium } from "playwright";
const out = process.argv[2];
const b = await chromium.launch();

const errors = [];
const desk = await b.newPage({ viewport: { width: 1440, height: 980 } });
desk.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
await desk.goto("http://localhost:8080/", { waitUntil: "networkidle" });
await desk.waitForTimeout(1200);
await desk.screenshot({ path: `${out}/desk-panel.png` });

// Calendario exercises the calendar grid + chips
await desk.getByRole("button", { name: "Calendario" }).click();
await desk.waitForTimeout(700);
await desk.screenshot({ path: `${out}/desk-calendario.png` });

await desk.getByRole("button", { name: "Reservas 24" }).click();
await desk.waitForTimeout(700);
await desk.screenshot({ path: `${out}/desk-reservas.png` });

const mob = await b.newPage({ viewport: { width: 390, height: 844 } });
await mob.goto("http://localhost:8080/", { waitUntil: "networkidle" });
await mob.waitForTimeout(1200);
await mob.screenshot({ path: `${out}/mob-panel.png` });

console.log("console errors:", errors.length ? errors.join("\n") : "none");
await b.close();

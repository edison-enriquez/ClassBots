/* Recorre la misión Decorator en modo profesor: mapa, las tres escenas con la solución y el Códice.
   Uso: npm run build:single && node e2e/decorator.cjs   (deja las capturas en e2e/deco-*.png) */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PE ' + e.message));
  await p.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await p.goto('file://' + path.resolve('dist-single/index.html'));
  if (await p.$('.bienvenida')) { await p.fill('.bienvenida input >> nth=0', 'Prueba E2E'); await p.click('text=Entrar al taller'); }
  await p.waitForTimeout(400);
  for (let k = 0; k < 5; k++) await p.click('.marca h1'); // acceso docente
  if (await p.$('.acceso-docente')) { await p.click('.acceso-docente [role=tab] >> text=Crear una clase'); const f = '.acceso-form input'; await p.fill(f + ' >> nth=0', 'Clase E2E'); await p.fill(f + ' >> nth=2', 'contrasena-e2e'); await p.fill(f + ' >> nth=3', 'contrasena-e2e'); await p.click('text=Crear clase y entrar'); await p.waitForSelector('.acceso-docente', { state: 'detached' }); }
  const foto = async (n, sel) => { const el = sel ? await p.$(sel) : p; await el.screenshot({ path: `e2e/deco-${n}.png` }); };
  // Mapa: el ramal de la misión sale de la Arena
  await p.click('.mapa-btn'); await p.waitForTimeout(500);
  await p.click('.mapa-destino-mision:has-text("Capa sobre capa")'); await p.waitForTimeout(400);
  await foto('mapa', '.mapa-modal');
  await p.click('.mapa-ir'); await p.waitForTimeout(2800);
  const solucion = async () => { await p.click('text=Mostrar la respuesta'); await p.click('text=Reemplazar'); await p.waitForTimeout(200); };
  for (let paso = 1; paso <= 3; paso++) {
    await p.click(`.mapa-mundo li:nth-child(${paso}) .nodo`); await p.waitForTimeout(300);
    await foto(`paso${paso}-leccion`);
    await solucion();
    if (paso === 1) { await p.click('[role=tab] >> text=UML'); await p.waitForTimeout(500); await foto('uml'); await p.click('[role=tab] >> text=Casos de prueba'); }
    await p.click('.btn-sec >> text=Ejecutar código');
    for (const [k, t] of [['a', 1500], ['b', 2500], ['c', 9000]]) { await p.waitForTimeout(t); await foto(`paso${paso}-${k}`, '.monitor'); }
    await p.click('.btn-pri >> text=Enviar'); await p.waitForSelector('.modal.exito', { timeout: 8000 });
    await foto(`paso${paso}-exito`);
    console.log(`paso ${paso}:`, await p.textContent('.modal.exito h2'), '· ancho', await p.evaluate(() => document.documentElement.scrollWidth));
    if (paso < 3) { await p.click('.modal.exito >> text=Seguir aquí'); await p.waitForTimeout(200); }
  }
  // La recompensa: el patrón queda en el Códice y los robots de las demás escenas llevan el arnés
  await p.click('.modal.exito >> text=Ver el Códice'); await p.waitForTimeout(400);
  await p.locator('.codice-ficha:has-text("Decorator")').scrollIntoViewIfNeeded();
  await foto('codice');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.click('text=Volver a la ru'); await p.waitForTimeout(300);
  await p.click('.mundo-chip >> nth=0'); await p.click('.mapa-mundo li:nth-child(3) .nodo'); await p.waitForTimeout(250);
  await solucion();
  await p.click('.btn-sec >> text=Ejecutar código'); await p.waitForTimeout(2500);
  await foto('arnes', '.monitor');
  console.log('errores:', errs);
  await b.close();
})();

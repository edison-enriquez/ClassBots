/* Recorre la misión MVC «El panel de control» en modo profesor: ejecuta la solución de cada paso y
   pulsa los botones del panel HMI, que llaman al controlador del programa recién ejecutado.
   Uso: npm run build:single && node e2e/mvc-hmi.cjs   (deja las capturas en e2e/hmi-*.png) */
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
  for (let k = 0; k < 5; k++) await p.click('.marca h1'); // acceso docente: la misión está oculta para estudiantes
  if (await p.$('.acceso-docente')) { await p.click('.acceso-docente [role=tab] >> text=Crear una clase'); const f = '.acceso-form input'; await p.fill(f + ' >> nth=0', 'Clase E2E'); await p.fill(f + ' >> nth=2', 'contrasena-e2e'); await p.fill(f + ' >> nth=3', 'contrasena-e2e'); await p.click('text=Crear clase y entrar'); await p.waitForSelector('.acceso-docente', { state: 'detached' }); }
  await p.click('.mapa-btn'); await p.waitForTimeout(500);
  await p.click('.mapa-destino-mision:has-text("El panel de control")'); await p.waitForTimeout(300);
  await p.click('.mapa-ir'); await p.waitForTimeout(2800);
  const foto = n => p.$('.monitor').then(el => el.screenshot({ path: `e2e/hmi-${n}.png` }));
  const activos = () => p.$$eval('.escena-boton:not(:disabled)', xs => xs.map(x => x.getAttribute('aria-label').split(' ')[1]).join(' '));
  const eventos = async () => +(await p.textContent('[role=tab]:has-text("Eventos")')).replace(/\D/g, '');
  const boton = async (id, espera = 1800) => { await p.click(`.escena-boton[aria-label="Pulsar ${id} en el panel"]`); await p.waitForTimeout(espera); };
  console.log('antes de ejecutar · botones encendidos:', (await activos()) || 'ninguno');
  await foto('0-apagado');
  for (let paso = 1; paso <= 3; paso++) {
    await p.click(`.mapa-mundo li:nth-child(${paso}) .nodo`); await p.waitForTimeout(300);
    await p.click('text=Mostrar la respuesta'); await p.click('text=Reemplazar'); await p.waitForTimeout(200);
    await p.click('.btn-sec >> text=Ejecutar código'); await p.waitForTimeout(paso === 1 ? 12000 : 9000);
    const antes = await eventos();
    if (paso < 3) { await boton('VACIAR'); for (let k = 0; k < 4; k++) await boton('BOMBEAR'); await boton('PURGAR', 2000); }
    else { await boton('AUTO'); await boton('AUTO', 2600); }
    await foto(`${paso}-vivo`);
    console.log(`paso ${paso} · encendidos: ${await activos()} · eventos: ${antes} → ${await eventos()}`);
    await p.click('.btn-pri >> text=Enviar'); await p.waitForSelector('.modal.exito', { timeout: 9000 });
    console.log(`paso ${paso}:`, await p.textContent('.modal.exito h2'));
    if (paso < 3) { await p.click('.modal.exito >> text=Seguir aquí'); await p.waitForTimeout(200); }
  }
  console.log('errores:', errs);
  await b.close();
})();

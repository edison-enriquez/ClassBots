/* Recorre el patrón MVC «El panel de control» (último sector del Mundo 8) en modo profesor: ejecuta la
   solución de cada capítulo y pulsa los botones del panel HMI, que llaman al controlador del programa recién ejecutado.
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
  for (let k = 0; k < 5; k++) await p.click('.marca h1'); // acceso docente: abre todos los capítulos
  if (await p.$('.acceso-docente')) { await p.click('.acceso-docente [role=tab] >> text=Crear una clase'); const f = '.acceso-form input'; await p.fill(f + ' >> nth=0', 'Clase E2E'); await p.fill(f + ' >> nth=2', 'contrasena-e2e'); await p.fill(f + ' >> nth=3', 'contrasena-e2e'); await p.click('text=Crear clase y entrar'); await p.waitForSelector('.acceso-docente', { state: 'detached' }); }
  await p.click('.mapa-btn'); await p.waitForTimeout(500);
  await p.click('.mapa-paginas button >> nth=1'); await p.waitForTimeout(300);
  await p.click('.mapa-lienzo .mapa-punto:has-text("MVC")'); await p.waitForTimeout(300);
  console.log('ficha de MVC:', (await p.textContent('.mapa-ficha')).replace(/\s+/g, ' ').slice(0, 220));
  await (await p.$('.mapa-modal')).screenshot({ path: 'e2e/hmi-plano.png' });
  await p.click('.mapa-ir'); await p.waitForSelector('.mapa-modal', { state: 'detached', timeout: 8000 }); await p.waitForTimeout(400);
  console.log('cabecera:', (await p.textContent('.plano-btn')).trim(), '· pasos:', (await p.locator('.mapa-mundo li .nodo').allTextContents()).join(' '));
  const foto = n => p.$('.monitor').then(el => el.screenshot({ path: `e2e/hmi-${n}.png` }));
  const activos = () => p.$$eval('.escena-boton:not(:disabled)', xs => xs.map(x => x.getAttribute('aria-label').split(' ')[1]).join(' '));
  const eventos = async () => +(await p.textContent('[role=tab]:has-text("Eventos")')).replace(/\D/g, '');
  const boton = async (id, espera = 1800) => { await p.click(`.escena-boton[aria-label="Pulsar ${id} en el panel"]`); await p.waitForTimeout(espera); };
  console.log('antes de ejecutar · botones encendidos:', (await activos()) || 'ninguno');
  await foto('0-apagado');
  // Qué se pulsa en cada capítulo, además de mirar qué botones quedan encendidos
  const pulsos = {
    1: async () => { await boton('VACIAR'); for (let k = 0; k < 4; k++) await boton('BOMBEAR'); await boton('MARCHA', 2000); },
    2: async () => { for (let k = 0; k < 3; k++) await boton('BOMBEAR', 2400); },
    3: async () => { await boton('MODO', 1200); await boton('MARCHA', 2200); await foto('3-manual'); await boton('MODO', 1200); await boton('MARCHA', 2600); },
    4: async () => { await boton('MARCHA', 2600); await boton('MODO', 1200); await boton('BOMBEAR', 2200); },
  };
  for (let paso = 1; paso <= 4; paso++) {
    await p.click(`.mapa-mundo li:nth-child(${paso}) .nodo`); await p.waitForTimeout(300);
    await p.click('text=Mostrar la respuesta'); await p.click('text=Reemplazar'); await p.waitForTimeout(200);
    await p.click('.btn-sec >> text=Ejecutar código'); await p.waitForTimeout(paso === 1 ? 12000 : 14000);
    await foto(`${paso}-fin`);
    const antes = await eventos();
    await pulsos[paso]();
    await foto(`${paso}-vivo`);
    console.log(`capítulo ${paso} · encendidos: ${await activos()} · eventos: ${antes} → ${await eventos()}`);
    await p.click('.btn-pri >> text=Enviar'); await p.waitForSelector('.modal.exito', { timeout: 9000 });
    console.log(`capítulo ${paso}:`, await p.textContent('.modal.exito h2'));
    if (paso < 4) { await p.click('.modal.exito >> text=Seguir aquí'); await p.waitForTimeout(200); }
  }
  await p.screenshot({ path: 'e2e/hmi-pagina.png' });
  console.log('errores:', errs);
  await b.close();
})();

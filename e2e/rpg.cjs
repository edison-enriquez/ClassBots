const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PE ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await p.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await p.goto('file://' + path.resolve('dist-single/index.html'));
  if (await p.$('.bienvenida')) { await p.fill('.bienvenida input >> nth=0', 'Prueba E2E'); await p.click('text=Entrar al taller'); }
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'e2e/rpg-inicio.png' });
  for (let k = 0; k < 5; k++) await p.click('.marca h1'); // modo profesor (5 clics en el título)
  const ir = async (mundo, cap) => { await p.click(`.mundo-chip >> nth=${mundo - 1}`); await p.click(`.mapa-mundo li:nth-child(${cap}) .nodo`); await p.waitForTimeout(250); };
  const solucion = async () => { await p.click('text=Mostrar la respuesta'); await p.click('text=Reemplazar'); await p.waitForTimeout(200); };
  const monitor = async (n, t) => { await p.waitForTimeout(t); const el = await p.$('.monitor'); await el.screenshot({ path: `e2e/${n}.png` }); };
  for (const [m, c, n, t] of [[1, 1, 'rpg-plano', 800], [1, 2, 'rpg-taller', 2500], [1, 4, 'rpg-pasillo', 2500], [2, 1, 'rpg-boveda0', 300], [2, 7, 'rpg-boveda', 1500], [3, 3, 'rpg-agreg', 6000], [3, 5, 'rpg-planta', 9000], [4, 5, 'rpg-estacion', 5000]]) {
    await ir(m, c); await solucion();
    await p.click('.btn-sec >> text=Ejecutar código');
    await monitor(n, t);
  }
  await p.click('.mapa-btn'); await p.waitForTimeout(500);
  await p.screenshot({ path: 'e2e/rpg-mapa.png' });
  await p.click('.mapa-lista li:nth-child(2) button'); await p.waitForTimeout(300);
  console.log('tras viajar:', await p.textContent('.marca p'));
  await p.click('.btn-pri >> text=Enviar'); await p.waitForTimeout(7000);
  await p.screenshot({ path: 'e2e/rpg-exito.png' });
  console.log('ancho', await p.evaluate(() => document.documentElement.scrollWidth));
  console.log('errores:', errs);
  await b.close();
})();

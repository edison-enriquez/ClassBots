const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PE ' + e.message));
  await p.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await p.goto('file://' + path.resolve('dist-single/index.html'));
  await p.waitForTimeout(400);
  for (let k = 0; k < 5; k++) await p.click('.marca h1'); // modo profesor (5 clics en el título)
  const ir = async (mundo, cap) => { await p.click(`.mundo-chip >> nth=${mundo - 1}`); await p.click(`.mapa-mundo li:nth-child(${cap}) .nodo`); await p.waitForTimeout(250); };
  const solucion = async () => { await p.click('text=Mostrar la respuesta'); await p.click('text=Reemplazar'); await p.waitForTimeout(200); };
  const monitor = async (n, t) => { await p.waitForTimeout(t); const el = await p.$('.monitor'); await el.screenshot({ path: `e2e/${n}.png` }); };
  for (const [m, c, n, t] of [[2, 7, 'esc-boveda', 1500], [3, 3, 'esc-agreg', 6000], [3, 5, 'esc-planta', 9000], [4, 3, 'esc-contratos', 4000], [4, 5, 'esc-futuro', 5000]]) {
    await ir(m, c); await solucion();
    await p.click('.btn-sec >> text=Ejecutar código');
    await monitor(n, t);
    console.log(n, 'ancho', await p.evaluate(() => document.documentElement.scrollWidth));
  }
  console.log('errores:', errs);
  await b.close();
})();

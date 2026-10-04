const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await p.goto('file://' + path.resolve('dist-single/index.html')); await p.waitForTimeout(500);
  if (await p.$('.bienvenida')) { await p.fill('.bienvenida input >> nth=0', 'Prueba E2E'); await p.click('text=Entrar al taller'); }
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log('scrollWidth', ancho, errs);
  await p.screenshot({ path: 'e2e/movil.png', fullPage: false });
  await b.close();
})();

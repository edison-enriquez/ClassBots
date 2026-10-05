const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PE ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await p.goto('file://' + path.resolve('dist-single/index.html'));
  if (await p.$('.bienvenida')) { await p.fill('.bienvenida input >> nth=0', 'Prueba E2E'); await p.click('text=Entrar al taller'); }
  await p.waitForTimeout(500);
  for (let k = 0; k < 5; k++) await p.click('.marca h1'); // acceso docente
  if (await p.$('.acceso-docente')) { await p.click('.acceso-docente [role=tab] >> text=Crear una clase'); const f = '.acceso-form input'; await p.fill(f + ' >> nth=0', 'Clase E2E'); await p.fill(f + ' >> nth=2', 'contrasena-e2e'); await p.fill(f + ' >> nth=3', 'contrasena-e2e'); await p.click('text=Crear clase y entrar'); await p.waitForSelector('.acceso-docente', { state: 'detached' }); }
  const ir = async (mundo, cap) => { await p.click(`.mundo-chip >> nth=${mundo - 1}`); await p.click(`.mapa-mundo li:nth-child(${cap}) .nodo`); await p.waitForTimeout(250); };
  const solucion = async () => { await p.click('text=Mostrar la respuesta'); await p.click('text=Reemplazar'); await p.waitForTimeout(250); };
  const shot = async (n, t = 0) => { if (t) await p.waitForTimeout(t); await p.screenshot({ path: `e2e/${n}.png` }); };
  // Mundo 2, capítulo 1 sin resolver: error de compilación por Óxido
  await ir(2, 1);
  await p.click('.btn-sec >> text=Ejecutar código'); await p.waitForTimeout(300);
  console.log('M2.1 inicial:', (await p.textContent('.veredicto')).slice(0, 120));
  // Mundo 2, capítulo 3 con solución
  await ir(2, 3); await solucion();
  await p.click('.btn-pri'); await p.waitForTimeout(900);
  console.log('M2.3:', (await p.textContent('.veredicto')).slice(0, 80));
  await shot('m2-guardia');
  // Mundo 3, jefe
  await p.click('.modal .btn-sec').catch(() => {});
  await ir(3, 5); await solucion();
  await p.click('.btn-pri'); await p.waitForTimeout(200);
  console.log('M3.5:', (await p.textContent('.veredicto')).slice(0, 80));
  await p.click('.tab >> text=UML'); await p.waitForTimeout(200);
  await shot('m3-jefe', 3500);
  await p.click('.modal .btn-sec').catch(() => {});
  // Mundo 4 capítulo 2
  await ir(4, 2); await solucion();
  await p.click('.btn-pri'); await p.waitForTimeout(200);
  console.log('M4.2:', (await p.textContent('.veredicto')).slice(0, 80));
  await shot('m4-estacion', 3000);
  await p.click('.modal .btn-sec').catch(() => {});
  // Guía
  await p.click('.guia-btn'); await p.waitForTimeout(200);
  await shot('guia-rel');
  await p.click('.tabs-guia >> text=Interfaces'); await p.waitForTimeout(150);
  await shot('guia-int');
  console.log('errores:', errs);
  await b.close();
})();

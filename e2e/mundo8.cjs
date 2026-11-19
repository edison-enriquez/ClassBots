/* Recorre el Mundo 8 (patrones de diseño): las dos páginas del plano, los 16 capítulos con la solución y el Códice.
   Después abre un avance guardado antes del Mundo 8 (patrones hechos como misiones) y comprueba que se conserva.
   Uso: npm run build:single && node e2e/mundo8.cjs   (deja las capturas en e2e/m8-*.png) */
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve('dist-single/index.html');
const abrir = async (b, antes) => {
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  p.errores = [];
  p.on('pageerror', e => p.errores.push('PE ' + e.message));
  await p.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  if (antes) await p.addInitScript(antes);
  await p.goto(URL);
  return p;
};
(async () => {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

  /* ---- 1. Modo profesor: todo el mundo, capítulo por capítulo ---- */
  const p = await abrir(b);
  if (await p.$('.bienvenida')) { await p.fill('.bienvenida input >> nth=0', 'Prueba E2E'); await p.click('text=Entrar al taller'); }
  await p.waitForTimeout(400);
  for (let k = 0; k < 5; k++) await p.click('.marca h1'); // acceso docente
  if (await p.$('.acceso-docente')) { await p.click('.acceso-docente [role=tab] >> text=Crear una clase'); const f = '.acceso-form input'; await p.fill(f + ' >> nth=0', 'Clase E2E'); await p.fill(f + ' >> nth=2', 'contrasena-e2e'); await p.fill(f + ' >> nth=3', 'contrasena-e2e'); await p.click('text=Crear clase y entrar'); await p.waitForSelector('.acceso-docente', { state: 'detached' }); }
  const foto = async (pag, n, sel) => { const el = sel ? await pag.$(sel) : pag; await el.screenshot({ path: `e2e/m8-${n}.png` }); };
  await p.click('.mapa-btn'); await p.waitForTimeout(500);
  await p.click('.mapa-destino:has-text("La Forja")'); await p.waitForTimeout(300);
  await foto(p, 'mapa', '.mapa-modal');
  console.log('sectores:', await p.locator('.mapa-punto:not(.mapa-punto-mision)').count(), '· ramales:', await p.locator('.mapa-punto-mision').count());
  // El sector de patrones no lleva a un capítulo: abre la segunda página del plano
  console.log('botón del sector 8:', await p.textContent('.mapa-ir'));
  await p.click('.mapa-ir'); await p.waitForSelector('.mapa-paginas [aria-selected=true]:has-text("La Forja")', { timeout: 6000 }); await p.waitForTimeout(400);
  await foto(p, 'plano', '.mapa-modal');
  console.log('página 2 · paradas:', await p.locator('.mapa-lienzo .mapa-punto').count(), '· patrones:', (await p.locator('.mapa-lista >> nth=0').locator('.mapa-destino-num').allTextContents()).join(' '));
  // La primera parada pendiente ya viene elegida: el botón de la ficha entra al capítulo
  console.log('ficha del plano:', await p.textContent('.mapa-ficha-num'), await p.textContent('.mapa-ir'));
  await p.click('.mapa-ir'); await p.waitForSelector('.mapa-modal', { state: 'detached', timeout: 6000 }); await p.waitForTimeout(2600);
  console.log('cabecera del Mundo 8:', (await p.textContent('.plano-btn')).trim(), '· nodos de capítulo arriba:', await p.locator('.mapa-mundo li').count());
  const titulos = [];
  for (let cap = 1; cap <= 16; cap++) {
    await p.click('text=Mostrar la respuesta'); await p.click('text=Reemplazar'); await p.waitForTimeout(150);
    await p.click('.btn-sec >> text=Ejecutar código'); await p.waitForTimeout(cap === 11 ? 9000 : 1200);
    if ([1, 4, 7, 11, 14].includes(cap)) await foto(p, `cap${cap}`);
    await p.click('.btn-pri >> text=Enviar'); await p.waitForSelector('.modal.exito', { timeout: 9000 });
    titulos.push(await p.textContent('.modal.exito h2'));
    if ([3, 16].includes(cap)) await foto(p, `exito${cap}`);
    if (cap < 16) { await p.click('.modal.exito .btn-pri'); await p.waitForTimeout(250); }
  }
  console.log(titulos.map((t, k) => `${k + 1}: ${t}`).join('\n'));
  await p.click('.modal.exito >> text=Ver el Códice'); await p.waitForTimeout(400);
  await foto(p, 'codice');
  console.log('Códice:', await p.textContent('[role=tab][aria-selected=true] >> nth=-1'), '· fichas abiertas:', await p.locator('.codice-ficha:not(.bloqueada)').count());
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await foto(p, 'cabecera', 'header.top');
  console.log('errores (profesor):', p.errores);
  await p.close();

  /* ---- 2. Estudiante con avance anterior: Strategy y Decorator hechos como misiones, sin el Mundo 7 ---- */
  const ant = ['plano', 'strategy-1', 'strategy-2', 'strategy-3', 'decorator-1', 'decorator-2', 'decorator-3'];
  const e = await abrir(b, `if (!localStorage.getItem('taller-objetos-react-v2')) localStorage.setItem('taller-objetos-react-v2', JSON.stringify({ nivelId: 'plano', hechos: ['plano'], pasosHechos: ${JSON.stringify(ant.slice(1))}, misionesHechas: ['mision-strategy', 'mision-decorator'], codigo: {}, perfil: { id: 'e2e', nombre: 'Ana Antigua', grupo: '' }, segmentos: [] }));`);
  await e.waitForTimeout(600);
  await e.click('.mundo-chip >> nth=7'); await e.waitForTimeout(200);
  console.log('estudiante antiguo · cabecera:', (await e.textContent('.plano-btn')).trim());
  await e.click('.plano-btn'); await e.waitForTimeout(600);
  console.log('estudiante antiguo · patrones:', (await e.locator('.mapa-lista >> nth=0').locator('.mapa-destino').evaluateAll(xs => xs.map(x => x.querySelector('strong').textContent + ': ' + x.querySelector('.mapa-estado').textContent))).join(' | '));
  console.log('paradas:', (await e.locator('.mapa-lienzo .mapa-punto').evaluateAll(xs => xs.map(x => (x.classList.contains('completo') ? 'S' : x.classList.contains('cerrado') ? 'x' : 'o')))).join(''), '(S superado, o abierto, x cerrado)');
  await foto(e, 'antiguo-plano', '.mapa-modal');
  await e.click('.mapa-paginas button >> nth=0'); await e.waitForTimeout(400);
  await e.click('.mapa-punto[title*="La Forja"]'); await e.waitForTimeout(300);
  console.log('ficha:', (await e.textContent('.mapa-ficha')).replace(/\s+/g, ' ').slice(0, 170));
  console.log('guardado:', await e.evaluate(() => { const g = JSON.parse(localStorage.getItem('taller-objetos-react-v2')); return JSON.stringify({ hechos: g.hechos, pasosHechos: g.pasosHechos, misionesHechas: g.misionesHechas }); }));
  console.log('errores (estudiante):', e.errores);
  await b.close();
})();

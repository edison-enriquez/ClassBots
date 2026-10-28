/* Quiz en vivo de punta a punta: un profesor y tres estudiantes contra el servidor del aula.
   Requiere: npm run build && npx vite preview --port 4173, y en servidor/:
   PUERTO=8788 HOST=127.0.0.1 BD=:memory: node servidor.js */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:4173/';
const AULA = process.env.AULA || 'ws://127.0.0.1:8788/aula';
const ok = (c, m) => { if (!c) { throw new Error('FALLÓ: ' + m); } console.log('✔', m); };

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const abrir = async nombre => {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(`${nombre} PE ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebSocket/.test(m.text())) errs.push(`${nombre}: ${m.text()}`); });
    return p;
  };
  const entrar = async (p, nombre) => { await p.fill('.bienvenida input[name=nombre]', nombre); await p.click('text=Entrar al taller'); await p.waitForSelector('.bienvenida', { state: 'detached' }); };

  /* ---- Profesor: crea la clase con aula en vivo y abre el panel ---- */
  const prof = await abrir('profe');
  await prof.goto(BASE);
  await entrar(prof, 'Profe E2E');
  for (let k = 0; k < 5; k++) await prof.click('.marca h1');
  await prof.click('.acceso-docente [role=tab] >> text=Crear una clase');
  await prof.fill('.acceso-form input >> nth=0', 'POO Repaso E2E');
  await prof.fill('.acceso-form input[type=password] >> nth=0', 'contrasena-e2e');
  await prof.fill('.acceso-form input[type=password] >> nth=1', 'contrasena-e2e');
  await prof.click('.campo-aula summary');
  await prof.fill('.campo-aula input', AULA);
  await prof.click('text=Crear clase y entrar');
  await prof.waitForSelector('.acceso-docente', { state: 'detached' });
  await prof.click('.usuario-btn');
  await prof.click('text=Panel de la clase');
  await prof.click('text=Copiar enlace');
  const enlace = (await prof.evaluate(() => navigator.clipboard.readText())).replace(/^https?:\/\/[^/]+\//, BASE);
  ok(enlace.includes('clase='), 'enlace de clase copiado');
  await prof.waitForSelector('.aula-estado:has-text("en vivo")', { timeout: 10000 });

  /* ---- Dos estudiantes entran con el enlace ---- */
  const ana = await abrir('ana'), luis = await abrir('luis');
  for (const [p, n] of [[ana, 'Ana Pérez'], [luis, 'Luis Gómez']]) { await p.goto(enlace); await entrar(p, n); }
  await prof.waitForSelector('.aula-tarjeta >> text=Luis Gómez', { timeout: 15000 });
  await prof.waitForSelector('.aula-tarjeta >> text=Ana Pérez', { timeout: 15000 });
  ok(true, 'los dos estudiantes aparecen en el aula en vivo');

  /* ---- Pregunta 1, ronda 1 ---- */
  await prof.click('.quiz-iniciar');
  await prof.waitForSelector('.quiz-proy');
  for (const p of [ana, luis]) await p.waitForSelector('.quiz-est', { timeout: 10000 });
  ok(true, 'la pregunta 1 llega a los estudiantes');
  await ana.click('.quiz-op >> nth=0');   // correcta
  await luis.click('.quiz-op >> nth=1');  // incorrecta
  await ana.waitForSelector('.quiz-estado:has-text("Votaste A")');
  await prof.waitForSelector('.quiz-cuenta:has-text("2 de 2 respondieron")', { timeout: 10000 });
  ok(true, 'el profesor cuenta 2 de 2 respuestas');
  ok(!(await prof.$('.quiz-dist')), 'no se muestra la distribución antes de revelar');
  await prof.screenshot({ path: 'e2e/quiz-profe-votando.png' });
  await ana.screenshot({ path: 'e2e/quiz-estudiante-votando.png' });

  /* ---- Cerrar, ronda 2 en parejas, revelar ---- */
  await prof.click('text=Cerrar votación');
  await luis.waitForSelector('.quiz-estado:has-text("Votación cerrada")');
  ok(await luis.$eval('.quiz-op >> nth=0', e => e.disabled), 'con la votación cerrada no se puede votar');
  await prof.click('text=Ver acierto');
  ok((await prof.textContent('.quiz-privado')).includes('50 %'), 'el profesor ve 50 % en privado');
  await prof.click('text=Ronda 2 en parejas');
  await luis.waitForSelector('.quiz-ronda2');
  await luis.click('.quiz-op >> nth=0');
  await prof.waitForSelector('.quiz-cuenta:has-text("1 de 2 respondieron")');
  await prof.click('text=Cerrar votación');
  await prof.click('text=Revelar respuesta');
  await ana.waitForSelector('.quiz-explica:has-text("Acertaste")');
  await luis.waitForSelector('.quiz-explica:has-text("Acertaste")');
  ok(true, 'al revelar, Ana (ronda 1) y Luis (ronda 2) ven su acierto');
  ok((await prof.textContent('.quiz-explica')).includes('50 % → 100 %'), 'el proyector muestra 50 % → 100 %');
  await prof.screenshot({ path: 'e2e/quiz-profe-revelada.png' });
  await luis.screenshot({ path: 'e2e/quiz-estudiante-revelada.png' });

  /* ---- Pregunta 2: Eva llega tarde y recibe la pregunta en curso ---- */
  await prof.click('text=Siguiente pregunta');
  await ana.waitForSelector('.mapa-kicker:has-text("PREGUNTA 2 DE")');
  const eva = await abrir('eva');
  await eva.goto(enlace); await entrar(eva, 'Eva Ruiz');
  await eva.waitForSelector('.mapa-kicker:has-text("PREGUNTA 2 DE")', { timeout: 15000 });
  ok(true, 'Eva entra tarde y recibe la pregunta 2');
  await eva.click('.quiz-op >> nth=1');   // correcta (this → null)
  await ana.click('.quiz-op >> nth=0');
  await prof.waitForSelector('.quiz-cuenta:has-text("2 de 3 respondieron")', { timeout: 10000 });
  ok(true, 'el profesor cuenta 2 de 3 en la pregunta 2');

  /* ---- Terminar: resumen y CSV ---- */
  await prof.click('text=Terminar quiz');
  await prof.click('text=Sí, ver resumen');
  await prof.waitForSelector('.quiz-barras');
  for (const p of [ana, eva]) await p.waitForSelector('text=QUIZ DE REPASO · TERMINADO');
  ok((await ana.textContent('.quiz-est')).includes('1 de 11'), 'Ana ve su resultado del primer voto');
  const [descarga] = await Promise.all([prof.waitForEvent('download'), prof.click('text=CSV de respuestas')]);
  const csv = fs.readFileSync(await descarga.path(), 'utf8').trim().split('\n');
  console.log(csv.join('\n'));
  ok(csv.length === 6, 'el CSV tiene 5 respuestas (3 en la pregunta 1, 2 en la 2)');
  ok(csv.some(f => f.includes('Eva Ruiz')) && csv.some(f => f.includes('Luis Gómez')), 'el CSV trae los nombres');
  await prof.screenshot({ path: 'e2e/quiz-profe-resumen.png', fullPage: true });
  await ana.click('text=Volver al juego');
  ok(!(await ana.$('.quiz-est')), 'el estudiante vuelve al juego');

  console.log('errores:', errs);
  ok(errs.length === 0, 'sin errores en consola');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

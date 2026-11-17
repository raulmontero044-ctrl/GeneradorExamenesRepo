#!/usr/bin/env node
// Prueba real del HTML de un examen en un navegador sin interfaz (Chrome o Edge).
//
//   node tools/probar-html.mjs --examen-id <id> [--url <base http>] [--planes mix,correctas,errores,blanco]
//
// Abre el examen con ?autotest=<plan>, que contesta las 40 preguntas pulsando los
// botones reales, intenta cambiar cada respuesta ya confirmada y termina. Compara lo
// que muestra la página con el resultado calculado aquí de forma independiente.
// Con --url el examen se carga desde el servidor y se pide guardar el resultado
// (&guardar=1); se comprueba que el servidor lo ha escrito.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RUTAS, esPrincipal } from './lib/config.mjs';
import { calcularResultado } from './lib/puntuacion.mjs';

const NAVEGADORES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export function buscarNavegador() {
  const ruta = NAVEGADORES.find((r) => r && existsSync(r));
  if (!ruta) throw new Error('no se encuentra Chrome ni Edge; indica la ruta con la variable CHROME');
  return ruta;
}

export function cargarDom(url, { navegador = buscarNavegador(), presupuestoMs = 15000 } = {}) {
  const perfil = mkdtempSync(join(tmpdir(), 'probar-html-'));
  try {
    return execFileSync(navegador, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
      `--user-data-dir=${perfil}`, `--virtual-time-budget=${presupuestoMs}`, '--dump-dom', url,
    ], { encoding: 'utf8', timeout: 90000, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } finally {
    rmSync(perfil, { recursive: true, force: true });
  }
}

function extraerInforme(dom) {
  const m = dom.match(/<pre id="autotest">([\s\S]*?)<\/pre>/);
  if (!m) return null;
  const json = m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return JSON.parse(json);
}

function respuestasDelPlan(preguntas, plan) {
  const respuestas = {};
  preguntas.forEach((p, i) => {
    const modo = plan === 'mix' ? ['correctas', 'errores', 'blanco'][i % 3] : plan;
    const mala = ['A', 'B', 'C', 'D'].find((l) => l !== p.correcta);
    respuestas[p.id] = modo === 'blanco' ? null : modo === 'correctas' ? p.correcta : mala;
  });
  return respuestas;
}

const coma = (n) => String(n).replace('.', ',');

export function comprobarInforme(informe, esperado, { conServidor = false } = {}) {
  const fallos = [];
  const comprobar = (condicion, texto) => { if (!condicion) fallos.push(texto); };
  if (!informe) return ['la página no generó el informe de autotest (¿error de JavaScript?)'];
  comprobar(informe.preguntasMostradas === esperado.total, `se mostraron ${informe.preguntasMostradas} preguntas de ${esperado.total}`);
  comprobar(informe.bloqueoOk, 'se pudo cambiar una respuesta ya confirmada');
  comprobar(informe.explicacionesOk, 'falta la explicación de la correcta o de algún distractor');
  comprobar(informe.terminado, 'el examen no llegó a la pantalla de resultado');
  comprobar(informe.notaMostrada === coma(esperado.nota.toFixed(2)), `nota mostrada ${informe.notaMostrada}, esperada ${coma(esperado.nota.toFixed(2))}`);
  comprobar(informe.cifras.aciertos === String(esperado.aciertos), `aciertos mostrados ${informe.cifras.aciertos}, esperados ${esperado.aciertos}`);
  comprobar(informe.cifras.errores === String(esperado.errores), `errores mostrados ${informe.cifras.errores}, esperados ${esperado.errores}`);
  comprobar(informe.cifras.enBlanco === String(esperado.enBlanco), `en blanco mostradas ${informe.cifras.enBlanco}, esperadas ${esperado.enBlanco}`);
  comprobar(informe.cifras.porcentaje === `${coma(esperado.porcentajeAciertos)} %`, `porcentaje mostrado ${informe.cifras.porcentaje}`);
  comprobar(informe.cifras.puntuacion === coma(esperado.puntuacion), `puntuación mostrada ${informe.cifras.puntuacion}, esperada ${coma(esperado.puntuacion)}`);
  comprobar(informe.falladasMostradas === esperado.errores, `falladas listadas ${informe.falladasMostradas}, esperadas ${esperado.errores}`);
  comprobar(informe.temasConErrores === esperado.temasConErrores.length, `temas con errores listados ${informe.temasConErrores}, esperados ${esperado.temasConErrores.length}`);
  const r = informe.resultado ?? {};
  for (const campo of ['aciertos', 'errores', 'enBlanco', 'nota', 'puntuacion']) {
    comprobar(r[campo] === esperado[campo], `resultado.${campo} = ${r[campo]}, esperado ${esperado[campo]}`);
  }
  comprobar(Array.isArray(r.respuestas) && r.respuestas.length === esperado.total, 'el resultado no incluye todas las respuestas');
  if (conServidor) comprobar(informe.guardado?.estado === 'guardado' && informe.guardado.respuesta?.ruta, `el servidor no guardó el resultado (${informe.guardado?.estado})`);
  return fallos;
}

export function probarExamen({ examenId, url, planes = ['mix', 'correctas', 'errores', 'blanco'], navegador, dir = join(RUTAS.examenes, examenId) } = {}) {
  const examen = JSON.parse(readFileSync(join(dir, 'examen.json'), 'utf8'));
  const html = join(dir, 'examen.html');
  if (!url && !existsSync(html)) throw new Error(`no existe ${html}; genera antes el HTML`);
  const base = url ? `${url.replace(/\/$/, '')}/examenes/${examenId}/examen.html` : pathToFileURL(html).href;
  return planes.map((plan) => {
    const esperado = calcularResultado(examen.preguntas, respuestasDelPlan(examen.preguntas, plan));
    const informe = extraerInforme(cargarDom(`${base}?autotest=${plan}${url ? '&guardar=1' : ''}`, { navegador }));
    return { plan, esperado, informe, fallos: comprobarInforme(informe, esperado, { conServidor: Boolean(url) }) };
  });
}

function opcion(args, nombre) {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
}

if (esPrincipal(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const examenId = opcion(args, '--examen-id');
    if (!examenId) throw new Error('Falta --examen-id');
    const resultados = probarExamen({ examenId, url: opcion(args, '--url'), planes: opcion(args, '--planes')?.split(',') });
    for (const r of resultados) {
      const e = r.esperado;
      console.log(`${r.fallos.length ? 'FALLO' : 'OK   '} plan ${r.plan}: nota ${e.nota} (${e.aciertos} aciertos, ${e.errores} errores, ${e.enBlanco} en blanco)${r.informe?.guardado?.respuesta?.ruta ? ` → ${r.informe.guardado.respuesta.ruta}` : ''}`);
      for (const f of r.fallos) console.log(`       - ${f}`);
    }
    const ok = resultados.every((r) => !r.fallos.length);
    console.log(ok ? 'HTML FUNCIONAL' : 'HTML CON FALLOS');
    process.exitCode = ok ? 0 : 1;
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exitCode = 1;
  }
}


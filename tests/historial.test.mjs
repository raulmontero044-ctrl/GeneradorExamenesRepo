import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { calcularResultado } from '../tools/lib/puntuacion.mjs';
import { estadisticas, guardarRegistro, guardarResultado, listarResultados, validarResultado } from '../tools/historial.mjs';
import { crearServidor } from '../tools/servidor.mjs';
import { generarHtml } from '../tools/examen.mjs';
import { buscarNavegador, probarExamen } from '../tools/probar-html.mjs';
import { examenSintetico } from './helpers.mjs';

async function entorno(t) {
  const dir = mkdtempSync(join(tmpdir(), 'historial-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const dirExamenes = join(dir, 'examenes');
  const dirResultados = join(dir, 'resultados');
  const examen = await examenSintetico('EX-HIST');
  mkdirSync(join(dirExamenes, examen.id), { recursive: true });
  writeFileSync(join(dirExamenes, examen.id, 'examen.json'), JSON.stringify(examen));
  writeFileSync(join(dirExamenes, examen.id, 'examen.html'), generarHtml(examen));
  return { dir, dirExamenes, dirResultados, examen };
}

function intento(examen, intentoId = 'aaaaaaaa-1111', fechaHora = '2026-11-17T10:00:00.000Z') {
  const respuestas = Object.fromEntries(examen.preguntas.map((p, i) => [p.id, i % 2 ? p.correcta : null]));
  return { examenId: examen.id, intentoId, fechaHora, ...calcularResultado(examen.preguntas, respuestas) };
}

test('validarResultado recalcula y rechaza resultados manipulados o incompletos', async (t) => {
  const { examen } = await entorno(t);
  const r = intento(examen);
  assert.deepEqual(validarResultado(r, examen).errores, []);
  assert.match(validarResultado({ ...r, nota: 10 }, examen).errores.join(), /nota: recibido 10/);
  assert.match(validarResultado({ ...r, examenId: 'OTRO' }, examen).errores.join(), /no corresponde/);
  assert.match(validarResultado({ ...r, respuestas: r.respuestas.slice(1) }, examen).errores.join(), /no corresponden/);
});

test('cada intento es un fichero nuevo y nunca se sobrescribe', async (t) => {
  const { dirExamenes, dirResultados, examen } = await entorno(t);
  const r1 = guardarResultado(intento(examen, 'aaaaaaaa-0001'), { dirExamenes, dirResultados });
  const r2 = guardarResultado(intento(examen, 'bbbbbbbb-0002'), { dirExamenes, dirResultados });
  assert.notEqual(r1, r2);
  const original = readFileSync(r1, 'utf8');
  assert.throws(() => guardarResultado(intento(examen, 'aaaaaaaa-0001'), { dirExamenes, dirResultados }), /ya está en el historial/);
  const registro = JSON.parse(original);
  assert.throws(() => guardarRegistro(registro, dirResultados), /EEXIST/);
  assert.equal(readFileSync(r1, 'utf8'), original);

  const guardado = JSON.parse(original);
  for (const campo of ['examenId', 'fechaHora', 'nota', 'aciertos', 'errores', 'enBlanco', 'respuestas', 'preguntasFalladas', 'temasConErrores']) assert.ok(campo in guardado, campo);
  assert.deepEqual(Object.keys(guardado.respuestas[0]).sort(), ['asignatura', 'correcta', 'preguntaId', 'resultado', 'seleccionada', 'tema']);
  const lista = listarResultados(dirResultados);
  assert.equal(lista.length, 2);
  assert.equal(estadisticas(lista).intentos, 2);
});

async function arrancar(t, opciones) {
  const servidor = crearServidor(opciones);
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  t.after(() => servidor.close());
  return `http://127.0.0.1:${servidor.address().port}`;
}

test('servidor: índice, examen, guardado (201), resultado inválido (400) y rutas fuera del examen (404)', async (t) => {
  const { dirExamenes, dirResultados, examen } = await entorno(t);
  const base = await arrancar(t, { dirExamenes, dirResultados });
  assert.match(await (await fetch(`${base}/`)).text(), /EX-HIST/);
  assert.equal((await fetch(`${base}/examenes/EX-HIST/examen.html`)).status, 200);
  assert.equal((await fetch(`${base}/examenes/..%2F..%2Fpackage.json`)).status, 404);

  const post = (cuerpo) => fetch(`${base}/api/resultados`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const ok = await post(intento(examen));
  assert.equal(ok.status, 201);
  assert.match((await ok.json()).ruta, /EX-HIST/);
  assert.equal((await post({ ...intento(examen, 'cccccccc-0003'), aciertos: 40 })).status, 400);
  assert.equal((await post(intento(examen))).status, 409);
  assert.equal(readdirSync(join(dirResultados, 'EX-HIST')).length, 1);
});

let navegador = null;
try { navegador = buscarNavegador(); } catch { /* sin navegador */ }

test('de punta a punta: el HTML servido guarda cada intento en el historial', { skip: !navegador && 'no hay Chrome/Edge', timeout: 240000 }, async (t) => {
  const { dirExamenes, dirResultados, examen } = await entorno(t);
  // El navegador se lanza de forma síncrona: el servidor va en otro proceso para poder responderle.
  const hijo = spawn(process.execPath, ['tools/servidor.mjs'], {
    env: { ...process.env, PORT: '0', EXAMENES_DIR: dirExamenes, RESULTADOS_DIR: dirResultados },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  t.after(() => hijo.kill());
  const url = await new Promise((ok, mal) => {
    hijo.stdout.on('data', (d) => { const m = String(d).match(/http:\/\/localhost:(\d+)/); if (m) ok(`http://127.0.0.1:${m[1]}`); });
    hijo.on('exit', (c) => mal(new Error(`el servidor terminó (${c})`)));
  });
  const resultados = probarExamen({ examenId: examen.id, url, dir: join(dirExamenes, examen.id), navegador });
  for (const r of resultados) assert.deepEqual(r.fallos, [], `plan ${r.plan}`);
  const guardados = listarResultados(dirResultados, examen.id);
  assert.equal(guardados.length, 4, 'un fichero por intento');
  assert.deepEqual(guardados.map((g) => g.nota).sort((a, b) => a - b), [0, 0, 2.43, 10]);
});

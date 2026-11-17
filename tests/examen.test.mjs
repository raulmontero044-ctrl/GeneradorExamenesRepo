import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validarPregunta } from '../tools/lib/esquema.mjs';
import { generarHtml, validarExamen } from '../tools/examen.mjs';
import { buscarNavegador, probarExamen } from '../tools/probar-html.mjs';
import { examenSintetico } from './helpers.mjs';

const opciones = { banco: [], validar: (p) => validarPregunta(p, { comprobarWiki: false }) };

test('un examen sintético bien formado es válido', async () => {
  const r = validarExamen(await examenSintetico(), opciones);
  assert.deepEqual(r.errores, []);
  assert.equal(r.valido, true);
});

test('rechaza 39 preguntas, temas descompensados y mezcla de dificultad incorrecta', async () => {
  const ex = await examenSintetico();
  ex.preguntas.pop();
  assert.match(validarExamen(ex, opciones).errores.join('\n'), /hay 39 preguntas[\s\S]*dws-04: 4 preguntas/);

  const ex2 = await examenSintetico();
  for (const p of ex2.preguntas) p.dificultad = 'facil';
  const e2 = validarExamen(ex2, opciones).errores.join('\n');
  assert.match(e2, /ninguna pregunta difícil/);
  assert.match(e2, /40 preguntas fáciles; máximo 10/);
  assert.match(e2, /no predominan/);
});

test('rechaza preguntas idénticas dentro del examen y preguntas ya usadas en el banco', async () => {
  const ex = await examenSintetico();
  ex.preguntas[1] = { ...ex.preguntas[0] };
  assert.match(validarExamen(ex, opciones).errores.join('\n'), /id repetido|idénticas/);

  const limpio = await examenSintetico();
  const usado = { ...limpio.preguntas[3], examenId: 'EX-ANTERIOR' };
  const r = validarExamen(limpio, { ...opciones, banco: [usado] });
  assert.match(r.errores.join('\n'), /ya salió en el examen EX-ANTERIOR/);
  const mismo = validarExamen(limpio, { ...opciones, banco: [{ ...usado, examenId: limpio.id }] });
  assert.equal(mismo.valido, true, 'las preguntas registradas por el propio examen no cuentan como repetición');
});

test('el HTML es autocontenido, incrusta la puntuación y escapa los datos', async () => {
  const html = generarHtml(await examenSintetico());
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /function calcularResultado/);
  assert.doesNotMatch(html, /^export /m);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=/, 'sin recursos externos');
  const datos = html.match(/<script type="application\/json" id="datos">([\s\S]*?)<\/script>/)[1];
  assert.doesNotMatch(datos, /</, 'los datos no pueden contener "<" sin escapar');
  assert.equal(JSON.parse(datos).preguntas.length, 40);
  assert.doesNotMatch(html, /localStorage/);
});

let navegador = null;
try { navegador = buscarNavegador(); } catch { /* sin navegador: se omite la prueba real */ }

test('prueba real en navegador: 4 planes de respuesta, bloqueo, explicaciones y resultado', { skip: !navegador && 'no hay Chrome/Edge', timeout: 240000 }, async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'examen-html-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const ex = await examenSintetico();
  writeFileSync(join(dir, 'examen.json'), JSON.stringify(ex));
  writeFileSync(join(dir, 'examen.html'), generarHtml(ex));
  const resultados = probarExamen({ examenId: ex.id, dir, navegador });
  for (const r of resultados) assert.deepEqual(r.fallos, [], `plan ${r.plan}`);
  // mix: 14 aciertos, 13 errores, 13 en blanco → 9,71 puntos → 2,43
  assert.deepEqual(resultados.map((r) => r.esperado.nota), [2.43, 10, 0, 0]);
  assert.equal(resultados[0].informe.guardado.estado, 'sin-servidor');
});

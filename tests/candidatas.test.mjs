import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { avisosMezcla, comprobarFichero, filtrar, reunir } from '../tools/candidatas.mjs';
import { preguntaBase } from './helpers.mjs';

const REF = [{ archivo: 'wiki/programacion/tema-08-arquitectura/contenido.md', seccion: '2. La Arquitectura por Capas (Layered Architecture)' }];

function candidata(extra = {}) {
  const { id, ...p } = preguntaBase({ wikiRef: REF, ...extra });
  return p;
}

test('comprobar valida referencias reales a la wiki', () => {
  assert.deepEqual(comprobarFichero([candidata()])[0].errores, []);
  const mala = candidata({ wikiRef: [{ archivo: REF[0].archivo, seccion: 'Sección inventada' }] });
  assert.match(comprobarFichero([mala])[0].errores.join(), /no tiene la sección "Sección inventada"/);
  const otroTema = candidata({ wikiRef: [{ archivo: 'wiki/dws/tema-01-arquitecturas/contenido.md', seccion: '1. Principios de arquitectura limpia' }] });
  assert.match(comprobarFichero([otroTema])[0].errores.join(), /no pertenece a la wiki del tema/);
});

test('avisos de mezcla: tipos, difíciles y exceso de fáciles', () => {
  const avisos = avisosMezcla([candidata(), candidata({ enunciado: 'Otra pregunta distinta sobre capas y responsabilidades.' })]);
  assert.ok(avisos.some((a) => /mismo tipo/.test(a)));
  assert.ok(avisos.some((a) => /ninguna pregunta difícil/.test(a)));
  assert.ok(avisos.some((a) => /demasiadas fáciles/.test(a)));
});

test('reunir asigna ids, separa inválidas, detecta enunciados repetidos y compara con el banco', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'cand-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const a = candidata({ autor: 'gen-prog-1' });
  const b = candidata({ autor: 'gen-prog-2' }); // mismo enunciado que a
  const invalida = candidata({ autor: 'gen-prog-2', correcta: 'Z' });
  writeFileSync(join(dir, 'gen-prog-1.json'), JSON.stringify([a]));
  writeFileSync(join(dir, 'gen-prog-2.json'), JSON.stringify([b, invalida]));

  const enBanco = preguntaBase({ wikiRef: REF });
  const r = reunir([join(dir, 'gen-prog-1.json'), join(dir, 'gen-prog-2.json')], { banco: [enBanco] });
  assert.equal(r.preguntas.length, 1);
  assert.match(r.preguntas[0].id, /^prog-08-[0-9a-f]{8}$/);
  assert.equal(r.invalidas.length, 2);
  assert.ok(r.invalidas.some((x) => /idéntico a otra candidata/.test(x.errores.join())));
  assert.equal(r.similitud[0].banco.nivel, 'identica');
});

test('filtrar entrega a cada evaluador solo sus temas y, si se pide, solo lo no evaluado', () => {
  const a = { id: 'prog-08-a', tema: 'prog-08' };
  const b = { id: 'prog-09-b', tema: 'prog-09' };
  const c = { id: 'dws-01-c', tema: 'dws-01' };
  const similitud = [a, b, c].map((p) => ({ id: p.id, tema: p.tema }));
  const r = filtrar({ candidatas: [a, b, c], similitud, temas: ['prog-08', 'prog-09'] });
  assert.deepEqual(r.preguntas.map((p) => p.id), ['prog-08-a', 'prog-09-b']);
  assert.deepEqual(r.similitud.map((s) => s.id), ['prog-08-a', 'prog-09-b']);
  const s = filtrar({ candidatas: [a, b, c], similitud, temas: ['prog-08', 'prog-09'], evaluadas: new Set(['prog-08-a']) });
  assert.deepEqual(s.preguntas.map((p) => p.id), ['prog-09-b']);
});

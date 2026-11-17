import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compararPreguntas } from '../tools/lib/similitud.mjs';
import { validarPregunta } from '../tools/lib/esquema.mjs';
import { preguntaBase } from './helpers.mjs';
import { comparar, duplicados, leerBanco, registrar, verificar } from '../tools/banco.mjs';


const sinWiki = { comprobarWiki: false };

test('una pregunta bien formada es válida', () => {
  assert.deepEqual(validarPregunta(preguntaBase(), sinWiki), []);
});

test('el esquema rechaza opciones que remiten a otras, distractores sin explicar y peticiones de código', () => {
  const p = preguntaBase({ opciones: { A: 'Todas las anteriores', B: 'B', C: 'A y B', D: 'D' } });
  const e = validarPregunta(p, sinWiki).join('\n');
  assert.match(e, /opción A se refiere a otras/);
  assert.match(e, /opción C se refiere a otras/);

  const q = preguntaBase({ explicacionesDistractores: { A: 'x' } });
  assert.match(validarPregunta(q, sinWiki).join('\n'), /exactamente A, C, D/);

  const r = preguntaBase({ enunciado: 'Escribe el código de un método que valide un DTO en Spring.' });
  assert.match(validarPregunta(r, sinWiki).join('\n'), /pide escribir código/);
});

test('el esquema rechaza textos que citan opciones por su letra', () => {
  const p = preguntaBase({ explicacionCorrecta: 'La opción B es correcta porque la capa de negocio contiene las reglas.' });
  assert.match(validarPregunta(p, sinWiki).join(), /cita una opción por su letra/);
});

test('el esquema rechaza asignatura incoherente y tema desconocido', () => {
  assert.match(validarPregunta(preguntaBase({ asignatura: 'dws' }), sinWiki).join(), /no corresponde/);
  assert.match(validarPregunta({ tema: 'prog-99' }, sinWiki).join(), /tema desconocido/);
});

test('detecta pregunta idéntica con las opciones reordenadas', () => {
  const a = preguntaBase();
  const b = preguntaBase({
    enunciado: 'Indica qué capa alberga las reglas de negocio en una arquitectura por capas.',
    opciones: { A: a.opciones.C, B: a.opciones.D, C: a.opciones.B, D: a.opciones.A },
    correcta: 'C',
  });
  assert.equal(compararPreguntas(a, b).nivel, 'identica');
});

test('detecta reformulaciones como similares y distingue preguntas distintas', () => {
  const a = preguntaBase();
  const reformulada = preguntaBase({
    enunciado: 'En la arquitectura por capas, ¿en qué capa residen las reglas de negocio?',
    opciones: { A: 'En la capa de presentación', B: 'En la capa de negocio', C: 'En la capa de datos', D: 'En el cliente' },
  });
  assert.notEqual(compararPreguntas(a, reformulada).nivel, 'distinta');

  const distinta = preguntaBase({
    enunciado: '¿Qué ventaja aporta la inyección de dependencias por constructor frente a crear las dependencias con new?',
    opciones: { A: 'Facilita sustituir implementaciones en pruebas', B: 'Elimina la necesidad de interfaces', C: 'Hace los objetos mutables', D: 'Obliga a usar herencia' },
    correcta: 'A',
    conocimiento: 'La inyección por constructor permite sustituir dependencias, por ejemplo en tests.',
  });
  assert.equal(compararPreguntas(a, distinta).nivel, 'distinta');
});

function examenAprobado(preguntas, id = 'EX-TEST-1') {
  return { id, falsador: { veredicto: 'APROBADO' }, preguntas };
}

test('registrar: solo exámenes aprobados, append-only, todo o nada y sin repetir', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'banco-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const ruta = join(dir, 'preguntas.jsonl');
  const p = preguntaBase();
  const validar = (x) => validarPregunta(x, sinWiki);
  const opts = { ruta, validar };

  assert.throws(() => registrar({ id: 'X', preguntas: [p] }, opts), /no está APROBADO/);
  assert.equal(registrar(examenAprobado([p]), opts), 1);
  const antes = readFileSync(ruta, 'utf8');
  const otra = preguntaBase({ enunciado: '¿Qué ventaja tiene separar la lógica de negocio de la capa de presentación?', conocimiento: 'Separar negocio de presentación facilita el mantenimiento.' });
  assert.throws(() => registrar(examenAprobado([otra, p], 'EX-TEST-2'), opts), /ya existe en el banco/);
  assert.throws(() => registrar(examenAprobado([otra], 'EX-TEST-1'), opts), /ya está registrado/);
  assert.equal(readFileSync(ruta, 'utf8'), antes, 'un registro rechazado no modifica el banco');
  const [linea] = leerBanco(ruta);
  assert.equal(linea.examenId, 'EX-TEST-1');
  assert.ok(linea.fechaUso);
});

test('leerBanco señala la línea corrupta', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'banco-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const ruta = join(dir, 'b.jsonl');
  writeFileSync(ruta, '{"id":"a"}\nno-json\n');
  assert.throws(() => leerBanco(ruta), /línea 2/);
});

test('comparar marca parecidas con el banco y entre candidatas', () => {
  const a = preguntaBase();
  const b = preguntaBase({ enunciado: a.enunciado + ' ', autor: 'otro' });
  const informe = comparar([b], [a]);
  assert.equal(informe[0].banco.nivel, 'identica');
  const entre = comparar([a, b], []);
  assert.equal(entre[0].candidatas[0].nivel, 'identica');
});

test('verificar: ids duplicados son error y referencias rotas a la wiki son aviso de desactualización', () => {
  const p = { ...preguntaBase(), fechaUso: '2026-11-17', examenId: 'EX-1' };
  const r = verificar([p, p]);
  assert.equal(r.valido, false);
  assert.ok(r.errores.some((e) => /id duplicado/.test(e)));
  assert.ok(r.avisos.some((a) => /desactualizada/.test(a)));
});

test('duplicados encuentra parejas parecidas del mismo tema y no compara temas distintos', () => {
  const a = preguntaBase();
  const b = preguntaBase({ enunciado: a.enunciado.replace('¿Qué capa', '¿Cuál es la capa que') });
  const c = { ...preguntaBase({ tema: 'dws-01', asignatura: 'dws' }) };
  const pares = duplicados([a, b, c]);
  assert.equal(pares.length, 1);
  assert.deepEqual([pares[0].a, pares[0].b], [a.id, b.id]);
});

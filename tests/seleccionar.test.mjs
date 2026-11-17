import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarTemario } from '../tools/lib/config.mjs';
import { LETRAS } from '../tools/lib/esquema.mjs';
import { comprobarEvaluaciones, corregir, moverCorrecta, seleccionar, sustituir } from '../tools/seleccionar.mjs';
import { preguntaBase } from './helpers.mjs';

const temario = cargarTemario();
const sinValidar = () => [];
const TIPOS = ['definicion', 'diferencias', 'funcionamiento-interno', 'situacion-practica', 'afirmaciones', 'ventajas-inconvenientes'];

// n candidatas por tema, con dificultades y tipos variados y una evaluación ACEPTADA cada una.
function escenario(n = 7) {
  const candidatas = [];
  const evaluaciones = [];
  for (const tema of temario.temas) {
    for (let i = 0; i < n; i++) {
      const p = preguntaBase({
        tema: tema.id,
        asignatura: tema.asignatura,
        enunciado: `Pregunta ${i} del tema ${tema.id} sobre un concepto concreto número ${i}`,
        dificultad: ['facil', 'facil', 'media', 'media', 'dificil', 'dificil', 'media'][i % 7],
        tipo: TIPOS[i % TIPOS.length],
        conocimiento: `Conocimiento ${i} de ${tema.id}`,
      });
      candidatas.push(p);
      evaluaciones.push({ id: p.id, evaluador: 'ev-test', veredicto: 'ACEPTADA', puntuacion: 10 - i, criterios: { noRepetida: true }, problemas: [], duplicadaDe: [], cambios: [] });
    }
  }
  return { candidatas, evaluaciones };
}

test('moverCorrecta mantiene alineadas opciones y explicaciones', () => {
  const p = preguntaBase();
  const q = moverCorrecta(p, 'D');
  assert.equal(q.correcta, 'D');
  assert.equal(q.opciones.D, p.opciones.B);
  assert.equal(q.opciones.B, p.opciones.D);
  assert.deepEqual(Object.keys(q.explicacionesDistractores), ['A', 'B', 'C']);
  assert.equal(q.explicacionesDistractores.B, p.explicacionesDistractores.D);
  assert.equal(q.explicacionesDistractores.A, p.explicacionesDistractores.A);
  assert.equal(q.id, p.id, 'reordenar no cambia el id');
});

test('selecciona 5 por tema, 40 en total, con la letra correcta equilibrada y falsador pendiente', () => {
  const { candidatas, evaluaciones } = escenario();
  const { examen, deficit } = seleccionar({ examenId: 'EX-T', candidatas, evaluaciones, temario, validar: sinValidar });
  assert.deepEqual(deficit, {});
  assert.equal(examen.preguntas.length, 40);
  for (const t of temario.temas) assert.equal(examen.preguntas.filter((p) => p.tema === t.id).length, 5);
  for (const l of LETRAS) assert.equal(examen.preguntas.filter((p) => p.correcta === l).length, 10);
  assert.equal(examen.falsador.veredicto, 'PENDIENTE');
  for (const t of temario.temas) {
    const ps = examen.preguntas.filter((p) => p.tema === t.id);
    assert.ok(ps.filter((p) => p.dificultad === 'facil').length <= 2);
    assert.ok(ps.some((p) => p.dificultad === 'dificil'));
  }
});

test('es determinista para el mismo examenId', () => {
  const { candidatas, evaluaciones } = escenario();
  const a = seleccionar({ examenId: 'EX-T', candidatas, evaluaciones, temario, validar: sinValidar, ahora: new Date(0) });
  const b = seleccionar({ examenId: 'EX-T', candidatas, evaluaciones, temario, validar: sinValidar, ahora: new Date(0) });
  assert.deepEqual(a.examen, b.examen);
});

test('excluye rechazadas, repetidas y duplicadas entre sí, y aplica correcciones documentadas', () => {
  const { candidatas, evaluaciones } = escenario();
  const tema = candidatas.filter((c) => c.tema === 'prog-08');
  const ev = (id) => evaluaciones.find((e) => e.id === id);
  ev(tema[0].id).veredicto = 'RECHAZADA';
  ev(tema[1].id).criterios.noRepetida = false;
  ev(tema[2].id).duplicadaDe = [tema[3].id]; // 2 y 3 evalúan lo mismo: solo una puede salir
  Object.assign(ev(tema[4].id), {
    veredicto: 'MEJORABLE',
    cambios: ['Distractor C reescrito: era parcialmente cierto'],
    correccion: { ...tema[4], enunciado: tema[4].enunciado + ' (corregida)' },
  });
  const { examen, seleccion } = seleccionar({ examenId: 'EX-T', candidatas, evaluaciones, temario, validar: sinValidar });
  const ids = examen.preguntas.filter((p) => p.tema === 'prog-08').map((p) => p.id);
  assert.ok(!ids.includes(tema[0].id) && !ids.includes(tema[1].id));
  assert.ok(!(ids.includes(tema[2].id) && ids.includes(tema[3].id)));
  assert.ok(!ids.includes(tema[4].id), 'la versión original de una MEJORABLE no sale');
  assert.equal(examen.proceso.correcciones.length, 1);
  assert.equal(examen.proceso.correcciones[0].idOriginal, tema[4].id);
  assert.ok(seleccion.excluidas.some((x) => x.id === tema[0].id && /RECHAZADA/.test(x.motivo)));
});

test('informa del déficit si un tema no tiene 5 elegibles', () => {
  const { candidatas, evaluaciones } = escenario();
  for (const e of evaluaciones) if (e.id.startsWith('dws-02')) e.veredicto = 'RECHAZADA';
  const { deficit } = seleccionar({ examenId: 'EX-T', candidatas, evaluaciones, temario, validar: sinValidar });
  assert.deepEqual(deficit, { 'dws-02': 5 });
});

test('sustituir usa una reserva del mismo tema, conserva la letra y vuelve a dejar el falsador pendiente', () => {
  const { candidatas, evaluaciones } = escenario();
  const r = seleccionar({ examenId: 'EX-T', candidatas, evaluaciones, temario, validar: sinValidar });
  r.examen.falsador.veredicto = 'APROBADO';
  const sale = r.examen.preguntas[0];
  const s = sustituir({ examen: r.examen, seleccion: r.seleccion, quitar: [sale.id], motivo: 'MENTIRA en distractor' });
  const entra = s.examen.preguntas[0];
  assert.notEqual(entra.id, sale.id);
  assert.equal(entra.tema, sale.tema);
  assert.equal(entra.correcta, sale.correcta);
  assert.equal(s.examen.falsador.veredicto, 'PENDIENTE');
  assert.equal(s.examen.proceso.sustituciones[0].quitada, sale.id);
  assert.equal(r.examen.preguntas[0].id, sale.id, 'no muta la entrada');
});

test('sustituir falla sin reservas y corregir exige documentar los cambios', () => {
  const { candidatas, evaluaciones } = escenario(5);
  const r = seleccionar({ examenId: 'EX-T', candidatas, evaluaciones, temario, validar: sinValidar });
  assert.throws(() => sustituir({ examen: r.examen, seleccion: r.seleccion, quitar: [r.examen.preguntas[0].id], motivo: 'x' }), /no quedan reservas/);
  const p = r.examen.preguntas[0];
  assert.throws(() => corregir({ examen: r.examen, seleccion: r.seleccion, id: p.id, correccion: p, cambios: [], validar: sinValidar }), /documentar/);
  const c = corregir({ examen: r.examen, seleccion: r.seleccion, id: p.id, correccion: { ...p, enunciado: p.enunciado + ' corregida' }, cambios: ['Enunciado precisado'], origen: 'ev-x', validar: sinValidar });
  assert.equal(c.examen.preguntas[0].correcta, p.correcta);
  assert.equal(c.examen.proceso.correcciones.at(-1).cambios[0], 'Enunciado precisado');
});

test('comprobarEvaluaciones detecta faltantes, duplicadas, ACEPTADA incoherente y MEJORABLE sin cambios', () => {
  const { candidatas, evaluaciones } = escenario(5);
  const criterios = Object.fromEntries(['correctaVerdadera', 'distractoresFalsos', 'unicaCorrecta', 'respaldoWiki', 'sinAmbiguedad', 'dificultadAdecuada', 'noRepetida', 'explicacionesCorrectas', 'teorica'].map((c) => [c, true]));
  for (const e of evaluaciones) e.criterios = { ...criterios };
  assert.deepEqual(comprobarEvaluaciones(candidatas, evaluaciones), []);
  const evs = structuredClone(evaluaciones);
  evs.pop();
  evs.push({ ...evs[0] });
  evs[1].criterios.unicaCorrecta = false;
  Object.assign(evs[2], { veredicto: 'MEJORABLE', cambios: [] });
  const errores = comprobarEvaluaciones(candidatas, evs).join(' | ');
  assert.match(errores, /0 evaluaciones/);
  assert.match(errores, /2 evaluaciones/);
  assert.match(errores, /ACEPTADA con criterios incumplidos/);
  assert.match(errores, /MEJORABLE sin corrección/);
});

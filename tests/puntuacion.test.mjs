import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularResultado } from '../tools/lib/puntuacion.mjs';

const preguntas = Array.from({ length: 40 }, (_, i) => ({ id: `p${i}`, asignatura: i < 20 ? 'prog' : 'dws', tema: `t${Math.floor(i / 5)}`, correcta: 'A' }));
function responder(aciertos, errores) {
  const r = {};
  preguntas.forEach((p, i) => { r[p.id] = i < aciertos ? 'A' : i < aciertos + errores ? 'B' : null; });
  return r;
}

test('todo correcto da 10 y todo en blanco da 0', () => {
  assert.equal(calcularResultado(preguntas, responder(40, 0)).nota, 10);
  const blanco = calcularResultado(preguntas, {});
  assert.equal(blanco.nota, 0);
  assert.equal(blanco.enBlanco, 40);
});

test('la penalización de −0,33 se aplica y la nota no baja de 0', () => {
  const r = calcularResultado(preguntas, responder(0, 40));
  assert.equal(r.puntuacion, -13.2);
  assert.equal(r.nota, 0);
  const m = calcularResultado(preguntas, responder(30, 10));
  assert.equal(m.puntuacion, 26.7);
  assert.equal(m.nota, 6.68); // 26,7 / 40 × 10 = 6,675
});

test('fórmula exacta: (puntuación / 40) × 10 redondeada a centésimas sin error de coma flotante', () => {
  const r = calcularResultado(preguntas, responder(6, 6)); // 4,02 puntos → 1,005
  assert.equal(r.puntuacion, 4.02);
  assert.equal(r.nota, 1.01);
  for (let a = 0; a <= 40; a++) {
    for (let e = 0; a + e <= 40; e++) {
      const { nota, puntuacion } = calcularResultado(preguntas, responder(a, e));
      assert.equal(puntuacion, Math.round((a - 0.33 * e) * 100) / 100);
      assert.ok(nota >= 0 && nota <= 10);
      assert.ok(Math.abs(nota - Math.max(0, ((a - 0.33 * e) / 40) * 10)) <= 0.005 + 1e-9, `a=${a} e=${e}`);
    }
  }
});

test('detalle, falladas, porcentaje y temas con errores', () => {
  const r = calcularResultado(preguntas, responder(20, 10));
  assert.equal(r.aciertos, 20);
  assert.equal(r.errores, 10);
  assert.equal(r.enBlanco, 10);
  assert.equal(r.porcentajeAciertos, 50);
  assert.deepEqual(r.preguntasFalladas, preguntas.slice(20, 30).map((p) => p.id));
  assert.deepEqual(r.temasConErrores, [{ tema: 't4', errores: 5 }, { tema: 't5', errores: 5 }]);
  assert.deepEqual(r.respuestas[25], { preguntaId: 'p25', asignatura: 'dws', tema: 't5', seleccionada: 'B', correcta: 'A', resultado: 'error' });
});

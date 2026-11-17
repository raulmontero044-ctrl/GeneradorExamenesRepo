import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarTemario } from '../tools/lib/config.mjs';

test('el temario tiene los 8 temas exigidos y la distribución 5 × 8 = 40', () => {
  const t = cargarTemario();
  assert.deepEqual(t.temas.map((x) => x.id), ['prog-08', 'prog-09', 'prog-10', 'prog-12', 'dws-01', 'dws-02', 'dws-03', 'dws-04']);
  assert.equal(t.preguntasPorTema, 5);
  assert.equal(t.totalPreguntas, t.temas.length * t.preguntasPorTema);
  assert.equal(t.totalPreguntas, 40);
});

test('cada tema resuelve su carpeta de wiki y su asignatura', () => {
  for (const tema of cargarTemario().temas) {
    assert.match(tema.dirWiki, /^wiki\/(programacion|dws)\/tema-\d{2}-[a-z0-9-]+$/);
    assert.ok(tema.asignaturaNombre);
    assert.match(tema.url, /^https:\/\/cesguiro\.es\/doku\.php\/clase\/daw\/(prog|dws)\//);
  }
});

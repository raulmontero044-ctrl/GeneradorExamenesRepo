import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compararSecciones, seccionesDokuwiki, seccionesMarkdown } from '../tools/lib/secciones.mjs';
import { aplicar, leerEstado, sincronizar } from '../tools/wiki.mjs';

const FUENTE = `====== 08 - Tema ======

Intro.

===== 1. Primero =====

Texto uno.

<code java>
==== esto no es un encabezado ====
</code>

==== 1.1 Sub ====

Texto sub.

===== 2. Segundo =====

Texto dos.
`;

function falsoFetch(texto, estado = 200) {
  return async () => ({ ok: estado === 200, status: estado, text: async () => texto });
}

test('seccionesDokuwiki respeta niveles e ignora encabezados dentro de <code>', () => {
  const s = seccionesDokuwiki(FUENTE);
  assert.deepEqual(s.map((x) => [x.titulo, x.nivel]), [
    ['08 - Tema', 1], ['1. Primero', 2], ['1.1 Sub', 3], ['2. Segundo', 2],
  ]);
  assert.match(s[1].cuerpo, /esto no es un encabezado/);
});

test('seccionesMarkdown ignora # dentro de bloques de código', () => {
  const s = seccionesMarkdown('# T\n\n## A\n```\n# no\n```\n## B\n');
  assert.deepEqual(s.map((x) => x.titulo), ['(preámbulo)', 'T', 'A', 'B']);
});

test('compararSecciones clasifica nuevas, eliminadas, modificadas y sin cambios', () => {
  const a = seccionesDokuwiki(FUENTE);
  const b = seccionesDokuwiki(FUENTE.replace('Texto dos.', 'Texto dos cambiado.').replace('==== 1.1 Sub ====\n\nTexto sub.\n', '') + '\n===== 3. Tercero =====\n\nNuevo.\n');
  const c = compararSecciones(a, b);
  assert.deepEqual(c.nuevas, ['3. Tercero']);
  assert.deepEqual(c.eliminadas, ['1.1 Sub']);
  assert.deepEqual(c.modificadas, ['2. Segundo']);
  assert.ok(c.sinCambios.includes('1. Primero'));
});

test('flujo incremental: nuevo → aplicar → sin cambios → modificado → no disponible', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'wiki-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const rutaFuentes = join(dir, '_fuentes');
  const rutaEstado = join(rutaFuentes, 'estado.json');
  const temas = ['prog-08'];

  let inf = await sincronizar({ salida: join(dir, 's1'), temas, estado: leerEstado(rutaEstado), fetchImpl: falsoFetch(FUENTE) });
  assert.equal(inf.temas[0].estado, 'nuevo');
  assert.equal(inf.hayCambios, true);
  assert.deepEqual(aplicar({ desde: join(dir, 's1'), rutaFuentes, rutaEstado }), ['prog-08']);
  assert.equal(readFileSync(join(rutaFuentes, 'prog-08.txt'), 'utf8'), FUENTE);

  const estadoAntes = readFileSync(rutaEstado, 'utf8');
  inf = await sincronizar({ salida: join(dir, 's2'), temas, estado: leerEstado(rutaEstado), fetchImpl: falsoFetch(FUENTE) });
  assert.equal(inf.temas[0].estado, 'sin-cambios');
  assert.equal(inf.hayCambios, false);
  assert.deepEqual(aplicar({ desde: join(dir, 's2'), rutaFuentes, rutaEstado }), []);
  assert.equal(readFileSync(rutaEstado, 'utf8'), estadoAntes, 'sin cambios no se reescribe estado.json');

  inf = await sincronizar({ salida: join(dir, 's3'), temas, estado: leerEstado(rutaEstado), fetchImpl: falsoFetch(FUENTE.replace('Texto uno.', 'Texto uno ampliado.')) });
  assert.equal(inf.temas[0].estado, 'modificado');
  assert.deepEqual(inf.temas[0].cambios.modificadas, ['1. Primero']);

  inf = await sincronizar({ salida: join(dir, 's4'), temas, estado: leerEstado(rutaEstado), fetchImpl: falsoFetch('', 503) });
  assert.equal(inf.temas[0].estado, 'no-disponible');
  assert.match(inf.temas[0].error, /503/);
  assert.deepEqual(aplicar({ desde: join(dir, 's4'), rutaFuentes, rutaEstado }), []);
  assert.equal(readFileSync(join(rutaFuentes, 'prog-08.txt'), 'utf8'), FUENTE, 'una fuente caída no borra la copia anterior');
});

test('una respuesta HTML (página de error) se trata como no disponible', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'wiki-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const inf = await sincronizar({ salida: dir, temas: ['dws-01'], estado: { temas: {} }, fetchImpl: falsoFetch('<!DOCTYPE html><html></html>') });
  assert.equal(inf.temas[0].estado, 'no-disponible');
  assert.equal(existsSync(join(dir, 'dws-01.txt')), false);
});

test('el marcador de contenido pendiente no confunde la palabra "todo"', async () => {
  const { MARCADOR_PENDIENTE } = await import('../tools/wiki.mjs');
  assert.equal(MARCADOR_PENDIENTE.test('Sobre todo, el controlador no debe contener lógica.'), false);
  assert.equal(MARCADOR_PENDIENTE.test('TODO: completar'), true);
});

test('enlacesRotos detecta ficheros y anclas inexistentes y acepta los válidos', async (t) => {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const { enlacesRotos } = await import('../tools/wiki.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'wiki-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const wiki = join(dir, 'wiki');
  mkdirSync(join(wiki, 'a'), { recursive: true });
  writeFileSync(join(wiki, 'a', 'contenido.md'), '# Tema\n\n## 2.1 Arquitectura por capas\n\n## Inyección de Dependencias (DI)\n');
  writeFileSync(join(wiki, 'rel.md'), [
    '[ok](a/contenido.md#21-arquitectura-por-capas)',
    '[ok2](a/contenido.md#inyección-de-dependencias-di)',
    '[mal](a/contenido.md#no-existe)',
    '[falta](b/contenido.md)',
    '[web](https://cesguiro.es)',
  ].join('\n'));
  const errores = enlacesRotos(wiki);
  assert.equal(errores.length, 2, errores.join('\n'));
  assert.match(errores[0], /ancla inexistente/);
  assert.match(errores[1], /fichero inexistente/);
});

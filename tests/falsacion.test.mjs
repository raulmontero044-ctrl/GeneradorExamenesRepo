import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analizarInforme, evaluarRonda, lineasSistema } from '../tools/falsacion.mjs';

const bloque = (n, id, resultado, falsa = 'NINGUNA', evidencia = 'wiki/x.md § 1') =>
  `Línea: ${n}\nId: ${id}\nResultado: ${resultado}\nAfirmación falsa: ${falsa}\nEvidencia: ${evidencia}\n`;

function ronda(t, { contenido, sistema }) {
  const dir = mkdtempSync(join(tmpdir(), 'falsacion-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'contenido-prog.jsonl'), ['p1', 'p2'].map((id, i) => JSON.stringify({ linea: i + 1, id })).join('\n') + '\n');
  writeFileSync(join(dir, 'sistema.jsonl'), lineasSistema('EX').map((l, i) => JSON.stringify({ linea: i + 1, ...l })).join('\n') + '\n');
  if (contenido !== undefined) writeFileSync(join(dir, 'informe-contenido-prog.txt'), contenido);
  if (sistema !== undefined) writeFileSync(join(dir, 'informe-sistema.txt'), sistema);
  return dir;
}

const sistemaOk = lineasSistema('EX').map((_, i) => bloque(i + 1, 'NINGUNO', 'NO DETECTADA')).join('\n') + 'Veredicto: APROBADO\n';

test('analizarInforme tolera adornos Markdown y varias afirmaciones falsas por línea', () => {
  const texto = '**Línea:** 1\n**Id:** p1\n- Resultado: MENTIRA\nAfirmación falsa: A es correcta\nEvidencia: wiki § 2\nAfirmación falsa: C es falsa\nEvidencia: wiki § 3\n\nVeredicto: RECHAZADO';
  const { bloques, veredicto } = analizarInforme(texto);
  assert.equal(veredicto, 'RECHAZADO');
  assert.equal(bloques[0].resultado, 'MENTIRA');
  assert.deepEqual(bloques[0].falsas.map((f) => f.afirmacion), ['A es correcta', 'C es falsa']);
});

test('APROBADO solo si todas las líneas de todos los informes son NO DETECTADA', (t) => {
  const dir = ronda(t, { contenido: bloque(1, 'p1', 'NO DETECTADA') + bloque(2, 'p2', 'NO DETECTADA') + 'Veredicto: APROBADO', sistema: sistemaOk });
  const r = evaluarRonda(dir);
  assert.equal(r.veredicto, 'APROBADO');
  assert.deepEqual(r.problemas, []);
});

test('una MENTIRA o una INDETERMINADA rechazan e identifican la pregunta', (t) => {
  const dir = ronda(t, { contenido: bloque(1, 'p1', 'MENTIRA', 'B es la correcta', 'contenido.md § 5 dice 204') + bloque(2, 'p2', 'INDETERMINADA') + 'Veredicto: RECHAZADO', sistema: sistemaOk });
  const r = evaluarRonda(dir);
  assert.equal(r.veredicto, 'RECHAZADO');
  assert.deepEqual(r.rechazadas.map((x) => [x.id, x.resultado]), [['p1', 'MENTIRA'], ['p2', 'INDETERMINADA']]);
  assert.equal(r.rechazadas[0].falsas[0].evidencia, 'contenido.md § 5 dice 204');
});

test('el veredicto del informe no prevalece sobre sus líneas, y faltar bloques o informes rechaza', (t) => {
  const contradictorio = ronda(t, { contenido: bloque(1, 'p1', 'MENTIRA', 'x') + bloque(2, 'p2', 'NO DETECTADA') + 'Veredicto: APROBADO', sistema: sistemaOk });
  const r1 = evaluarRonda(contradictorio);
  assert.equal(r1.veredicto, 'RECHAZADO');
  assert.ok(r1.problemas.some((p) => /dice APROBADO/.test(p)));

  const incompleto = ronda(t, { contenido: bloque(1, 'p1', 'NO DETECTADA') + 'Veredicto: APROBADO', sistema: sistemaOk });
  assert.ok(evaluarRonda(incompleto).problemas.some((p) => /1 bloques para 2 líneas/.test(p)));

  const sinSistema = ronda(t, { contenido: bloque(1, 'p1', 'NO DETECTADA') + bloque(2, 'p2', 'NO DETECTADA') });
  const r3 = evaluarRonda(sinSistema);
  assert.equal(r3.veredicto, 'RECHAZADO');
  assert.ok(r3.problemas.some((p) => /falta .*informe-sistema/.test(p)));
});

test('una afirmación de sistema refutada rechaza el examen aunque las preguntas estén bien', (t) => {
  const sistema = lineasSistema('EX').map((_, i) => bloque(i + 1, 'NINGUNO', i === 4 ? 'MENTIRA' : 'NO DETECTADA', i === 4 ? 'el HTML muestra 40' : 'NINGUNA')).join('\n');
  const dir = ronda(t, { contenido: bloque(1, 'p1', 'NO DETECTADA') + bloque(2, 'p2', 'NO DETECTADA'), sistema });
  const r = evaluarRonda(dir);
  assert.equal(r.veredicto, 'RECHAZADO');
  assert.equal(r.lineasSistemaFallidas[0].linea, 5);
});

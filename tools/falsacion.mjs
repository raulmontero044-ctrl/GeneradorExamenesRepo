#!/usr/bin/env node
// Integración del falsador (.claude/agents/falsador.md) en el flujo del examen.
//
//   node tools/falsacion.mjs preparar --examen-id <id>
//       Crea examenes/<id>/trabajo/falsador/ronda-<n>/ con las líneas JSONL para el
//       falsador: contenido-prog.jsonl, contenido-dws.jsonl, sistema.jsonl y el banco.
//   node tools/falsacion.mjs registrar --examen-id <id>
//       Lee informe-<nombre>.txt de la ronda abierta (uno por cada .jsonl), comprueba
//       que hay un bloque por línea, calcula el veredicto y lo anota en examen.json.
//
// El veredicto lo calcula esta herramienta a partir de los bloques: APROBADO solo si
// todas las líneas son NO DETECTADA. Si el informe dice otra cosa, prevalecen las líneas.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RUTAS, cargarTemario, esPrincipal, relativa } from './lib/config.mjs';
import { huellaPreguntas } from './lib/esquema.mjs';
import { leerBanco, resumen } from './banco.mjs';

export const MAX_RONDAS = 3;

export function lineasSistema(examenId) {
  const ex = `examenes/${examenId}/examen.json`;
  return [
    { afirmacion: 'El examen tiene exactamente 40 preguntas y exactamente 5 de cada uno de los 8 temas del temario.', comprobacion: `node tools/examen.mjs validar --examen-id ${examenId}` },
    { afirmacion: 'Cada pregunta tiene cuatro opciones A-D, una única respuesta marcada, explicación de la correcta y de cada uno de los tres distractores, y cita una sección existente de la wiki de su tema.', comprobacion: `node tools/examen.mjs validar --examen-id ${examenId}` },
    { afirmacion: 'Ninguna pregunta está repetida dentro del examen ni ha salido en un examen anterior registrado en el banco (ni idéntica ni con las opciones reordenadas).', comprobacion: `node tools/banco.mjs comparar ${ex}` },
    { afirmacion: 'Predominan las preguntas de dificultad media y difícil, hay preguntas de los tres niveles y se combinan los seis tipos de pregunta.', comprobacion: `node tools/examen.mjs validar --examen-id ${examenId}` },
    { afirmacion: 'El HTML del examen funciona: muestra las 40 preguntas, impide cambiar una respuesta confirmada, muestra la explicación de la correcta y de los distractores, y muestra el resultado final correcto.', comprobacion: `node tools/probar-html.mjs --examen-id ${examenId}` },
    { afirmacion: 'La puntuación es +1 por acierto, −0,33 por error y 0 en blanco, y la nota es (puntuación / 40) × 10, nunca menor que 0 ni mayor que 10.', comprobacion: 'node --test tests/puntuacion.test.mjs' },
    { afirmacion: 'El historial guarda cada resultado en un fichero JSON nuevo, no sobrescribe resultados anteriores y rechaza resultados con la puntuación manipulada.', comprobacion: 'node --test tests/historial.test.mjs' },
  ];
}

function dirFalsador(examenId) {
  return join(RUTAS.examenes, examenId, 'trabajo', 'falsador');
}

function leerExamen(examenId) {
  return JSON.parse(readFileSync(join(RUTAS.examenes, examenId, 'examen.json'), 'utf8'));
}

function escribirExamen(examen) {
  writeFileSync(join(RUTAS.examenes, examen.id, 'examen.json'), JSON.stringify(examen, null, 2) + '\n');
}

const jsonl = (filas) => filas.map((f) => JSON.stringify(f)).join('\n') + '\n';

export function preparar(examenId, { banco = leerBanco() } = {}) {
  const examen = leerExamen(examenId);
  const ronda = (examen.falsador?.rondas?.length ?? 0) + 1;
  if (ronda > MAX_RONDAS) throw new Error(`se han agotado las ${MAX_RONDAS} rondas del falsador: revisa el examen con el usuario`);
  const dir = join(dirFalsador(examenId), `ronda-${ronda}`);
  mkdirSync(dir, { recursive: true });
  const temario = cargarTemario();
  for (const a of temario.asignaturas) {
    const ps = examen.preguntas.filter((p) => p.asignatura === a.id);
    const filas = ps.map((p, i) => ({ linea: i + 1, id: p.id, tema: p.tema, enunciado: p.enunciado, opciones: p.opciones, correcta: p.correcta, explicacionCorrecta: p.explicacionCorrecta, explicacionesDistractores: p.explicacionesDistractores, wikiRef: p.wikiRef }));
    writeFileSync(join(dir, `contenido-${a.id}.jsonl`), jsonl(filas));
    writeFileSync(join(dir, `banco-${a.id}.json`), JSON.stringify(resumen(banco, { asignatura: a.id }), null, 2) + '\n');
  }
  writeFileSync(join(dir, 'sistema.jsonl'), jsonl(lineasSistema(examenId).map((l, i) => ({ linea: i + 1, ...l }))));
  writeFileSync(join(dir, 'huella.txt'), huellaPreguntas(examen.preguntas) + '\n');
  return { ronda, dir };
}

// Convierte la salida del falsador en bloques { linea, id, resultado, falsas: [{ afirmacion, evidencia }] }.
export function analizarInforme(texto) {
  const bloques = [];
  let actual = null;
  let veredicto = null;
  for (const bruta of texto.replace(/\r\n?/g, '\n').split('\n')) {
    const linea = bruta.replace(/^[\s>*`-]+/, '').replace(/\*\*/g, '').trim();
    let m;
    if ((m = linea.match(/^Línea:\s*(\d+)/i))) {
      actual = { linea: Number(m[1]), id: null, resultado: null, falsas: [] };
      bloques.push(actual);
    } else if ((m = linea.match(/^Veredicto:\s*(APROBADO|RECHAZADO)/i))) veredicto = m[1].toUpperCase();
    else if (!actual) continue;
    else if ((m = linea.match(/^Id:\s*(.+)$/i))) actual.id = m[1].trim();
    else if ((m = linea.match(/^Resultado:\s*(MENTIRA|NO DETECTADA|INDETERMINADA)\b/i))) actual.resultado = m[1].toUpperCase();
    else if ((m = linea.match(/^Afirmación falsa:\s*(.+)$/i))) actual.falsas.push({ afirmacion: m[1].trim(), evidencia: null });
    else if ((m = linea.match(/^Evidencia:\s*(.+)$/i))) {
      const ultima = actual.falsas.at(-1);
      if (ultima && ultima.evidencia === null) ultima.evidencia = m[1].trim();
      else actual.falsas.push({ afirmacion: null, evidencia: m[1].trim() });
    }
  }
  return { bloques, veredicto };
}

export function evaluarRonda(dir) {
  const problemas = [];
  const rechazadas = [];
  const lineasSistemaFallidas = [];
  for (const fichero of readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort()) {
    const nombre = fichero.replace(/\.jsonl$/, '');
    const entrada = readFileSync(join(dir, fichero), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    const rutaInforme = join(dir, `informe-${nombre}.txt`);
    if (!existsSync(rutaInforme)) {
      problemas.push(`falta ${relativa(rutaInforme)}`);
      continue;
    }
    const { bloques, veredicto } = analizarInforme(readFileSync(rutaInforme, 'utf8'));
    const porLinea = new Map(bloques.map((b) => [b.linea, b]));
    if (bloques.length !== entrada.length) problemas.push(`${nombre}: ${bloques.length} bloques para ${entrada.length} líneas`);
    for (const e of entrada) {
      const b = porLinea.get(e.linea);
      if (!b || !b.resultado) {
        problemas.push(`${nombre}: la línea ${e.linea} no tiene resultado`);
        continue;
      }
      if (b.resultado === 'NO DETECTADA') continue;
      const detalle = { origen: nombre, linea: e.linea, resultado: b.resultado, falsas: b.falsas };
      if (e.id) rechazadas.push({ id: e.id, ...detalle });
      else lineasSistemaFallidas.push({ afirmacion: e.afirmacion, ...detalle });
    }
    const todasBien = entrada.every((e) => porLinea.get(e.linea)?.resultado === 'NO DETECTADA');
    if (veredicto === 'APROBADO' && !todasBien) problemas.push(`${nombre}: el informe dice APROBADO pero tiene líneas no superadas`);
  }
  const veredicto = problemas.length || rechazadas.length || lineasSistemaFallidas.length ? 'RECHAZADO' : 'APROBADO';
  return { veredicto, problemas, rechazadas, lineasSistemaFallidas };
}

export function registrar(examenId, { ahora = new Date() } = {}) {
  const examen = leerExamen(examenId);
  const ronda = (examen.falsador?.rondas?.length ?? 0) + 1;
  const dir = join(dirFalsador(examenId), `ronda-${ronda}`);
  if (!existsSync(dir)) throw new Error(`no hay ronda ${ronda} preparada (ejecuta "preparar")`);
  const huella = readFileSync(join(dir, 'huella.txt'), 'utf8').trim();
  if (huella !== huellaPreguntas(examen.preguntas)) throw new Error('el examen ha cambiado desde que se preparó la ronda: prepara una nueva');
  const r = evaluarRonda(dir);
  examen.falsador = {
    veredicto: r.veredicto,
    huella: r.veredicto === 'APROBADO' ? huella : null,
    rondas: [...(examen.falsador?.rondas ?? []), { ronda, fecha: ahora.toISOString(), huella, directorio: relativa(dir), ...r }],
  };
  escribirExamen(examen);
  return { ronda, ...r };
}

function opcion(args, nombre) {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
}

function main(args) {
  const [orden] = args;
  const examenId = opcion(args, '--examen-id');
  if (!examenId) throw new Error('Falta --examen-id');
  if (orden === 'preparar') {
    const { ronda, dir } = preparar(examenId);
    console.log(`Ronda ${ronda} preparada en ${relativa(dir)}`);
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.jsonl'))) console.log(`  ${f} → escribe el informe en informe-${f.replace('.jsonl', '.txt')}`);
  } else if (orden === 'registrar') {
    const r = registrar(examenId);
    for (const p of r.problemas) console.log(`PROBLEMA  ${p}`);
    for (const x of r.rechazadas) console.log(`${x.resultado}  ${x.id}: ${x.falsas.map((f) => f.afirmacion).join(' | ')}`);
    for (const x of r.lineasSistemaFallidas) console.log(`${x.resultado}  sistema ${x.linea}: ${x.afirmacion}`);
    console.log(`Ronda ${r.ronda}: ${r.veredicto}`);
    process.exitCode = r.veredicto === 'APROBADO' ? 0 : 1;
  } else {
    console.log('Uso: node tools/falsacion.mjs preparar|registrar --examen-id <id>');
    process.exitCode = 2;
  }
}

if (esPrincipal(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exitCode = 1;
  }
}

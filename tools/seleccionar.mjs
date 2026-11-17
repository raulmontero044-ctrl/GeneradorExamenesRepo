#!/usr/bin/env node
// Selección determinista de las preguntas del examen a partir de las evaluaciones.
//
//   node tools/seleccionar.mjs comprobar --examen-id <id>
//       Verifica que cada candidata tiene exactamente una evaluación bien formada.
//   node tools/seleccionar.mjs seleccionar --examen-id <id>
//       Lee examenes/<id>/trabajo/{candidatas.json, similitud.json, evaluaciones/*.json}
//       y escribe examenes/<id>/examen.json y trabajo/seleccion.json (reservas).
//       Código 1 y trabajo/deficit.json si algún tema no llega a 5.
//   node tools/seleccionar.mjs sustituir --examen-id <id> --quitar <id1,id2> --motivo "<texto>"
//       Cambia preguntas rechazadas por la mejor reserva compatible del mismo tema.
//   node tools/seleccionar.mjs corregir --examen-id <id> --pregunta <id> --con <fichero.json>
//       Sustituye una pregunta por su versión corregida ({ correccion, cambios, origen }).
//
// Cualquier cambio en el examen deja el veredicto del falsador en PENDIENTE.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { RUTAS, cargarTemario, esPrincipal } from './lib/config.mjs';
import { LETRAS, asignarId, validarPregunta } from './lib/esquema.mjs';

const VALIDOS = new Set(['ACEPTADA', 'MEJORABLE']);
const GRAVEDAD = { RECHAZADA: 2, MEJORABLE: 1, ACEPTADA: 0 };
const MAX_FACILES_TEMA = 2;
const MAX_MISMO_TIPO = 2;

function semilla(texto) {
  return createHash('sha256').update(texto).digest().readUInt32LE(0);
}

function aleatorio(s) {
  // mulberry32
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Devuelve una copia con la respuesta correcta movida a la letra `destino`.
export function moverCorrecta(p, destino) {
  if (p.correcta === destino) return structuredClone(p);
  const q = structuredClone(p);
  const origen = p.correcta;
  q.opciones[destino] = p.opciones[origen];
  q.opciones[origen] = p.opciones[destino];
  const dist = { ...p.explicacionesDistractores };
  dist[origen] = dist[destino];
  delete dist[destino];
  q.explicacionesDistractores = Object.fromEntries(LETRAS.filter((l) => l !== destino).map((l) => [l, dist[l]]));
  q.correcta = destino;
  return q;
}

// Grupos de candidatas que evalúan el mismo conocimiento (union-find).
function agrupar(ids, enlaces) {
  const padre = new Map(ids.map((id) => [id, id]));
  const raiz = (x) => (padre.get(x) === x ? x : (padre.set(x, raiz(padre.get(x))), padre.get(x)));
  for (const [a, b] of enlaces) if (padre.has(a) && padre.has(b)) padre.set(raiz(a), raiz(b));
  return new Map(ids.map((id) => [id, raiz(id)]));
}

function evaluacionMasEstricta(lista) {
  return lista.reduce((peor, e) => (!peor || GRAVEDAD[e.veredicto] > GRAVEDAD[peor.veredicto] ? e : peor), null);
}

function elegirTema(pool, n) {
  const elegidas = [];
  const grupos = new Set();
  const intentar = (maxFaciles, maxTipo) => {
    for (const c of pool) {
      if (elegidas.length >= n) return;
      if (elegidas.includes(c) || grupos.has(c.grupo)) continue;
      if (c.pregunta.dificultad === 'facil' && elegidas.filter((x) => x.pregunta.dificultad === 'facil').length >= maxFaciles) continue;
      if (elegidas.filter((x) => x.pregunta.tipo === c.pregunta.tipo).length >= maxTipo) continue;
      elegidas.push(c);
      grupos.add(c.grupo);
    }
  };
  intentar(1, MAX_MISMO_TIPO);
  intentar(MAX_FACILES_TEMA, MAX_MISMO_TIPO);
  intentar(MAX_FACILES_TEMA, n);
  if (!elegidas.some((x) => x.pregunta.dificultad === 'dificil')) {
    const dificil = pool.find((c) => c.pregunta.dificultad === 'dificil' && !grupos.has(c.grupo));
    if (dificil && elegidas.length) {
      const sale = elegidas.pop(); // la de menor puntuación
      grupos.delete(sale.grupo);
      elegidas.push(dificil);
      grupos.add(dificil.grupo);
    }
  }
  return elegidas;
}

export function seleccionar({ examenId, candidatas, evaluaciones, similitud = [], temario = cargarTemario(), ahora = new Date(), validar = (p) => validarPregunta(p) }) {
  const porId = Map.groupBy(evaluaciones, (e) => e.id);
  const parecidoBanco = new Map(similitud.map((s) => [s.id, s.banco?.nivel]));
  const excluidas = [];
  const correcciones = [];
  const elegibles = [];

  for (const c of candidatas) {
    const ev = evaluacionMasEstricta(porId.get(c.id) ?? []);
    if (!ev) { excluidas.push({ id: c.id, motivo: 'sin evaluación' }); continue; }
    if (!VALIDOS.has(ev.veredicto)) { excluidas.push({ id: c.id, motivo: `RECHAZADA por ${ev.evaluador}: ${ev.problemas?.join('; ')}` }); continue; }
    if (ev.criterios?.noRepetida === false || parecidoBanco.get(c.id) === 'identica') { excluidas.push({ id: c.id, motivo: 'repetida del banco' }); continue; }
    let pregunta = c;
    if (ev.veredicto === 'MEJORABLE') {
      if (!ev.correccion || !ev.cambios?.length) { excluidas.push({ id: c.id, motivo: 'MEJORABLE sin corrección documentada' }); continue; }
      pregunta = { ...ev.correccion, tema: c.tema, asignatura: c.asignatura, autor: c.autor, fechaCreacion: c.fechaCreacion };
      pregunta = { ...pregunta, id: asignarId(pregunta) };
    }
    const errores = validar(pregunta);
    if (errores.length) { excluidas.push({ id: c.id, motivo: `no supera el esquema: ${errores.join('; ')}` }); continue; }
    if (ev.veredicto === 'MEJORABLE') correcciones.push({ idOriginal: c.id, id: pregunta.id, evaluador: ev.evaluador, cambios: ev.cambios });
    elegibles.push({ idOriginal: c.id, pregunta, puntuacion: ev.puntuacion ?? 0, veredicto: ev.veredicto, duplicadaDe: ev.duplicadaDe ?? [] });
  }

  const enlaces = [];
  for (const e of elegibles) for (const d of e.duplicadaDe) enlaces.push([e.idOriginal, d]);
  for (const s of similitud) for (const p of s.candidatas ?? []) if (['identica', 'similar'].includes(p.nivel)) enlaces.push([s.id, p.id]);
  const grupoDe = agrupar(candidatas.map((c) => c.id), enlaces);
  for (const e of elegibles) e.grupo = grupoDe.get(e.idOriginal);

  const orden = (a, b) => b.puntuacion - a.puntuacion || GRAVEDAD[a.veredicto] - GRAVEDAD[b.veredicto] || a.pregunta.id.localeCompare(b.pregunta.id);
  const preguntas = [];
  const reservas = {};
  const deficit = {};
  for (const tema of temario.temas) {
    const pool = elegibles.filter((e) => e.pregunta.tema === tema.id).sort(orden);
    const elegidas = elegirTema(pool, temario.preguntasPorTema);
    if (elegidas.length < temario.preguntasPorTema) deficit[tema.id] = temario.preguntasPorTema - elegidas.length;
    preguntas.push(...elegidas.map((e) => ({ ...e.pregunta, grupo: undefined })));
    reservas[tema.id] = pool.filter((e) => !elegidas.includes(e)).map((e) => ({ grupo: e.grupo, puntuacion: e.puntuacion, pregunta: e.pregunta }));
  }

  // Equilibrio de la letra correcta: el mismo número de A, B, C y D, en orden pseudoaleatorio estable.
  const azar = aleatorio(semilla(examenId));
  const destinos = preguntas.map((_, i) => LETRAS[i % 4]);
  for (let i = destinos.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [destinos[i], destinos[j]] = [destinos[j], destinos[i]];
  }
  const equilibradas = preguntas.map((p, i) => {
    const { grupo, ...limpia } = moverCorrecta(p, destinos[i]);
    return limpia;
  });
  const gruposEnExamen = Object.fromEntries(equilibradas.map((p) => [p.id, elegibles.find((e) => e.pregunta.id === p.id).grupo]));

  const examen = {
    id: examenId,
    fechaCreacion: ahora.toISOString(),
    preguntas: equilibradas,
    proceso: {
      candidatas: candidatas.length,
      elegibles: elegibles.length,
      excluidas: excluidas.length,
      correcciones,
      sustituciones: [],
    },
    falsador: { veredicto: 'PENDIENTE', rondas: [] },
  };
  return { examen, seleccion: { examenId, grupos: gruposEnExamen, reservas, excluidas }, deficit };
}

const CRITERIOS = ['correctaVerdadera', 'distractoresFalsos', 'unicaCorrecta', 'respaldoWiki', 'sinAmbiguedad', 'dificultadAdecuada', 'noRepetida', 'explicacionesCorrectas', 'teorica'];

export function comprobarEvaluaciones(candidatas, evaluaciones) {
  const errores = [];
  const ids = new Set(candidatas.map((c) => c.id));
  const porId = Map.groupBy(evaluaciones, (e) => e.id);
  for (const id of ids) {
    const n = porId.get(id)?.length ?? 0;
    if (n !== 1) errores.push(`${id}: ${n} evaluaciones (debe haber 1)`);
  }
  for (const e of evaluaciones) {
    if (!ids.has(e.id)) errores.push(`${e.id}: evaluación de una pregunta que no es candidata`);
    if (!GRAVEDAD.hasOwnProperty(e.veredicto)) errores.push(`${e.id}: veredicto "${e.veredicto}" no válido`);
    const faltan = CRITERIOS.filter((c) => typeof e.criterios?.[c] !== 'boolean');
    if (faltan.length) errores.push(`${e.id}: faltan criterios ${faltan.join(', ')}`);
    if (e.veredicto === 'ACEPTADA' && CRITERIOS.some((c) => e.criterios?.[c] === false)) errores.push(`${e.id}: ACEPTADA con criterios incumplidos`);
    if (e.veredicto !== 'RECHAZADA' && typeof e.puntuacion !== 'number') errores.push(`${e.id}: falta puntuación`);
    if (e.veredicto === 'MEJORABLE' && (!e.correccion || !e.cambios?.length)) errores.push(`${e.id}: MEJORABLE sin corrección o sin cambios documentados`);
  }
  return errores;
}

function invalidarFalsador(examen) {
  examen.falsador = { ...examen.falsador, veredicto: 'PENDIENTE' };
}

export function sustituir({ examen, seleccion, quitar, motivo, ahora = new Date() }) {
  const resultado = structuredClone(examen);
  const sel = structuredClone(seleccion);
  for (const id of quitar) {
    const i = resultado.preguntas.findIndex((p) => p.id === id);
    if (i < 0) throw new Error(`la pregunta ${id} no está en el examen`);
    const sale = resultado.preguntas[i];
    const restantes = resultado.preguntas.filter((p, k) => k !== i && p.tema === sale.tema);
    const gruposUsados = new Set(restantes.map((p) => sel.grupos[p.id]));
    const faciles = restantes.filter((p) => p.dificultad === 'facil').length;
    const necesitaDificil = !restantes.some((p) => p.dificultad === 'dificil');
    const compatibles = (sel.reservas[sale.tema] ?? []).filter((r) => !gruposUsados.has(r.grupo) && !(r.pregunta.dificultad === 'facil' && faciles >= MAX_FACILES_TEMA));
    const reserva = (necesitaDificil && compatibles.find((r) => r.pregunta.dificultad === 'dificil')) || compatibles[0];
    if (!reserva) throw new Error(`no quedan reservas compatibles para ${sale.tema}: hace falta una ronda de refuerzo`);
    resultado.preguntas[i] = moverCorrecta(reserva.pregunta, sale.correcta);
    sel.grupos[reserva.pregunta.id] = reserva.grupo;
    sel.reservas[sale.tema] = sel.reservas[sale.tema].filter((r) => r !== reserva);
    sel.excluidas.push({ id, motivo });
    resultado.proceso.sustituciones.push({ quitada: id, puesta: reserva.pregunta.id, motivo, fecha: ahora.toISOString() });
  }
  invalidarFalsador(resultado);
  return { examen: resultado, seleccion: sel };
}

export function corregir({ examen, seleccion, id, correccion, cambios, origen, validar = (p) => validarPregunta(p) }) {
  if (!cambios?.length) throw new Error('una corrección debe documentar sus cambios');
  const resultado = structuredClone(examen);
  const i = resultado.preguntas.findIndex((p) => p.id === id);
  if (i < 0) throw new Error(`la pregunta ${id} no está en el examen`);
  const original = resultado.preguntas[i];
  let nueva = { ...correccion, tema: original.tema, asignatura: original.asignatura, autor: original.autor, fechaCreacion: original.fechaCreacion };
  nueva = moverCorrecta({ ...nueva, id: asignarId(nueva) }, original.correcta);
  const errores = validar(nueva);
  if (errores.length) throw new Error(`la corrección no supera el esquema: ${errores.join('; ')}`);
  resultado.preguntas[i] = nueva;
  resultado.proceso.correcciones.push({ idOriginal: id, id: nueva.id, evaluador: origen, cambios });
  const sel = structuredClone(seleccion);
  sel.grupos[nueva.id] = sel.grupos[id];
  invalidarFalsador(resultado);
  return { examen: resultado, seleccion: sel };
}

function opcion(args, nombre) {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
}

const leer = (ruta) => JSON.parse(readFileSync(ruta, 'utf8'));
const escribir = (ruta, datos) => writeFileSync(ruta, JSON.stringify(datos, null, 2) + '\n');

function main(args) {
  const [orden] = args;
  const examenId = opcion(args, '--examen-id');
  if (!examenId) throw new Error('Falta --examen-id');
  const dir = join(RUTAS.examenes, examenId);
  const trabajo = join(dir, 'trabajo');
  const rutaExamen = join(dir, 'examen.json');
  const rutaSeleccion = join(trabajo, 'seleccion.json');

  const leerEvaluaciones = () => {
    const dirEval = join(trabajo, 'evaluaciones');
    return readdirSync(dirEval).filter((f) => f.endsWith('.json')).flatMap((f) => leer(join(dirEval, f)));
  };
  if (orden === 'comprobar') {
    const errores = comprobarEvaluaciones(leer(join(trabajo, 'candidatas.json')).preguntas, leerEvaluaciones());
    for (const e of errores) console.log(`ERROR  ${e}`);
    console.log(errores.length ? 'EVALUACIONES INCOMPLETAS' : 'EVALUACIONES COMPLETAS');
    process.exitCode = errores.length ? 1 : 0;
  } else if (orden === 'seleccionar') {
    const evaluaciones = leerEvaluaciones();
    const similitud = existsSync(join(trabajo, 'similitud.json')) ? leer(join(trabajo, 'similitud.json')) : [];
    const { examen, seleccion, deficit } = seleccionar({ examenId, candidatas: leer(join(trabajo, 'candidatas.json')).preguntas, evaluaciones, similitud });
    escribir(rutaSeleccion, seleccion);
    if (Object.keys(deficit).length) {
      escribir(join(trabajo, 'deficit.json'), deficit);
      console.log(`DÉFICIT: ${Object.entries(deficit).map(([t, n]) => `${t} faltan ${n}`).join(', ')}`);
      process.exitCode = 1;
      return;
    }
    escribir(rutaExamen, examen);
    const p = examen.proceso;
    console.log(`Seleccionadas ${examen.preguntas.length} de ${p.candidatas} candidatas (${p.elegibles} elegibles, ${p.correcciones.length} corregidas). Escrito ${rutaExamen}`);
  } else if (orden === 'sustituir') {
    const quitar = opcion(args, '--quitar')?.split(',').filter(Boolean);
    if (!quitar?.length) throw new Error('Falta --quitar');
    const r = sustituir({ examen: leer(rutaExamen), seleccion: leer(rutaSeleccion), quitar, motivo: opcion(args, '--motivo') ?? 'rechazada por el falsador' });
    escribir(rutaExamen, r.examen);
    escribir(rutaSeleccion, r.seleccion);
    for (const s of r.examen.proceso.sustituciones.slice(-quitar.length)) console.log(`${s.quitada} → ${s.puesta}`);
  } else if (orden === 'corregir') {
    const datos = leer(opcion(args, '--con'));
    const r = corregir({ examen: leer(rutaExamen), seleccion: leer(rutaSeleccion), id: opcion(args, '--pregunta'), ...datos });
    escribir(rutaExamen, r.examen);
    escribir(rutaSeleccion, r.seleccion);
    console.log(`Corregida ${opcion(args, '--pregunta')} → ${r.examen.proceso.correcciones.at(-1).id}`);
  } else {
    console.log('Uso: node tools/seleccionar.mjs comprobar|seleccionar|sustituir|corregir --examen-id <id> …');
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

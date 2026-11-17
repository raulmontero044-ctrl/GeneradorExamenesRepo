#!/usr/bin/env node
// Historial de resultados: un fichero JSON por intento, nunca sobrescrito.
//
//   node tools/historial.mjs listar [--examen-id <id>]
//   node tools/historial.mjs ver <ruta | intentoId>
//   node tools/historial.mjs estadisticas
//   node tools/historial.mjs importar <resultado.json>   (descargado desde el HTML sin servidor)
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RUTAS, esPrincipal, relativa } from './lib/config.mjs';
import { calcularResultado } from './lib/puntuacion.mjs';

const CAMPOS_COMPROBADOS = ['total', 'aciertos', 'errores', 'enBlanco', 'puntuacion', 'nota', 'porcentajeAciertos'];

export function leerExamen(examenId, dirExamenes = RUTAS.examenes) {
  if (!/^[A-Za-z0-9_-]+$/.test(examenId ?? '')) throw new Error(`examenId no válido: ${examenId}`);
  const ruta = join(dirExamenes, examenId, 'examen.json');
  if (!existsSync(ruta)) throw new Error(`no existe el examen ${examenId}`);
  return JSON.parse(readFileSync(ruta, 'utf8'));
}

// Recalcula el resultado a partir del examen y de las respuestas seleccionadas y exige que
// coincida con el recibido. Devuelve el registro que se guarda.
export function validarResultado(r, examen) {
  const errores = [];
  if (r?.examenId !== examen.id) errores.push(`examenId ${r?.examenId} no corresponde a ${examen.id}`);
  if (!/^[A-Za-z0-9-]{8,64}$/.test(r?.intentoId ?? '')) errores.push('intentoId no válido');
  if (Number.isNaN(Date.parse(r?.fechaHora))) errores.push('fechaHora no válida');
  const recibidas = new Map((r?.respuestas ?? []).map((x) => [x.preguntaId, x.seleccionada]));
  if (recibidas.size !== examen.preguntas.length || examen.preguntas.some((p) => !recibidas.has(p.id))) {
    errores.push('las respuestas no corresponden a las preguntas del examen');
  }
  for (const [id, sel] of recibidas) if (sel !== null && !['A', 'B', 'C', 'D'].includes(sel)) errores.push(`${id}: respuesta "${sel}" no válida`);
  if (errores.length) return { errores };

  const calculado = calcularResultado(examen.preguntas, Object.fromEntries(recibidas));
  for (const campo of CAMPOS_COMPROBADOS) {
    if (r[campo] !== calculado[campo]) errores.push(`${campo}: recibido ${r[campo]}, calculado ${calculado[campo]}`);
  }
  if (errores.length) return { errores };
  return {
    errores: [],
    registro: { version: 1, examenId: examen.id, intentoId: r.intentoId, fechaHora: r.fechaHora, guardadoEn: new Date().toISOString(), ...calculado },
  };
}

// Escribe el registro en un fichero nuevo. La marca 'wx' hace fallar la escritura si ya existe.
export function guardarRegistro(registro, dirResultados = RUTAS.resultados) {
  const dir = join(dirResultados, registro.examenId);
  mkdirSync(dir, { recursive: true });
  const nombre = `${registro.fechaHora.replace(/[:.]/g, '-')}-${registro.intentoId.slice(0, 8)}.json`;
  const ruta = join(dir, nombre);
  writeFileSync(ruta, JSON.stringify(registro, null, 2) + '\n', { flag: 'wx' });
  return ruta;
}

export function guardarResultado(r, { dirExamenes = RUTAS.examenes, dirResultados = RUTAS.resultados } = {}) {
  const examen = leerExamen(r?.examenId, dirExamenes);
  const { errores, registro } = validarResultado(r, examen);
  if (errores.length) {
    const e = new Error(`resultado no válido: ${errores.join('; ')}`);
    e.estado = 400;
    throw e;
  }
  const yaExiste = listarResultados(dirResultados).some((x) => x.intentoId === registro.intentoId);
  if (yaExiste) {
    const e = new Error(`el intento ${registro.intentoId} ya está en el historial`);
    e.estado = 409;
    throw e;
  }
  return guardarRegistro(registro, dirResultados);
}

export function listarResultados(dirResultados = RUTAS.resultados, examenId) {
  if (!existsSync(dirResultados)) return [];
  const examenes = readdirSync(dirResultados, { withFileTypes: true }).filter((d) => d.isDirectory() && (!examenId || d.name === examenId));
  return examenes
    .flatMap((d) => readdirSync(join(dirResultados, d.name)).filter((f) => f.endsWith('.json')).map((f) => join(dirResultados, d.name, f)))
    .map((ruta) => ({ ruta, ...JSON.parse(readFileSync(ruta, 'utf8')) }))
    .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
}

export function estadisticas(resultados) {
  const porTema = {};
  for (const r of resultados) {
    for (const x of r.respuestas) {
      const t = (porTema[x.tema] ??= { preguntas: 0, aciertos: 0, errores: 0, enBlanco: 0 });
      t.preguntas++;
      t[{ acierto: 'aciertos', error: 'errores', blanco: 'enBlanco' }[x.resultado]]++;
    }
  }
  const notas = resultados.map((r) => r.nota);
  return {
    intentos: resultados.length,
    notaMedia: notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 100) / 100 : null,
    mejorNota: notas.length ? Math.max(...notas) : null,
    porTema,
  };
}

function opcion(args, nombre) {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
}

function main(args) {
  const [orden, arg] = args;
  if (orden === 'listar') {
    const lista = listarResultados(RUTAS.resultados, opcion(args, '--examen-id'));
    for (const r of lista) console.log(`${r.fechaHora}  ${r.examenId}  nota ${r.nota}  (${r.aciertos}/${r.errores}/${r.enBlanco})  ${relativa(r.ruta)}`);
    console.log(`${lista.length} intentos`);
  } else if (orden === 'ver') {
    const r = listarResultados().find((x) => relativa(x.ruta) === arg.replaceAll('\\', '/') || x.intentoId === arg);
    if (!r) throw new Error(`no se encuentra ${arg}`);
    console.log(JSON.stringify(r, null, 2));
  } else if (orden === 'estadisticas') {
    console.log(JSON.stringify(estadisticas(listarResultados()), null, 2));
  } else if (orden === 'importar') {
    const ruta = guardarResultado(JSON.parse(readFileSync(arg, 'utf8')));
    console.log(`Importado en ${relativa(ruta)}`);
  } else {
    console.log('Uso: node tools/historial.mjs listar [--examen-id id] | ver <ruta|intentoId> | estadisticas | importar <fichero>');
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

#!/usr/bin/env node
// Validación y recopilación de las preguntas candidatas de los generadores.
//
//   node tools/candidatas.mjs comprobar <fichero.json>
//       Autocomprobación de un generador: esquema y referencias a la wiki.
//   node tools/candidatas.mjs reunir <dir> --salida <candidatas.json> [--similitud <similitud.json>]
//       Junta todos los <dir>/*.json, asigna ids, separa las inválidas y compara
//       las válidas con el banco y entre sí.
//   node tools/candidatas.mjs filtrar --dir <trabajo> --temas <t1,t2> --salida <f.json> [--sin-evaluar]
//       Entrada de un evaluador: solo las candidatas de sus temas (y, con --sin-evaluar,
//       solo las que aún no tienen evaluación en <trabajo>/evaluaciones), con su similitud.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cargarTemario, esPrincipal } from './lib/config.mjs';
import { asignarId, validarPregunta } from './lib/esquema.mjs';
import { comparar, leerBanco } from './banco.mjs';

function leerArray(ruta) {
  const datos = JSON.parse(readFileSync(ruta, 'utf8'));
  if (!Array.isArray(datos)) throw new Error(`${ruta}: se esperaba un array JSON de preguntas`);
  return datos;
}

export function comprobarFichero(preguntas, opciones) {
  return preguntas.map((p, i) => ({ indice: i, tema: p?.tema, errores: validarPregunta(p, { ...opciones, requerirId: false }) }));
}

// Avisos de mezcla por tema dentro de un fichero (no invalidan la candidata).
export function avisosMezcla(preguntas) {
  const avisos = [];
  const porTema = Map.groupBy(preguntas, (p) => p.tema);
  for (const [tema, ps] of porTema) {
    const tipos = new Set(ps.map((p) => p.tipo));
    const faciles = ps.filter((p) => p.dificultad === 'facil').length;
    if (ps.length >= 2 && tipos.size < 2) avisos.push(`${tema}: todas las preguntas son del mismo tipo`);
    if (!ps.some((p) => p.dificultad === 'dificil')) avisos.push(`${tema}: ninguna pregunta difícil`);
    if (faciles > Math.ceil(ps.length / 3)) avisos.push(`${tema}: demasiadas fáciles (${faciles} de ${ps.length})`);
  }
  return avisos;
}

export function reunir(ficheros, { banco = leerBanco(), opciones } = {}) {
  const preguntas = [];
  const invalidas = [];
  const ids = new Set();
  for (const ruta of ficheros) {
    leerArray(ruta).forEach((p, indice) => {
      const errores = validarPregunta(p, { ...opciones, requerirId: false });
      const id = errores.length ? null : asignarId(p);
      if (id && ids.has(id)) errores.push(`enunciado idéntico a otra candidata (${id})`);
      if (errores.length) invalidas.push({ fichero: ruta, indice, autor: p?.autor, tema: p?.tema, errores });
      else {
        ids.add(id);
        preguntas.push({ id, ...p });
      }
    });
  }
  return { preguntas, invalidas, similitud: comparar(preguntas, banco) };
}

export function filtrar({ candidatas, similitud, temas, evaluadas = new Set() }) {
  const preguntas = candidatas.filter((p) => temas.includes(p.tema) && !evaluadas.has(p.id));
  const ids = new Set(preguntas.map((p) => p.id));
  return { preguntas, similitud: similitud.filter((s) => ids.has(s.id)) };
}

function opcion(args, nombre) {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
}

function main(args) {
  const [orden, ruta] = args;
  if (orden === 'comprobar') {
    const preguntas = leerArray(ruta);
    const resultado = comprobarFichero(preguntas);
    for (const r of resultado) for (const e of r.errores) console.log(`ERROR  [${r.indice}] ${r.tema ?? '?'}: ${e}`);
    for (const a of avisosMezcla(preguntas)) console.log(`AVISO  ${a}`);
    const validas = resultado.every((r) => !r.errores.length);
    console.log(validas ? `CANDIDATAS VÁLIDAS (${preguntas.length})` : 'CANDIDATAS CON ERRORES');
    process.exitCode = validas ? 0 : 1;
  } else if (orden === 'reunir') {
    const salida = opcion(args, '--salida');
    if (!ruta || !salida) throw new Error('Uso: reunir <dir> --salida <fichero> [--similitud <fichero>]');
    const ficheros = readdirSync(ruta).filter((f) => f.endsWith('.json')).sort().map((f) => join(ruta, f));
    const { preguntas, invalidas, similitud } = reunir(ficheros);
    writeFileSync(salida, JSON.stringify({ preguntas, invalidas }, null, 2) + '\n');
    const rutaSimilitud = opcion(args, '--similitud');
    if (rutaSimilitud) writeFileSync(rutaSimilitud, JSON.stringify(similitud, null, 2) + '\n');
    const temario = cargarTemario();
    for (const t of temario.temas) {
      const n = preguntas.filter((p) => p.tema === t.id).length;
      const repetidas = similitud.filter((s) => s.tema === t.id && s.banco.nivel === 'identica').length;
      console.log(`${t.id}: ${n} válidas${repetidas ? `, ${repetidas} idénticas a preguntas del banco` : ''}`);
    }
    console.log(`Válidas: ${preguntas.length}. Inválidas: ${invalidas.length}. Ficheros: ${ficheros.length}`);
  } else if (orden === 'filtrar') {
    const dir = opcion(args, '--dir');
    const temas = opcion(args, '--temas')?.split(',');
    const salida = opcion(args, '--salida');
    if (!dir || !temas || !salida) throw new Error('Uso: filtrar --dir <trabajo> --temas <t1,t2> --salida <f> [--sin-evaluar]');
    const leer = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const dirEval = join(dir, 'evaluaciones');
    const evaluadas = new Set(args.includes('--sin-evaluar') && existsSync(dirEval)
      ? readdirSync(dirEval).filter((f) => f.endsWith('.json')).flatMap((f) => leer(join('evaluaciones', f))).map((e) => e.id)
      : []);
    const r = filtrar({ candidatas: leer('candidatas.json').preguntas, similitud: leer('similitud.json'), temas, evaluadas });
    writeFileSync(salida, JSON.stringify(r, null, 2) + '\n');
    console.log(`${r.preguntas.length} candidatas de ${temas.join(', ')} → ${salida}`);
  } else {
    console.log('Uso: node tools/candidatas.mjs comprobar <fichero> | reunir <dir> --salida <f> [--similitud <f>] | filtrar --dir <trabajo> --temas <t> --salida <f> [--sin-evaluar]');
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

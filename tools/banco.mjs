#!/usr/bin/env node
// Banco histórico de preguntas (append-only).
//
//   node tools/banco.mjs estadisticas
//   node tools/banco.mjs resumen [--tema prog-08 | --asignatura prog] [--salida f.json]
//       Lista compacta (id, tema, enunciado, respuesta, conocimiento) para que
//       generadores y evaluadores sepan qué no repetir.
//   node tools/banco.mjs comparar <preguntas.json> [--salida f.json]
//       Compara candidatas (array o { preguntas }) con el banco y entre sí.
//   node tools/banco.mjs registrar <examen.json>
//       Añade las preguntas de un examen APROBADO por el falsador. Todo o nada.
//   node tools/banco.mjs duplicados [--salida f.json]
//       Parejas parecidas dentro del propio banco (para la revisión del banco).
//   node tools/banco.mjs verificar
//       Integridad: JSON válido, esquema, ids únicos, referencias a la wiki vigentes.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { RUTAS, esPrincipal } from './lib/config.mjs';
import { validarPregunta } from './lib/esquema.mjs';
import { buscarParecidas, compararPreguntas, normalizarTexto } from './lib/similitud.mjs';

export function leerBanco(ruta = RUTAS.banco) {
  if (!existsSync(ruta)) return [];
  return readFileSync(ruta, 'utf8')
    .split('\n')
    .map((l, i) => [l.trim(), i + 1])
    .filter(([l]) => l)
    .map(([l, n]) => {
      try {
        return JSON.parse(l);
      } catch {
        throw new Error(`banco: la línea ${n} no es JSON válido`);
      }
    });
}

function leerPreguntas(ruta) {
  const datos = JSON.parse(readFileSync(ruta, 'utf8'));
  return Array.isArray(datos) ? datos : datos.preguntas;
}

export function estadisticas(banco) {
  const porTema = {};
  const examenes = new Set();
  for (const p of banco) {
    porTema[p.tema] = (porTema[p.tema] ?? 0) + 1;
    examenes.add(p.examenId);
  }
  return { total: banco.length, examenes: examenes.size, porTema };
}

export function resumen(banco, { tema, asignatura } = {}) {
  return banco
    .filter((p) => (!tema || p.tema === tema) && (!asignatura || p.asignatura === asignatura))
    .map((p) => ({ id: p.id, tema: p.tema, enunciado: p.enunciado, respuesta: p.opciones[p.correcta], conocimiento: p.conocimiento }));
}

// Informe de parecidos de cada candidata con el banco y con las demás candidatas.
export function comparar(candidatas, banco) {
  const conBanco = buscarParecidas(candidatas, banco);
  const entreCandidatas = buscarParecidas(candidatas, candidatas, { minimo: 'similar' });
  return candidatas.map((c, i) => ({
    id: c.id,
    tema: c.tema,
    banco: { nivel: conBanco[i].nivel, parecidas: conBanco[i].parecidas },
    candidatas: entreCandidatas[i].parecidas,
  }));
}

export function registrar(examen, { ruta = RUTAS.banco, ahora = new Date(), validar = validarPregunta } = {}) {
  if (examen?.falsador?.veredicto !== 'APROBADO') {
    throw new Error('el examen no está APROBADO por el falsador; no se registra');
  }
  const banco = leerBanco(ruta);
  const ids = new Set(banco.map((p) => p.id));
  const enunciados = new Set(banco.map((p) => normalizarTexto(p.enunciado)));
  if (banco.some((p) => p.examenId === examen.id)) throw new Error(`el examen ${examen.id} ya está registrado`);

  const conflictos = [];
  for (const p of examen.preguntas) {
    const errores = validar(p);
    if (errores.length) conflictos.push(`${p.id}: ${errores.join('; ')}`);
    if (ids.has(p.id)) conflictos.push(`${p.id}: ya existe en el banco`);
    if (enunciados.has(normalizarTexto(p.enunciado))) conflictos.push(`${p.id}: enunciado ya usado`);
    for (const b of banco) {
      if (b.tema === p.tema && compararPreguntas(p, b).nivel === 'identica') conflictos.push(`${p.id}: idéntica a ${b.id}`);
    }
  }
  if (conflictos.length) throw new Error(`no se registra nada:\n- ${conflictos.join('\n- ')}`);

  const fechaUso = ahora.toISOString();
  const lineas = examen.preguntas.map((p) => JSON.stringify({ ...p, fechaUso, examenId: examen.id })).join('\n') + '\n';
  mkdirSync(dirname(ruta), { recursive: true });
  appendFileSync(ruta, lineas);
  return examen.preguntas.length;
}

export function duplicados(banco) {
  const pares = [];
  for (let i = 0; i < banco.length; i++) {
    for (let j = i + 1; j < banco.length; j++) {
      if (banco[i].tema !== banco[j].tema) continue;
      const cmp = compararPreguntas(banco[i], banco[j]);
      if (cmp.nivel !== 'distinta') pares.push({ a: banco[i].id, b: banco[j].id, nivel: cmp.nivel, motivos: cmp.motivos });
    }
  }
  return pares;
}

export function verificar(banco) {
  const errores = [];
  const avisos = [];
  const vistos = new Set();
  for (const p of banco) {
    if (vistos.has(p.id)) errores.push(`${p.id}: id duplicado`);
    vistos.add(p.id);
    for (const campo of ['fechaUso', 'examenId', 'fechaCreacion']) if (!p[campo]) errores.push(`${p.id}: falta ${campo}`);
    const sinWiki = validarPregunta(p, { comprobarWiki: false });
    for (const e of sinWiki) errores.push(`${p.id}: ${e}`);
    // Una referencia rota no invalida el histórico: indica que la wiki cambió.
    for (const e of validarPregunta(p).filter((x) => x.startsWith('wikiRef') && !sinWiki.includes(x))) {
      avisos.push(`${p.id}: posible pregunta desactualizada — ${e}`);
    }
  }
  return { valido: errores.length === 0, errores, avisos };
}

function opcion(args, nombre) {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
}

function emitir(datos, salida) {
  const json = JSON.stringify(datos, null, 2) + '\n';
  if (salida) {
    mkdirSync(dirname(salida), { recursive: true });
    writeFileSync(salida, json);
    console.log(`Escrito ${salida}`);
  } else process.stdout.write(json);
}

function main(args) {
  const [orden, arg] = args;
  const banco = leerBanco();
  if (orden === 'estadisticas') emitir(estadisticas(banco));
  else if (orden === 'resumen') emitir(resumen(banco, { tema: opcion(args, '--tema'), asignatura: opcion(args, '--asignatura') }), opcion(args, '--salida'));
  else if (orden === 'comparar') emitir(comparar(leerPreguntas(arg), banco), opcion(args, '--salida'));
  else if (orden === 'registrar') {
    const n = registrar(JSON.parse(readFileSync(arg, 'utf8')));
    console.log(`Registradas ${n} preguntas en ${RUTAS.banco}`);
  } else if (orden === 'duplicados') emitir(duplicados(banco), opcion(args, '--salida'));
  else if (orden === 'verificar') {
    const r = verificar(banco);
    for (const e of r.errores) console.log(`ERROR  ${e}`);
    for (const a of r.avisos) console.log(`AVISO  ${a}`);
    console.log(r.valido ? `BANCO VÁLIDO (${banco.length} preguntas)` : 'BANCO CON ERRORES');
    process.exitCode = r.valido ? 0 : 1;
  } else {
    console.log('Uso: node tools/banco.mjs estadisticas | resumen [--tema t | --asignatura a] [--salida f] | comparar <f> [--salida f] | registrar <examen.json> | duplicados [--salida f] | verificar');
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

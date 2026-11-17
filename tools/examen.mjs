#!/usr/bin/env node
// Validación del examen y generación del HTML interactivo.
//
//   node tools/examen.mjs validar --examen-id <id>
//       Estructura, 40 preguntas, 5 por tema, esquema de cada pregunta, wikiRef,
//       repeticiones (internas y con el banco), mezcla de dificultad y tipos.
//   node tools/examen.mjs html --examen-id <id>
//       Valida y escribe examenes/<id>/examen.html (autocontenido, sin dependencias).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, RUTAS, cargarTemario, esPrincipal } from './lib/config.mjs';
import { LETRAS, TIPOS, validarPregunta } from './lib/esquema.mjs';
import { compararPreguntas } from './lib/similitud.mjs';
import { leerBanco } from './banco.mjs';

const MAX_FACILES = 10; // 25 %: predominan media y difícil

export function validarExamen(examen, { temario = cargarTemario(), banco = leerBanco(), validar = (p) => validarPregunta(p) } = {}) {
  const errores = [];
  const avisos = [];
  const ps = examen?.preguntas;
  if (!examen?.id) errores.push('falta el id del examen');
  if (!Array.isArray(ps)) return { valido: false, errores: [...errores, 'faltan las preguntas'], avisos };

  if (ps.length !== temario.totalPreguntas) errores.push(`hay ${ps.length} preguntas; deben ser exactamente ${temario.totalPreguntas}`);
  for (const t of temario.temas) {
    const n = ps.filter((p) => p.tema === t.id).length;
    if (n !== temario.preguntasPorTema) errores.push(`${t.id}: ${n} preguntas; deben ser exactamente ${temario.preguntasPorTema}`);
    const delTema = ps.filter((p) => p.tema === t.id);
    if (n && !delTema.some((p) => p.dificultad === 'dificil')) errores.push(`${t.id}: ninguna pregunta difícil`);
    if (delTema.filter((p) => p.dificultad === 'facil').length > 2) errores.push(`${t.id}: más de 2 preguntas fáciles`);
    if (n > 1 && new Set(delTema.map((p) => p.tipo)).size < 2) errores.push(`${t.id}: todas las preguntas son del mismo tipo`);
  }
  const ajenas = ps.filter((p) => !temario.temas.some((t) => t.id === p.tema));
  for (const p of ajenas) errores.push(`${p.id}: tema ${p.tema} fuera del temario`);

  const ids = new Set();
  for (const p of ps) {
    if (ids.has(p.id)) errores.push(`${p.id}: id repetido en el examen`);
    ids.add(p.id);
    for (const e of validar(p)) errores.push(`${p.id}: ${e}`);
  }
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      if (ps[i].tema !== ps[j].tema) continue;
      const c = compararPreguntas(ps[i], ps[j]);
      if (c.nivel === 'identica') errores.push(`${ps[i].id} y ${ps[j].id}: preguntas idénticas (${c.motivos.join(', ')})`);
      else if (c.nivel === 'similar') avisos.push(`${ps[i].id} y ${ps[j].id}: muy parecidas (${c.motivos.join(', ')})`);
    }
  }
  // Las preguntas ya registradas por este mismo examen no cuentan como repetición.
  const anteriores = banco.filter((b) => b.examenId !== examen.id);
  for (const p of ps) {
    for (const b of anteriores) {
      if (b.tema !== p.tema) continue;
      if (b.id === p.id || compararPreguntas(p, b).nivel === 'identica') errores.push(`${p.id}: ya salió en el examen ${b.examenId} (${b.id})`);
    }
  }

  const cuenta = (campo, valor) => ps.filter((p) => p[campo] === valor).length;
  const faciles = cuenta('dificultad', 'facil');
  if (faciles > MAX_FACILES) errores.push(`${faciles} preguntas fáciles; máximo ${MAX_FACILES} (deben predominar media y difícil)`);
  for (const d of ['facil', 'media', 'dificil']) if (ps.length && !cuenta('dificultad', d)) errores.push(`no hay ninguna pregunta de dificultad ${d}`);
  if (cuenta('dificultad', 'media') + cuenta('dificultad', 'dificil') <= faciles) errores.push('no predominan las preguntas de dificultad media y difícil');
  for (const t of TIPOS) if (ps.length && !cuenta('tipo', t)) errores.push(`no hay ninguna pregunta de tipo ${t}`);
  for (const l of LETRAS) {
    const n = cuenta('correcta', l);
    if (Math.abs(n - ps.length / 4) > 3) avisos.push(`la respuesta correcta es ${l} en ${n} preguntas (desequilibrado)`);
  }
  if (!examen.falsador) errores.push('falta el bloque falsador');
  return { valido: errores.length === 0, errores, avisos };
}

// Contenido de puntuacion.mjs apto para un <script> clásico.
function scriptPuntuacion() {
  return readFileSync(join(RAIZ, 'tools', 'lib', 'puntuacion.mjs'), 'utf8').replace(/^export /gm, '');
}

function escaparHtml(texto) {
  return String(texto).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

// JSON seguro dentro de <script type="application/json">: sin "</script" ni "<!--".
function jsonEnScript(datos) {
  return JSON.stringify(datos).replace(/</g, '\\u003c');
}

export function generarHtml(examen, { temario = cargarTemario() } = {}) {
  const temas = Object.fromEntries(temario.temas.map((t) => [t.id, { titulo: t.titulo, asignaturaNombre: t.asignaturaNombre }]));
  const preguntas = examen.preguntas.map((p) => ({
    id: p.id, asignatura: p.asignatura, tema: p.tema, enunciado: p.enunciado, opciones: p.opciones, correcta: p.correcta,
    explicacionCorrecta: p.explicacionCorrecta, explicacionesDistractores: p.explicacionesDistractores,
    dificultad: p.dificultad, tipo: p.tipo, wikiRef: p.wikiRef,
  }));
  const datos = { examen: { id: examen.id, fechaCreacion: examen.fechaCreacion }, temas, preguntas };
  const css = readFileSync(join(RAIZ, 'tools', 'plantilla', 'examen.css'), 'utf8');
  const js = readFileSync(join(RAIZ, 'tools', 'plantilla', 'examen.js'), 'utf8');
  const fecha = examen.fechaCreacion?.slice(0, 10) ?? '';
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Examen ${escaparHtml(examen.id)}</title>
<style>
${css}</style>
</head>
<body>
<main>
  <header>
    <h1>Examen ${escaparHtml(examen.id)}</h1>
    <p class="sub">Programación (temas 8, 9, 10 y 12) y DWS (temas 1-4) · ${examen.preguntas.length} preguntas · modo estudio · ${escaparHtml(fecha)}</p>
    <p class="sub">Acierto +1 · Error −0,33 · En blanco 0 · Nota = puntuación / ${examen.preguntas.length} × 10</p>
    <div class="progreso"><div id="barra"></div></div>
    <div class="contador"><span id="contador"></span><span id="respondidas"></span></div>
  </header>
  <div id="zona"></div>
  <p class="acciones"><button class="boton secundario" id="terminar" type="button">Terminar examen</button></p>
</main>
<script type="application/json" id="datos">${jsonEnScript(datos)}</script>
<script>
${scriptPuntuacion()}
</script>
<script>
${js}</script>
</body>
</html>
`;
}

function opcion(args, nombre) {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
}

function informar(r) {
  for (const e of r.errores) console.log(`ERROR  ${e}`);
  for (const a of r.avisos) console.log(`AVISO  ${a}`);
  console.log(r.valido ? 'EXAMEN VÁLIDO' : 'EXAMEN NO VÁLIDO');
}

function main(args) {
  const [orden] = args;
  const id = opcion(args, '--examen-id');
  if (!id) throw new Error('Falta --examen-id');
  const rutaExamen = join(RUTAS.examenes, id, 'examen.json');
  const examen = JSON.parse(readFileSync(rutaExamen, 'utf8'));
  const r = validarExamen(examen);
  if (orden === 'validar') {
    informar(r);
    process.exitCode = r.valido ? 0 : 1;
  } else if (orden === 'html') {
    if (!r.valido) {
      informar(r);
      throw new Error('no se genera el HTML de un examen no válido');
    }
    const salida = join(RUTAS.examenes, id, 'examen.html');
    writeFileSync(salida, generarHtml(examen));
    console.log(`Escrito ${salida}`);
  } else {
    console.log('Uso: node tools/examen.mjs validar|html --examen-id <id>');
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

// Esquema de una pregunta (candidata, de examen o del banco).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { RAIZ, cargarTemario } from './config.mjs';
import { normalizarTitulo, seccionesMarkdown } from './secciones.mjs';
import { normalizarTexto } from './similitud.mjs';

export const LETRAS = ['A', 'B', 'C', 'D'];
export const DIFICULTADES = ['facil', 'media', 'dificil'];
export const TIPOS = ['definicion', 'diferencias', 'ventajas-inconvenientes', 'funcionamiento-interno', 'situacion-practica', 'afirmaciones'];

const REFERENCIA_A_OTRAS = [
  /\b(todas|ninguna)\s+(de\s+)?(las\s+)?(anteriores|opciones|respuestas)\b|\bambas\s+(son|respuestas|opciones)\b/i,
  /\b[ABCD]\s+y\s+[ABCD]\b/,
];
// Las opciones se permutan al equilibrar la letra correcta: los textos no pueden citar letras.
const CITA_LETRA = /\b(opci[oó]n|respuesta|letra|alternativa)\s+[ABCD]\b|\(\s*[ABCD]\s*\)/;
const PIDE_CODIGO = /\b(escribe|escriba|implementa|implemente|codifica|programa)\b[^.?]*\b(c[oó]digo|m[eé]todo|clase|funci[oó]n|programa)\b/i;

export function asignarId(p) {
  const h = createHash('sha256').update(normalizarTexto(p.enunciado)).digest('hex').slice(0, 8);
  return `${p.tema}-${h}`;
}

const cacheTitulos = new Map();
function titulosDe(ruta) {
  if (!cacheTitulos.has(ruta)) {
    const titulos = existsSync(ruta) ? new Set(seccionesMarkdown(readFileSync(ruta, 'utf8')).map((s) => normalizarTitulo(s.titulo))) : null;
    cacheTitulos.set(ruta, titulos);
  }
  return cacheTitulos.get(ruta);
}

function texto(v, min) {
  return typeof v === 'string' && v.trim().length >= min;
}

// Devuelve la lista de errores (vacía si es válida).
// opciones.requerirId: exigir id con el formato del sistema (en candidatas lo asigna la herramienta).
// opciones.comprobarWiki: exigir que cada wikiRef apunte a un fichero y sección existentes.
export function validarPregunta(p, { temario = cargarTemario(), raiz = RAIZ, requerirId = true, comprobarWiki = true } = {}) {
  const e = [];
  const tema = temario.temas.find((t) => t.id === p?.tema);
  if (!tema) return [`tema desconocido: ${p?.tema}`];
  if (p.asignatura !== tema.asignatura) e.push(`asignatura "${p.asignatura}" no corresponde al tema ${tema.id} (${tema.asignatura})`);
  if (requerirId && p.id !== asignarId(p)) e.push(`id "${p.id}" no coincide con el esperado ${asignarId(p)}`);
  if (!texto(p.enunciado, 15)) e.push('enunciado vacío o demasiado corto');
  else if (PIDE_CODIGO.test(p.enunciado)) e.push('el enunciado pide escribir código (solo se admiten preguntas teóricas)');

  const claves = Object.keys(p.opciones ?? {});
  if (claves.join() !== LETRAS.join()) e.push(`opciones deben ser exactamente A, B, C, D (hay: ${claves.join(',') || 'ninguna'})`);
  else {
    for (const l of LETRAS) {
      if (!texto(p.opciones[l], 1)) e.push(`opción ${l} vacía`);
      else if (REFERENCIA_A_OTRAS.some((r) => r.test(p.opciones[l]))) e.push(`opción ${l} se refiere a otras opciones ("todas/ninguna de las anteriores", "A y B"): no admitido`);
    }
    const distintas = new Set(LETRAS.map((l) => normalizarTexto(p.opciones[l])));
    if (distintas.size !== 4) e.push('hay opciones repetidas');
  }
  if (!LETRAS.includes(p.correcta)) e.push(`correcta "${p.correcta}" no es A, B, C o D`);
  if (!texto(p.explicacionCorrecta, 20)) e.push('falta explicación de la respuesta correcta');
  const textos = [p.enunciado, p.explicacionCorrecta, ...Object.values(p.opciones ?? {}), ...Object.values(p.explicacionesDistractores ?? {})];
  if (textos.some((t) => CITA_LETRA.test(t ?? ''))) e.push('algún texto cita una opción por su letra ("opción A"); las opciones se reordenan, cita su contenido');

  const distractores = LETRAS.filter((l) => l !== p.correcta);
  const clavesDist = Object.keys(p.explicacionesDistractores ?? {}).sort();
  if (clavesDist.join() !== distractores.join()) e.push(`explicacionesDistractores debe tener exactamente ${distractores.join(', ')}`);
  else for (const l of distractores) if (!texto(p.explicacionesDistractores[l], 15)) e.push(`explicación del distractor ${l} vacía o demasiado corta`);

  if (!DIFICULTADES.includes(p.dificultad)) e.push(`dificultad "${p.dificultad}" no válida (${DIFICULTADES.join(', ')})`);
  if (!TIPOS.includes(p.tipo)) e.push(`tipo "${p.tipo}" no válido (${TIPOS.join(', ')})`);
  if (!texto(p.conocimiento, 10)) e.push('falta "conocimiento" (qué conocimiento concreto evalúa)');
  if (!texto(p.autor, 1)) e.push('falta autor');

  if (!Array.isArray(p.wikiRef) || p.wikiRef.length === 0) e.push('falta wikiRef');
  else if (comprobarWiki) {
    for (const ref of p.wikiRef) {
      if (!ref?.archivo?.startsWith(`${tema.dirWiki}/`)) {
        e.push(`wikiRef "${ref?.archivo}" no pertenece a la wiki del tema (${tema.dirWiki})`);
        continue;
      }
      const titulos = titulosDe(join(raiz, ref.archivo));
      if (!titulos) e.push(`wikiRef: no existe ${ref.archivo}`);
      else if (!titulos.has(normalizarTitulo(ref.seccion ?? ''))) e.push(`wikiRef: ${ref.archivo} no tiene la sección "${ref.seccion}"`);
    }
  }
  return e;
}

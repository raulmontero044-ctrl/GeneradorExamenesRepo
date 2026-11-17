// Troceado de fuentes DokuWiki y de ficheros Markdown de la wiki en secciones.
import { createHash } from 'node:crypto';

export function huella(texto) {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

// Normaliza un título para comparar fuente y wiki: sin marcas de formato, espacios
// colapsados y en minúsculas. Conserva acentos y numeración ("2.1", "3.").
export function normalizarTitulo(titulo) {
  return titulo
    .replace(/''/g, '')
    .replace(/[*`_]/g, '')
    .replace(/\{#[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizarCuerpo(lineas) {
  return lineas.map((l) => l.replace(/\s+$/, '')).join('\n').trim();
}

// Bloques en los que una línea con '=' o '#' no es un encabezado.
const APERTURA_DOKU = /^\s*<(code|file|uml|html|nowiki)\b/i;
const CIERRE_DOKU = (etiqueta) => new RegExp(`</${etiqueta}>`, 'i');

// Devuelve [{ titulo, nivel, cuerpo, hash }]. El nivel 1 es el título de la página.
// El texto previo al primer subencabezado queda en la sección del título.
export function seccionesDokuwiki(texto) {
  const lineas = texto.replace(/\r\n?/g, '\n').split('\n');
  const secciones = [];
  let actual = { titulo: '(sin título)', nivel: 1, lineas: [] };
  let bloque = null;
  for (const linea of lineas) {
    if (bloque) {
      actual.lineas.push(linea);
      if (CIERRE_DOKU(bloque).test(linea)) bloque = null;
      continue;
    }
    const apertura = linea.match(APERTURA_DOKU);
    if (apertura && !CIERRE_DOKU(apertura[1]).test(linea)) bloque = apertura[1];
    const enc = !apertura && linea.match(/^(={2,6})\s*(.+?)\s*=+\s*$/);
    if (enc) {
      if (actual.lineas.length || secciones.length || actual.titulo !== '(sin título)') secciones.push(actual);
      actual = { titulo: enc[2].trim(), nivel: 7 - enc[1].length, lineas: [] };
    } else {
      actual.lineas.push(linea);
    }
  }
  secciones.push(actual);
  return desambiguar(secciones.filter((s) => s.titulo !== '(sin título)' || normalizarCuerpo(s.lineas)));
}

// Encabezados Markdown (# a ######) fuera de bloques de código.
export function seccionesMarkdown(texto) {
  const lineas = texto.replace(/\r\n?/g, '\n').split('\n');
  const secciones = [];
  let actual = { titulo: '(preámbulo)', nivel: 0, lineas: [] };
  let enCodigo = false;
  for (const linea of lineas) {
    if (/^\s*(```|~~~)/.test(linea)) enCodigo = !enCodigo;
    const enc = !enCodigo && linea.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (enc) {
      secciones.push(actual);
      actual = { titulo: enc[2].trim(), nivel: enc[1].length, lineas: [] };
    } else {
      actual.lineas.push(linea);
    }
  }
  secciones.push(actual);
  return desambiguar(secciones);
}

// Títulos repetidos dentro de la misma página reciben un sufijo " (2)", " (3)"…
// para que el diff por título sea estable.
function desambiguar(secciones) {
  const vistos = new Map();
  return secciones.map((s) => {
    const base = normalizarTitulo(s.titulo);
    const n = (vistos.get(base) ?? 0) + 1;
    vistos.set(base, n);
    const cuerpo = normalizarCuerpo(s.lineas);
    return {
      titulo: s.titulo,
      clave: n === 1 ? base : `${base} (${n})`,
      nivel: s.nivel,
      cuerpo,
      hash: huella(cuerpo),
    };
  });
}

// Compara dos listas de secciones { clave, hash } y clasifica los cambios.
export function compararSecciones(anteriores, nuevas) {
  const previas = new Map(anteriores.map((s) => [s.clave, s]));
  const actuales = new Map(nuevas.map((s) => [s.clave, s]));
  const resultado = { nuevas: [], eliminadas: [], modificadas: [], sinCambios: [] };
  for (const s of nuevas) {
    const p = previas.get(s.clave);
    if (!p) resultado.nuevas.push(s.titulo);
    else if (p.hash !== s.hash) resultado.modificadas.push(s.titulo);
    else resultado.sinCambios.push(s.titulo);
  }
  for (const s of anteriores) if (!actuales.has(s.clave)) resultado.eliminadas.push(s.titulo);
  return resultado;
}

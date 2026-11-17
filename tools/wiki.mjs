#!/usr/bin/env node
// Sincronización incremental de las fuentes del temario y comprobación de la wiki.
//
//   node tools/wiki.mjs sincronizar --salida <dir> [--temas prog-08,dws-01]
//       Descarga cada tema (?do=export_raw), lo compara por secciones con la copia
//       guardada en wiki/_fuentes y escribe <dir>/<id>.txt y <dir>/informe.json.
//       No modifica la wiki.
//   node tools/wiki.mjs aplicar --desde <dir>
//       Copia a wiki/_fuentes solo los temas nuevos o modificados del informe y
//       actualiza estado.json. Sin cambios no escribe nada.
//   node tools/wiki.mjs comprobar
//       Valida que la wiki está completa. Código de salida 1 si no lo está.
//   node tools/wiki.mjs secciones <temaId>
//       Lista las secciones de la copia guardada de un tema.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { RAIZ, RUTAS, cargarTemario, esPrincipal } from './lib/config.mjs';
import { anclasMarkdown, compararSecciones, huella, normalizarTitulo, seccionesDokuwiki, seccionesMarkdown } from './lib/secciones.mjs';

const FICHEROS_TEMA = ['README.md', 'contenido.md', 'conceptos.md'];
const MIN_CONCEPTOS = 5;
// Sensible a mayúsculas: "todo" es una palabra española corriente.
export const MARCADOR_PENDIENTE = /\b(TODO|FIXME|TBD|PENDIENTE DE REDACTAR)\b|lorem ipsum/;

export function leerEstado(ruta = RUTAS.estadoFuentes) {
  return existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : { version: 1, temas: {} };
}

async function descargar(url, fetchImpl = fetch) {
  const respuesta = await fetchImpl(`${url}?do=export_raw`, { signal: AbortSignal.timeout(30000) });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  const texto = (await respuesta.text()).replace(/\r\n?/g, '\n');
  if (/^\s*<!doctype html|^\s*<html/i.test(texto)) throw new Error('la respuesta es HTML, no la fuente en bruto');
  if (!/^\s*={2,6}/.test(texto)) throw new Error('la respuesta no empieza por un encabezado DokuWiki');
  return texto;
}

export function resumirSecciones(texto) {
  return seccionesDokuwiki(texto).map(({ titulo, clave, nivel, hash }) => ({ titulo, clave, nivel, hash }));
}

export async function sincronizar({ salida, temas: filtro, estado = leerEstado(), fetchImpl } = {}) {
  const temario = cargarTemario();
  mkdirSync(salida, { recursive: true });
  const informe = { fecha: new Date().toISOString(), temas: [], hayCambios: false };
  for (const tema of temario.temas) {
    if (filtro && !filtro.includes(tema.id)) continue;
    const previo = estado.temas[tema.id];
    const entrada = { id: tema.id, url: tema.url };
    try {
      const texto = await descargar(tema.url, fetchImpl);
      writeFileSync(join(salida, `${tema.id}.txt`), texto);
      const secciones = resumirSecciones(texto);
      entrada.hash = huella(texto);
      entrada.secciones = secciones;
      if (!previo) {
        entrada.estado = 'nuevo';
        entrada.cambios = { nuevas: secciones.map((s) => s.titulo), eliminadas: [], modificadas: [], sinCambios: [] };
      } else if (previo.hash === entrada.hash) {
        entrada.estado = 'sin-cambios';
      } else {
        entrada.cambios = compararSecciones(previo.secciones, secciones);
        const c = entrada.cambios;
        // Un cambio de hash sin cambios de sección solo puede venir del orden.
        entrada.estado = c.nuevas.length || c.eliminadas.length || c.modificadas.length ? 'modificado' : 'reordenado';
      }
    } catch (error) {
      entrada.estado = 'no-disponible';
      entrada.error = String(error.message ?? error);
    }
    if (['nuevo', 'modificado', 'reordenado'].includes(entrada.estado)) informe.hayCambios = true;
    informe.temas.push(entrada);
  }
  writeFileSync(join(salida, 'informe.json'), JSON.stringify(informe, null, 2) + '\n');
  return informe;
}

export function aplicar({ desde, rutaFuentes = RUTAS.fuentes, rutaEstado = RUTAS.estadoFuentes }) {
  const informe = JSON.parse(readFileSync(join(desde, 'informe.json'), 'utf8'));
  const estado = leerEstado(rutaEstado);
  const aplicados = [];
  for (const t of informe.temas) {
    if (!['nuevo', 'modificado', 'reordenado'].includes(t.estado)) continue;
    mkdirSync(rutaFuentes, { recursive: true });
    copyFileSync(join(desde, `${t.id}.txt`), join(rutaFuentes, `${t.id}.txt`));
    estado.temas[t.id] = { url: t.url, fechaDescarga: informe.fecha, hash: t.hash, secciones: t.secciones };
    aplicados.push(t.id);
  }
  if (aplicados.length) writeFileSync(rutaEstado, JSON.stringify(estado, null, 2) + '\n');
  return aplicados;
}

export function comprobar({ raiz = RAIZ } = {}) {
  const temario = cargarTemario(join(raiz, 'config', 'temario.json'));
  const estado = leerEstado(join(raiz, 'wiki', '_fuentes', 'estado.json'));
  const errores = [];
  const avisos = [];
  for (const general of ['wiki/README.md', 'wiki/CHANGELOG.md']) {
    if (!existsSync(join(raiz, general))) errores.push(`Falta ${general}`);
  }
  for (const tema of temario.temas) {
    const fuente = join(raiz, 'wiki', '_fuentes', `${tema.id}.txt`);
    if (!existsSync(fuente) || !estado.temas[tema.id]) {
      errores.push(`${tema.id}: no hay copia de la fuente en wiki/_fuentes (ejecuta /k-temario)`);
      continue;
    }
    const faltan = FICHEROS_TEMA.filter((f) => !existsSync(join(raiz, tema.dirWiki, f)));
    if (faltan.length) {
      errores.push(`${tema.id}: faltan ${faltan.join(', ')} en ${tema.dirWiki}`);
      continue;
    }
    const leer = (f) => readFileSync(join(raiz, tema.dirWiki, f), 'utf8');
    const readme = leer('README.md');
    if (!/Última revisión:\s*\d{4}-\d{2}-\d{2}/.test(readme)) errores.push(`${tema.id}: README.md sin "Última revisión: AAAA-MM-DD"`);
    if (!/^##\s+Historial/m.test(readme)) errores.push(`${tema.id}: README.md sin sección "## Historial"`);
    if (!readme.includes(tema.url)) errores.push(`${tema.id}: README.md no enlaza la fuente ${tema.url}`);

    const contenido = leer('contenido.md');
    const titulosWiki = new Set(seccionesMarkdown(contenido).map((s) => normalizarTitulo(s.titulo)));
    const seccionesFuente = seccionesDokuwiki(readFileSync(fuente, 'utf8')).filter((s) => s.nivel > 1);
    const sinCubrir = seccionesFuente.filter((s) => !titulosWiki.has(normalizarTitulo(s.titulo)));
    for (const s of sinCubrir) errores.push(`${tema.id}: contenido.md no tiene la sección de la fuente "${s.titulo}"`);

    const conceptos = seccionesMarkdown(leer('conceptos.md')).filter((s) => s.nivel === 3);
    if (conceptos.length < MIN_CONCEPTOS) errores.push(`${tema.id}: conceptos.md tiene ${conceptos.length} conceptos (mínimo ${MIN_CONCEPTOS})`);
    for (const f of FICHEROS_TEMA) {
      if (MARCADOR_PENDIENTE.test(leer(f))) errores.push(`${tema.id}: ${f} contiene marcadores de contenido sin redactar`);
    }
    if (contenido.length < readFileSync(fuente, 'utf8').length * 0.3) {
      avisos.push(`${tema.id}: contenido.md es mucho más corto que la fuente; revisar que no sea un resumen excesivo`);
    }
  }
  errores.push(...enlacesRotos(join(raiz, 'wiki')));
  return { valida: errores.length === 0, errores, avisos };
}

function markdownsDe(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('_')) return [];
    const ruta = join(dir, e.name);
    return e.isDirectory() ? markdownsDe(ruta) : e.name.endsWith('.md') ? [ruta] : [];
  });
}

// Enlaces relativos [texto](fichero.md#ancla) o (#ancla) que no llevan a ningún sitio.
export function enlacesRotos(dirWiki) {
  const errores = [];
  const anclas = new Map();
  const anclasDe = (ruta) => {
    if (!anclas.has(ruta)) anclas.set(ruta, existsSync(ruta) ? anclasMarkdown(readFileSync(ruta, 'utf8')) : null);
    return anclas.get(ruta);
  };
  for (const md of markdownsDe(dirWiki)) {
    const texto = readFileSync(md, 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const [, destino] of texto.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^[a-z]+:/i.test(destino)) continue;
      const [ruta, ancla] = destino.split('#');
      const fichero = ruta ? join(dirname(md), decodeURIComponent(ruta)) : md;
      const nombre = relative(dirname(dirWiki), md).replaceAll('\\', '/');
      const disponibles = anclasDe(fichero);
      if (!disponibles) errores.push(`${nombre}: enlace a un fichero inexistente (${destino})`);
      else if (ancla && !disponibles.has(decodeURIComponent(ancla))) errores.push(`${nombre}: ancla inexistente (${destino})`);
    }
  }
  return errores;
}

function opcion(args, nombre) {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main(args) {
  const [orden] = args;
  if (orden === 'sincronizar') {
    const salida = opcion(args, '--salida');
    if (!salida) throw new Error('Falta --salida <dir>');
    const temas = opcion(args, '--temas')?.split(',');
    const informe = await sincronizar({ salida, temas });
    for (const t of informe.temas) {
      const c = t.cambios;
      const detalle = c ? ` (+${c.nuevas.length} nuevas, -${c.eliminadas.length} eliminadas, ~${c.modificadas.length} modificadas)` : '';
      console.log(`${t.id}: ${t.estado}${detalle}${t.error ? ` — ${t.error}` : ''}`);
    }
    console.log(informe.hayCambios ? 'HAY CAMBIOS' : 'SIN CAMBIOS');
  } else if (orden === 'aplicar') {
    const desde = opcion(args, '--desde');
    if (!desde) throw new Error('Falta --desde <dir>');
    const aplicados = aplicar({ desde });
    console.log(aplicados.length ? `Copias actualizadas: ${aplicados.join(', ')}` : 'Nada que aplicar');
  } else if (orden === 'comprobar') {
    const r = comprobar();
    for (const e of r.errores) console.log(`ERROR  ${e}`);
    for (const a of r.avisos) console.log(`AVISO  ${a}`);
    console.log(r.valida ? 'WIKI VÁLIDA' : 'WIKI NO VÁLIDA');
    process.exitCode = r.valida ? 0 : 1;
  } else if (orden === 'secciones') {
    const texto = readFileSync(join(RUTAS.fuentes, `${args[1]}.txt`), 'utf8');
    for (const s of seccionesDokuwiki(texto)) console.log(`${'  '.repeat(s.nivel - 1)}${s.titulo}`);
  } else {
    console.log('Uso: node tools/wiki.mjs sincronizar --salida <dir> [--temas a,b] | aplicar --desde <dir> | comprobar | secciones <tema>');
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop())) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(`ERROR: ${e.message}`);
    process.exitCode = 1;
  });
}

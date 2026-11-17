#!/usr/bin/env node
// Servidor local para hacer los exámenes y guardar los resultados en el historial.
//
//   npm run servidor            (http://localhost:4173)
//   Variables: PORT (0 = libre), EXAMENES_DIR y RESULTADOS_DIR (por defecto, las del proyecto).
//
// GET  /                              índice de exámenes
// GET  /examenes/<id>/examen.html     el examen
// POST /api/resultados                guarda un intento en historial/resultados/<id>/
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RUTAS, esPrincipal, relativa } from './lib/config.mjs';
import { guardarResultado, listarResultados } from './historial.mjs';

const LIMITE_CUERPO = 1024 * 1024;

function enviar(res, estado, cuerpo, tipo = 'application/json; charset=utf-8') {
  res.writeHead(estado, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
  res.end(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo));
}

function indice(dirExamenes, dirResultados) {
  const ids = existsSync(dirExamenes)
    ? readdirSync(dirExamenes, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(dirExamenes, d.name, 'examen.html'))).map((d) => d.name).sort()
    : [];
  const filas = ids.map((id) => {
    const intentos = listarResultados(dirResultados, id);
    const ultima = intentos.at(-1);
    return `<li><a href="/examenes/${id}/examen.html">${id}</a> — ${intentos.length} intentos${ultima ? ` · última nota ${ultima.nota}` : ''}</li>`;
  });
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Exámenes</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px}</style></head>
<body><h1>Exámenes disponibles</h1><ul>${filas.join('') || '<li>No hay exámenes generados.</li>'}</ul></body></html>`;
}

export function crearServidor({ dirExamenes = RUTAS.examenes, dirResultados = RUTAS.resultados } = {}) {
  return createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/') return enviar(res, 200, indice(dirExamenes, dirResultados), 'text/html; charset=utf-8');

    const examen = url.pathname.match(/^\/examenes\/([A-Za-z0-9_-]+)\/examen\.html$/);
    if (req.method === 'GET' && examen) {
      const ruta = join(dirExamenes, examen[1], 'examen.html');
      if (!existsSync(ruta)) return enviar(res, 404, { error: 'examen no encontrado' });
      return enviar(res, 200, readFileSync(ruta, 'utf8'), 'text/html; charset=utf-8');
    }

    if (req.method === 'POST' && url.pathname === '/api/resultados') {
      let cuerpo = '';
      let demasiado = false;
      req.setEncoding('utf8');
      req.on('data', (trozo) => {
        cuerpo += trozo;
        if (cuerpo.length > LIMITE_CUERPO) demasiado = true;
      });
      req.on('end', () => {
        if (demasiado) return enviar(res, 413, { error: 'cuerpo demasiado grande' });
        try {
          const ruta = guardarResultado(JSON.parse(cuerpo), { dirExamenes, dirResultados });
          enviar(res, 201, { ruta: relativa(ruta) });
        } catch (e) {
          enviar(res, e.estado ?? (e instanceof SyntaxError ? 400 : 500), { error: e.message });
        }
      });
      return undefined;
    }
    return enviar(res, 404, { error: 'no encontrado' });
  });
}

if (esPrincipal(import.meta.url)) {
  const dirExamenes = process.env.EXAMENES_DIR || RUTAS.examenes;
  const dirResultados = process.env.RESULTADOS_DIR || RUTAS.resultados;
  const servidor = crearServidor({ dirExamenes, dirResultados });
  servidor.listen(Number(process.env.PORT ?? 4173), '127.0.0.1', () => {
    console.log(`Exámenes en http://localhost:${servidor.address().port}/`);
    console.log(`Resultados en ${relativa(dirResultados)}/`);
  });
}

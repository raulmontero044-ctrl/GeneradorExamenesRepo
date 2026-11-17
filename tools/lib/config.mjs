// Rutas y temario compartidos por todas las herramientas.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const RUTAS = {
  temario: join(RAIZ, 'config', 'temario.json'),
  wiki: join(RAIZ, 'wiki'),
  fuentes: join(RAIZ, 'wiki', '_fuentes'),
  estadoFuentes: join(RAIZ, 'wiki', '_fuentes', 'estado.json'),
  banco: join(RAIZ, 'banco', 'preguntas.jsonl'),
  examenes: join(RAIZ, 'examenes'),
  resultados: join(RAIZ, 'historial', 'resultados'),
};

export function cargarTemario(ruta = RUTAS.temario) {
  const temario = JSON.parse(readFileSync(ruta, 'utf8'));
  const asignaturas = new Map(temario.asignaturas.map((a) => [a.id, a]));
  for (const tema of temario.temas) {
    const asig = asignaturas.get(tema.asignatura);
    tema.asignaturaNombre = asig.nombre;
    tema.dirWiki = join('wiki', asig.carpeta, tema.carpeta).replaceAll('\\', '/');
  }
  return temario;
}

// Rutas relativas a RAIZ con separador '/', para que sean estables entre sistemas.
export function relativa(ruta) {
  return ruta.replace(RAIZ, '').replaceAll('\\', '/').replace(/^\//, '');
}

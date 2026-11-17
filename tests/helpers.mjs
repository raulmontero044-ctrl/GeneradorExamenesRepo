// Datos de prueba compartidos.
import { asignarId } from '../tools/lib/esquema.mjs';

export function preguntaBase(extra = {}) {
  const p = {
    asignatura: 'prog',
    tema: 'prog-08',
    enunciado: '¿Qué capa de la arquitectura por capas contiene las reglas de negocio de la aplicación?',
    opciones: {
      A: 'La capa de presentación',
      B: 'La capa de dominio o negocio',
      C: 'La capa de persistencia',
      D: 'La capa de infraestructura de red',
    },
    correcta: 'B',
    explicacionCorrecta: 'La capa de negocio concentra las reglas y la lógica de la aplicación.',
    explicacionesDistractores: {
      A: 'La presentación solo recibe peticiones y devuelve respuestas.',
      C: 'La persistencia solo guarda y recupera datos.',
      D: 'No es una de las capas del modelo estudiado en el tema.',
    },
    dificultad: 'facil',
    tipo: 'definicion',
    wikiRef: [{ archivo: 'wiki/programacion/tema-08-arquitectura/contenido.md', seccion: 'x' }],
    conocimiento: 'La capa de negocio es la que contiene las reglas de negocio.',
    autor: 'test',
    fechaCreacion: '2026-11-17T10:00:00.000Z',
    ...extra,
  };
  p.id = asignarId(p);
  return p;
}

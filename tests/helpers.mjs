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

// Examen sintético válido: 8 temas × 5, mezcla de dificultad y tipos, letra correcta equilibrada.
export async function examenSintetico(id = 'EX-SINTETICO') {
  const { cargarTemario } = await import('../tools/lib/config.mjs');
  const { moverCorrecta } = await import('../tools/seleccionar.mjs');
  const tipos = ['definicion', 'diferencias', 'ventajas-inconvenientes', 'funcionamiento-interno', 'situacion-practica', 'afirmaciones'];
  const preguntas = [];
  cargarTemario().temas.forEach((t, k) => {
    ['facil', 'media', 'media', 'dificil', 'dificil'].forEach((dificultad, i) => {
      const p = preguntaBase({
        tema: t.id, asignatura: t.asignatura, dificultad, tipo: tipos[(k + i) % tipos.length],
        enunciado: `Pregunta sintética ${i} del tema ${t.id} sobre el concepto número ${k * 5 + i} <b>&</b>`,
        conocimiento: `Conocimiento ${k * 5 + i}`,
      });
      const n = k * 5 + i;
      for (const l of ['A', 'B', 'C', 'D']) p.opciones[l] = `${p.opciones[l]} (variante ${n})`;
      preguntas.push(moverCorrecta(p, ['A', 'B', 'C', 'D'][preguntas.length % 4]));
    });
  });
  return { id, fechaCreacion: '2026-11-17T10:00:00.000Z', preguntas, proceso: {}, falsador: { veredicto: 'PENDIENTE', rondas: [] } };
}

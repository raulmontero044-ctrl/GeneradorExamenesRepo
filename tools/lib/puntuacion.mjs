// Puntuación del examen. Este fichero se incrusta tal cual en el HTML del examen
// (sin los `export`), así que no puede importar nada.
//
// Acierto +1, error -0,33, blanco 0. Nota = (puntuación / total) × 10, entre 0 y 10.

export const PUNTOS = { acierto: 1, error: -0.33, blanco: 0 };

function redondear(x) {
  return Math.round(x * 100) / 100;
}

// preguntas: [{ id, asignatura, tema, correcta }]
// respuestas: { [preguntaId]: 'A' | 'B' | 'C' | 'D' | null }  (ausente o null = en blanco)
export function calcularResultado(preguntas, respuestas) {
  let aciertos = 0;
  let errores = 0;
  let enBlanco = 0;
  const detalle = [];
  const erroresPorTema = {};
  for (const p of preguntas) {
    const seleccionada = respuestas[p.id] ?? null;
    let resultado;
    if (seleccionada === null) {
      resultado = 'blanco';
      enBlanco++;
    } else if (seleccionada === p.correcta) {
      resultado = 'acierto';
      aciertos++;
    } else {
      resultado = 'error';
      errores++;
      erroresPorTema[p.tema] = (erroresPorTema[p.tema] || 0) + 1;
    }
    detalle.push({ preguntaId: p.id, asignatura: p.asignatura, tema: p.tema, seleccionada, correcta: p.correcta, resultado });
  }
  const total = preguntas.length;
  // Aritmética entera en centésimas: con coma flotante, 6 aciertos y 6 errores (4,02 puntos,
  // nota 1,005) se redondearían a 1,00 en lugar de 1,01.
  const centesimas = aciertos * Math.round(PUNTOS.acierto * 100) + errores * Math.round(PUNTOS.error * 100);
  const puntuacion = centesimas / 100;
  const nota = total ? Math.min(10, Math.max(0, Math.round((centesimas * 10) / total) / 100)) : 0;
  return {
    total,
    aciertos,
    errores,
    enBlanco,
    puntuacion,
    nota,
    porcentajeAciertos: total ? redondear((aciertos / total) * 100) : 0,
    respuestas: detalle,
    preguntasFalladas: detalle.filter((d) => d.resultado === 'error').map((d) => d.preguntaId),
    temasConErrores: Object.entries(erroresPorTema).map(([tema, n]) => ({ tema, errores: n })),
  };
}

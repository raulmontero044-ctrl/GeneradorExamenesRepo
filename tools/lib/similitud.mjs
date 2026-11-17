// Detección de preguntas repetidas o equivalentes.
//
// Es un filtro léxico previo y determinista. Lo que marca como `identica` se descarta
// sin más; lo que marca como `similar` o `revisar` lo decide el evaluador
// (comparación semántica real) con la lista de parejas que se le entrega.

const PALABRAS_VACIAS = new Set(`a al algo algun alguna algunas alguno algunos ante antes aquel aquella aquellas aquellos aqui asi cada como con contra cual cuales cuando de del desde donde dos e el ella ellas ellos en entre era es esa esas ese eso esos esta estan estas este esto estos fue ha han hay la las le les lo los mas me mediante mi mismo mucho muy ni no nos o otra otras otro otros para pero poco por porque que quien se sea segun ser si sido sin sobre solo son su sus tambien tan tanto te tiene tienen todo todos tras tu un una unas uno unos y ya afirmacion afirmaciones siguiente siguientes correcta correcto incorrecta incorrecto verdadera falsa respecto opcion caso`.split(/\s+/));

export function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@./ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function raiz(palabra) {
  // Raíz muy simple para igualar plurales y género: "capas"→"cap", "controladores"→"controlador".
  if (palabra.length > 5 && palabra.endsWith('es')) return palabra.slice(0, -2);
  if (palabra.length > 3 && /[sao]$/.test(palabra)) return palabra.slice(0, -1);
  return palabra;
}

export function terminos(texto) {
  return new Set(
    normalizarTexto(texto).split(' ').filter((p) => p.length > 1 && !PALABRAS_VACIAS.has(p)).map(raiz),
  );
}

export function jaccard(a, b) {
  if (!a.size && !b.size) return 1;
  let comunes = 0;
  for (const x of a) if (b.has(x)) comunes++;
  return comunes / (a.size + b.size - comunes);
}

function textoCorrecto(p) {
  return normalizarTexto(p.opciones?.[p.correcta]);
}

function conjuntoOpciones(p) {
  return new Set(Object.values(p.opciones ?? {}).map(normalizarTexto));
}

// Compara dos preguntas y devuelve { nivel, motivos, puntuaciones }.
// nivel: 'identica' | 'similar' | 'revisar' | 'distinta'.
export function compararPreguntas(a, b) {
  const enunA = normalizarTexto(a.enunciado);
  const enunB = normalizarTexto(b.enunciado);
  const opcA = conjuntoOpciones(a);
  const opcB = conjuntoOpciones(b);
  const mismasOpciones = opcA.size === opcB.size && [...opcA].every((o) => opcB.has(o));
  const mismaCorrecta = textoCorrecto(a) === textoCorrecto(b);

  const puntuaciones = {
    enunciado: jaccard(terminos(a.enunciado), terminos(b.enunciado)),
    opciones: jaccard(terminos(Object.values(a.opciones ?? {}).join(' ')), terminos(Object.values(b.opciones ?? {}).join(' '))),
    correcta: jaccard(terminos(a.opciones?.[a.correcta]), terminos(b.opciones?.[b.correcta])),
    conocimiento: a.conocimiento && b.conocimiento ? jaccard(terminos(a.conocimiento), terminos(b.conocimiento)) : 0,
  };
  const motivos = [];
  if (enunA === enunB) motivos.push('enunciado idéntico');
  if (mismasOpciones && mismaCorrecta) motivos.push('mismas opciones y misma respuesta (posible reordenación)');
  if (motivos.length) return { nivel: 'identica', motivos, puntuaciones };

  if (puntuaciones.enunciado >= 0.6) motivos.push(`enunciado muy parecido (${puntuaciones.enunciado.toFixed(2)})`);
  if (puntuaciones.opciones >= 0.6) motivos.push(`opciones muy parecidas (${puntuaciones.opciones.toFixed(2)})`);
  if (puntuaciones.conocimiento >= 0.6) motivos.push(`mismo conocimiento evaluado (${puntuaciones.conocimiento.toFixed(2)})`);
  if (puntuaciones.correcta >= 0.7 && puntuaciones.enunciado >= 0.35) motivos.push('misma respuesta correcta para una pregunta parecida');
  if (motivos.length) return { nivel: 'similar', motivos, puntuaciones };

  const maximo = Math.max(puntuaciones.enunciado, puntuaciones.opciones, puntuaciones.conocimiento);
  if (maximo >= 0.35) return { nivel: 'revisar', motivos: [`parecido parcial (${maximo.toFixed(2)})`], puntuaciones };
  return { nivel: 'distinta', motivos: [], puntuaciones };
}

const ORDEN = { identica: 3, similar: 2, revisar: 1, distinta: 0 };

// Para cada candidata, las preguntas de `referencia` del mismo tema que se le parecen.
export function buscarParecidas(candidatas, referencia, { mismoTema = true, minimo = 'revisar' } = {}) {
  return candidatas.map((c) => {
    const parecidas = [];
    for (const r of referencia) {
      if (r === c) continue;
      if (mismoTema && r.tema !== c.tema) continue;
      const cmp = compararPreguntas(c, r);
      if (ORDEN[cmp.nivel] >= ORDEN[minimo]) parecidas.push({ id: r.id, nivel: cmp.nivel, motivos: cmp.motivos });
    }
    parecidas.sort((x, y) => ORDEN[y.nivel] - ORDEN[x.nivel]);
    return { id: c.id, tema: c.tema, nivel: parecidas[0]?.nivel ?? 'distinta', parecidas };
  });
}

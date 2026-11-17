// Lógica del examen en modo estudio. Requiere `calcularResultado` (puntuacion.mjs,
// incrustado antes) y los datos en <script type="application/json" id="datos">.
(function () {
  'use strict';
  const DATOS = JSON.parse(document.getElementById('datos').textContent);
  const PREGUNTAS = DATOS.preguntas;
  const LETRAS = ['A', 'B', 'C', 'D'];
  const estado = { indice: 0, seleccion: null, respuestas: {}, confirmadas: new Set(), terminado: false, resultado: null };
  const $ = (sel) => document.querySelector(sel);

  function el(etiqueta, atributos, ...hijos) {
    const nodo = document.createElement(etiqueta);
    for (const [k, v] of Object.entries(atributos || {})) {
      if (k === 'class') nodo.className = v;
      else if (k.startsWith('on')) nodo.addEventListener(k.slice(2), v);
      else nodo.setAttribute(k, v);
    }
    for (const h of hijos) if (h !== null && h !== undefined) nodo.append(h);
    return nodo;
  }

  const nombreTema = (id) => (DATOS.temas[id] ? DATOS.temas[id].titulo : id);
  const nombreAsignatura = (id) => (DATOS.temas[id] ? DATOS.temas[id].asignaturaNombre : '');
  const DIFICULTAD = { facil: 'Fácil', media: 'Media', dificil: 'Difícil' };

  function actualizarProgreso() {
    const hechas = estado.confirmadas.size;
    $('#barra').style.width = `${(hechas / PREGUNTAS.length) * 100}%`;
    $('#contador').textContent = `Pregunta ${Math.min(estado.indice + 1, PREGUNTAS.length)} de ${PREGUNTAS.length}`;
    $('#respondidas').textContent = `${hechas} respondidas`;
  }

  function pintarPregunta() {
    const p = PREGUNTAS[estado.indice];
    const confirmada = estado.confirmadas.has(p.id);
    const elegida = confirmada ? estado.respuestas[p.id] : estado.seleccion;
    const opciones = el('div', { class: 'opciones', role: 'radiogroup' });
    for (const l of LETRAS) {
      const clases = ['opcion'];
      if (!confirmada && elegida === l) clases.push('elegida');
      if (confirmada && l === p.correcta) clases.push('correcta');
      if (confirmada && l === elegida && l !== p.correcta) clases.push('incorrecta');
      const boton = el('button', { class: clases.join(' '), 'data-letra': l, role: 'radio', 'aria-checked': String(elegida === l), onclick: () => elegir(l) },
        el('span', { class: 'letra' }, l), el('span', {}, p.opciones[l]));
      boton.disabled = confirmada;
      opciones.append(boton);
    }
    const acciones = el('div', { class: 'acciones' });
    if (!confirmada) {
      const blanco = el('button', { class: 'boton secundario', id: 'blanco', onclick: dejarEnBlanco }, 'Dejar en blanco');
      const confirmar = el('button', { class: 'boton', id: 'confirmar', onclick: confirmarRespuesta }, 'Confirmar respuesta');
      confirmar.disabled = !estado.seleccion;
      acciones.append(blanco, confirmar);
    } else {
      const ultima = estado.indice === PREGUNTAS.length - 1;
      acciones.append(el('button', { class: 'boton', id: 'siguiente', onclick: siguiente }, ultima ? 'Ver resultado' : 'Siguiente pregunta'));
    }
    const tarjeta = el('section', { class: 'tarjeta', id: 'pregunta', 'data-id': p.id },
      el('div', { class: 'etiquetas' },
        el('span', { class: 'etiqueta' }, nombreAsignatura(p.tema)),
        el('span', { class: 'etiqueta' }, nombreTema(p.tema)),
        el('span', { class: 'etiqueta' }, DIFICULTAD[p.dificultad] || p.dificultad)),
      el('p', { class: 'enunciado' }, p.enunciado),
      opciones,
      confirmada ? pintarFeedback(p) : null,
      acciones);
    $('#zona').replaceChildren(tarjeta);
    actualizarProgreso();
  }

  function pintarFeedback(p) {
    const elegida = estado.respuestas[p.id];
    const tipo = elegida === null ? 'blanco' : elegida === p.correcta ? 'acierto' : 'error';
    const titulo = { acierto: '¡Correcto! (+1)', error: `Incorrecto (−0,33). La respuesta correcta es la ${p.correcta}.`, blanco: `En blanco (0). La respuesta correcta es la ${p.correcta}.` }[tipo];
    const lista = el('ul', { class: 'distractores' });
    for (const l of LETRAS.filter((x) => x !== p.correcta)) {
      lista.append(el('li', { 'data-letra': l }, el('b', {}, `Por qué no es la ${l}: `), p.explicacionesDistractores[l]));
    }
    const refs = (p.wikiRef || []).map((r) => `${r.archivo} › ${r.seccion}`).join(' · ');
    return el('div', { class: `feedback ${tipo}`, id: 'feedback', 'data-resultado': tipo },
      el('h3', {}, titulo),
      el('p', { class: 'explicacion' }, el('b', {}, `Por qué es la ${p.correcta}: `), p.explicacionCorrecta),
      lista,
      el('p', { class: 'fuente' }, `Fuente: ${refs}`));
  }

  function elegir(letra) {
    const p = PREGUNTAS[estado.indice];
    if (estado.terminado || estado.confirmadas.has(p.id)) return; // una respuesta confirmada no se puede cambiar
    estado.seleccion = letra;
    pintarPregunta();
  }

  function fijar(valor) {
    const p = PREGUNTAS[estado.indice];
    if (estado.confirmadas.has(p.id)) return;
    estado.respuestas[p.id] = valor;
    estado.confirmadas.add(p.id);
    estado.seleccion = null;
    pintarPregunta();
  }

  function confirmarRespuesta() {
    if (estado.seleccion) fijar(estado.seleccion);
  }

  function dejarEnBlanco() {
    fijar(null);
  }

  function siguiente() {
    if (estado.indice < PREGUNTAS.length - 1) {
      estado.indice++;
      pintarPregunta();
      window.scrollTo(0, 0);
    } else terminar();
  }

  let avisoTerminar = false;
  function pedirTerminar() {
    if (estado.terminado) return;
    if (!avisoTerminar) {
      avisoTerminar = true;
      $('#terminar').textContent = 'Pulsa otra vez para terminar (las no respondidas cuentan en blanco)';
      return;
    }
    terminar();
  }

  function terminar() {
    estado.terminado = true;
    for (const p of PREGUNTAS) if (!estado.confirmadas.has(p.id)) estado.respuestas[p.id] = null;
    const r = calcularResultado(PREGUNTAS, estado.respuestas);
    estado.resultado = {
      version: 1,
      examenId: DATOS.examen.id,
      intentoId: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)),
      fechaHora: new Date().toISOString(),
      ...r,
    };
    $('#terminar').classList.add('oculto');
    pintarResultado(estado.resultado);
    estado.guardado = guardar(estado.resultado);
    return estado.guardado;
  }

  const formato = (n) => String(n).replace('.', ',');

  function pintarResultado(r) {
    const cifras = el('div', { class: 'cifras' });
    for (const [valor, texto, id] of [[r.aciertos, 'Aciertos', 'r-aciertos'], [r.errores, 'Errores', 'r-errores'], [r.enBlanco, 'En blanco', 'r-blanco'], [`${formato(r.porcentajeAciertos)} %`, 'Porcentaje de aciertos', 'r-porcentaje'], [formato(r.puntuacion), 'Puntuación (+1 / −0,33 / 0)', 'r-puntuacion']]) {
      cifras.append(el('div', { class: 'cifra' }, el('b', { id }, String(valor)), el('span', {}, texto)));
    }
    const temas = el('ul', { id: 'r-temas' });
    for (const t of r.temasConErrores) temas.append(el('li', {}, `${nombreAsignatura(t.tema)} — ${nombreTema(t.tema)}: ${t.errores} ${t.errores === 1 ? 'error' : 'errores'}`));
    const falladas = el('div', { id: 'r-falladas' });
    for (const id of r.preguntasFalladas) {
      const p = PREGUNTAS.find((x) => x.id === id);
      const tuya = r.respuestas.find((x) => x.preguntaId === id).seleccionada;
      falladas.append(el('details', {},
        el('summary', {}, p.enunciado),
        el('p', {}, `Tu respuesta: ${tuya}) ${p.opciones[tuya]}`),
        el('p', {}, `Correcta: ${p.correcta}) ${p.opciones[p.correcta]}`),
        el('p', {}, p.explicacionCorrecta),
        el('p', {}, `Por qué no es la ${tuya}: ${p.explicacionesDistractores[tuya]}`)));
    }
    $('#zona').replaceChildren(el('section', { class: 'tarjeta', id: 'resultado' },
      el('p', { class: 'sub' }, 'Nota final'),
      el('p', { class: 'nota', id: 'r-nota' }, formato(r.nota.toFixed(2))),
      cifras,
      el('h3', {}, 'Temas con errores'),
      r.temasConErrores.length ? temas : el('p', { id: 'r-temas' }, 'Ninguno.'),
      el('h3', {}, `Preguntas falladas (${r.preguntasFalladas.length})`),
      r.preguntasFalladas.length ? falladas : el('p', { id: 'r-falladas' }, 'Ninguna.'),
      el('p', { class: 'guardado', id: 'guardado' }, 'Guardando resultado…')));
    $('#barra').style.width = '100%';
    $('#contador').textContent = 'Examen terminado';
  }

  async function guardar(r) {
    const aviso = $('#guardado');
    if (location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/resultados', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) });
        const cuerpo = await res.json();
        if (!res.ok) throw new Error(cuerpo.error || `HTTP ${res.status}`);
        aviso.textContent = `Resultado guardado en ${cuerpo.ruta}`;
        aviso.dataset.estado = 'guardado';
        return cuerpo;
      } catch (e) {
        aviso.textContent = `No se ha podido guardar en el historial (${e.message}). Descarga el resultado e impórtalo.`;
        aviso.dataset.estado = 'error';
      }
    } else {
      aviso.textContent = 'Examen abierto sin servidor: descarga el resultado y guárdalo en el historial con «node tools/historial.mjs importar <fichero>».';
      aviso.dataset.estado = 'sin-servidor';
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' }));
    aviso.after(el('p', {}, el('a', { class: 'boton secundario', id: 'descargar', href: url, download: `resultado-${r.examenId}-${r.fechaHora.replace(/[:.]/g, '-')}.json` }, 'Descargar resultado (JSON)')));
    return null;
  }

  document.addEventListener('keydown', (e) => {
    if (estado.terminado || e.target.tagName === 'INPUT') return;
    const tecla = e.key.toUpperCase();
    const n = ['1', '2', '3', '4'].indexOf(tecla);
    if (LETRAS.includes(tecla) || n >= 0) elegir(LETRAS.includes(tecla) ? tecla : LETRAS[n]);
    else if (e.key === 'Enter') {
      const boton = $('#confirmar:not(:disabled)') || $('#siguiente');
      if (boton) boton.click();
    }
  });

  // Prueba automática (tools/probar-html.mjs): ?autotest=mix|correctas|errores|blanco[&guardar=1]
  async function autotest(plan) {
    const informe = { preguntasMostradas: 0, bloqueoOk: true, explicacionesOk: true, respuestas: {} };
    for (let i = 0; i < PREGUNTAS.length; i++) {
      const p = PREGUNTAS[estado.indice];
      if ($('#pregunta').dataset.id !== p.id || document.querySelectorAll('.opcion').length !== 4) informe.preguntasMostradas = -1;
      else if (informe.preguntasMostradas >= 0) informe.preguntasMostradas++;
      const modo = plan === 'mix' ? ['correctas', 'errores', 'blanco'][i % 3] : plan;
      const mala = LETRAS.find((l) => l !== p.correcta);
      if (modo === 'blanco') $('#blanco').click();
      else {
        document.querySelector(`.opcion[data-letra="${modo === 'correctas' ? p.correcta : mala}"]`).click();
        $('#confirmar').click();
      }
      const fijada = estado.respuestas[p.id];
      informe.respuestas[p.id] = fijada;
      // Intentar cambiar la respuesta tras confirmar no debe tener efecto.
      const otra = LETRAS.find((l) => l !== fijada);
      document.querySelector(`.opcion[data-letra="${otra}"]`).click();
      if (estado.respuestas[p.id] !== fijada || !document.querySelector('.opcion').disabled) informe.bloqueoOk = false;
      const fb = $('#feedback');
      if (!fb || !fb.querySelector('.explicacion') || fb.querySelectorAll('.distractores li').length !== 3) informe.explicacionesOk = false;
      $('#siguiente').click();
    }
    const guardado = await estado.guardado;
    informe.terminado = estado.terminado;
    informe.notaMostrada = $('#r-nota') ? $('#r-nota').textContent : null;
    informe.cifras = {
      aciertos: $('#r-aciertos')?.textContent, errores: $('#r-errores')?.textContent, enBlanco: $('#r-blanco')?.textContent,
      porcentaje: $('#r-porcentaje')?.textContent, puntuacion: $('#r-puntuacion')?.textContent,
    };
    informe.temasConErrores = document.querySelectorAll('#r-temas li').length;
    informe.falladasMostradas = document.querySelectorAll('#r-falladas details').length;
    informe.resultado = estado.resultado;
    informe.guardado = { estado: $('#guardado')?.dataset.estado, respuesta: guardado };
    const pre = el('pre', { id: 'autotest' });
    pre.textContent = JSON.stringify(informe);
    document.body.append(pre);
  }

  $('#terminar').addEventListener('click', pedirTerminar);
  pintarPregunta();

  const params = new URLSearchParams(location.search);
  if (params.has('autotest')) {
    if (!params.has('guardar')) window.fetch = () => Promise.reject(new Error('guardado desactivado en autotest'));
    autotest(params.get('autotest'));
  }
})();

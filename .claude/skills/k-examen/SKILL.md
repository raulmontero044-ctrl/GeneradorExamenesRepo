---
name: k-examen
description: Convierte un examen.json validado (40 preguntas, 5 por tema) en un examen HTML interactivo de modo estudio, autocontenido, para ordenador y móvil, y lo prueba en un navegador real. No genera ni evalúa preguntas. Úsala dentro de /do-examen o para regenerar el HTML de un examen existente.
argument-hint: "<examenId>"
---

# /k-examen

## Propósito

Producir `examenes/<examenId>/examen.html` a partir de `examen.json` y demostrar que funciona. Todo el trabajo es determinista y lo hacen los scripts; esta skill los ejecuta en orden e interpreta los resultados. No lanza subagentes.

## Entradas

- `examenId` (`$ARGUMENTS`). `examenes/<examenId>/examen.json` debe existir.

## Salidas

- `examenes/<examenId>/examen.html`: un único fichero sin dependencias externas (CSS, JS, datos y puntuación incrustados).
- Informe de la prueba en navegador.

## Qué hace el HTML (modo estudio)

1. Muestra una pregunta con sus cuatro opciones, la asignatura, el tema y la dificultad.
2. Se elige una opción y se pulsa «Confirmar respuesta» (o «Dejar en blanco»). Teclado: A-D o 1-4 y Enter.
3. Al confirmar, la respuesta queda **bloqueada** (los botones se desactivan y el estado ignora nuevos clics) y se muestra si es correcta, la respuesta correcta, por qué lo es, por qué cada una de las otras tres no lo es y la sección de la wiki de la que procede.
4. «Siguiente pregunta» hasta la 40; «Terminar examen» (doble pulsación) cuenta las no respondidas como en blanco.
5. Resultado: nota sobre 10, aciertos, errores, en blanco, porcentaje de aciertos, puntuación, temas con errores y preguntas falladas con su explicación.
6. Guardado del resultado: si se sirve con `npm run servidor`, se envía a `historial/resultados/`; abierto como fichero, ofrece descargar el JSON para importarlo con `node tools/historial.mjs importar <fichero>`. No usa `localStorage`.

Puntuación: `tools/lib/puntuacion.mjs` (+1, −0,33, 0; nota = puntuación / 40 × 10 entre 0 y 10), el mismo código en la página, en los tests y en el servidor.

## Procedimiento

```bash
node tools/examen.mjs validar --examen-id <id>
node tools/examen.mjs html --examen-id <id>
node tools/probar-html.mjs --examen-id <id>
```

1. `validar`: si da `EXAMEN NO VÁLIDO`, **detente** y devuelve los errores a quien la invocó. No generes el HTML de un examen inválido (el propio script se niega).
2. `html`: escribe `examen.html`.
3. `probar-html`: abre el HTML en Chrome/Edge sin interfaz con cuatro planes de respuesta (mixto, todo correcto, todo incorrecto, todo en blanco) pulsando los botones reales. Comprueba que se muestran las 40 preguntas, que una respuesta confirmada no puede cambiarse, que aparecen las explicaciones de la correcta y de los tres distractores, y que la nota y las cifras mostradas coinciden con las calculadas de forma independiente. Debe terminar con `HTML FUNCIONAL`.
   - Si no hay navegador, el script lo indica: informa de que la prueba no se ha podido ejecutar. No la des por superada.
   - Con el servidor arrancado, `--url http://localhost:4173` prueba además el guardado en el historial.

## Criterios de aceptación

- [ ] `EXAMEN VÁLIDO`.
- [ ] `examen.html` generado.
- [ ] `HTML FUNCIONAL` en los cuatro planes.

## Informe

```text
Examen: <id>
Validación: VÁLIDO (<n> avisos)
HTML: examenes/<id>/examen.html (<tamaño> KB)
Prueba en navegador: <plan → OK/FALLO (nota)>
```

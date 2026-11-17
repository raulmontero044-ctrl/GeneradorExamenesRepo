---
name: k-corrector
description: Evalúa de forma independiente preguntas tipo test con subagentes evaluador-preguntas (nunca autores de lo que evalúan), documenta y propone correcciones, y selecciona las 5 mejores por tema. Modos seleccion (candidatas de un examen), correccion (preguntas refutadas por el falsador) y auditoria (revisión del banco histórico). Úsala dentro de /do-examen o para revisar el banco.
argument-hint: "<seleccion|correccion|auditoria> [examenId]"
---

# /k-corrector

## Propósito

Ser el filtro de calidad independiente entre la generación y el examen. Los juicios los emiten los subagentes `evaluador-preguntas`; la selección la hace `tools/seleccionar.mjs` (determinista) a partir de esos juicios. Esta skill nunca modifica una pregunta sin dejar constancia: toda corrección queda en `evaluaciones/*.json` y en `examen.json → proceso.correcciones`.

## Reparto de evaluadores

| Evaluador | Temas |
|---|---|
| `ev-1` | prog-08, prog-09 |
| `ev-2` | prog-10, prog-12 |
| `ev-3` | dws-01, dws-02 |
| `ev-4` | dws-03, dws-04 |

Cuatro evaluadores con dos temas cada uno: ≈ 18 candidatas y 2 wikis por contexto, en paralelo. Son agentes distintos de los generadores, de modo que ninguna pregunta la juzga su autor. Cada evaluador recibe solo sus temas.

Lanza cada evaluador con `subagent_type: "evaluador-preguntas"`; si ese tipo no está disponible en la sesión, usa `"general-purpose"` y empieza el prompt con «Lee `.claude/agents/evaluador-preguntas.md` y actúa estrictamente como ese agente».

## Modo `seleccion`

Entrada: `examenId` con `examenes/<id>/trabajo/candidatas.json` y `similitud.json` (de `/k-preguntas`).

1. Si no existe, prepara el banco por evaluador: `node tools/banco.mjs resumen --tema <t> --salida …` para cada tema y júntalos en `trabajo/banco-<evaluador>.json` (o reutiliza `banco-<asignatura>.json` de `/k-preguntas`).
2. Lanza **en un solo mensaje** los 4 evaluadores con: `evaluador`, `temas` (id, título, `dirWiki`), `candidatas`, `similitud`, `banco`, `salida: trabajo/evaluaciones/<evaluador>.json`, `modo: seleccion`.
3. `node tools/seleccionar.mjs comprobar --examen-id <id>`. Si faltan evaluaciones o están mal formadas, relanza solo el evaluador afectado indicándole los errores (máximo 2 veces).
4. `node tools/seleccionar.mjs seleccionar --examen-id <id>`:
   - Excluye `RECHAZADA`, repetidas del banco y `MEJORABLE` sin corrección documentada.
   - Usa la versión corregida de las `MEJORABLE` (registrada en `proceso.correcciones`).
   - Por tema: ordena por puntuación, no admite dos preguntas del mismo grupo de duplicados, máx. 2 fáciles (preferentemente 1), máx. 2 del mismo tipo, al menos 1 difícil.
   - Equilibra la letra correcta (10 A, 10 B, 10 C, 10 D) permutando opciones.
   - Escribe `examen.json` (falsador `PENDIENTE`) y `trabajo/seleccion.json` (reservas por tema).
5. Si termina con `DÉFICIT`, devuelve a quien la invocó los temas y cuántas faltan (`trabajo/deficit.json`): hace falta una ronda de refuerzo de `/k-preguntas` y volver a evaluar solo las nuevas.

## Modo `correccion`

Entrada: `examenId` y el informe del falsador con las preguntas refutadas (`MENTIRA`) o indeterminadas.

Para cada pregunta refutada:

1. Si la refutación afecta a la **respuesta correcta** o a la **unicidad**, sustitúyela por una reserva: `node tools/seleccionar.mjs sustituir --examen-id <id> --quitar <ids> --motivo "<afirmación refutada>"`.
2. Si afecta solo a un **distractor o a una explicación** y hay pocas reservas, lanza un evaluador del tema en modo `correccion` con la pregunta y la evidencia del falsador. Si devuelve `MEJORABLE` con `correccion` y `cambios`, guárdalo en `trabajo/correcciones/<id>.json` como `{ "correccion": …, "cambios": […], "origen": "<evaluador>" }` y aplícalo: `node tools/seleccionar.mjs corregir --examen-id <id> --pregunta <id> --con trabajo/correcciones/<id>.json`.
3. Si no hay reservas compatibles ni corrección válida: informa del déficit (ronda de refuerzo).

Ambas operaciones dejan el falsador en `PENDIENTE`: el examen debe volver a falsarse.

## Modo `auditoria` (revisión del banco)

1. `node tools/banco.mjs verificar` y `node tools/banco.mjs duplicados --salida banco/revisiones/<fecha>-duplicados.json`.
2. Si el banco está vacío, informa y termina.
3. Escribe el banco de cada pareja de temas en `banco/revisiones/<fecha>-entrada-<evaluador>.json` y lanza los evaluadores necesarios en modo `auditoria` (`candidatas` = ese fichero, `banco` = el mismo fichero, para detectar duplicados internos).
4. Redacta `banco/revisiones/<fecha>.md` con una sección por categoría y, en cada pregunta, el motivo y la corrección propuesta:
   - Duplicadas (de `duplicados` y `duplicadaDe`).
   - Ambiguas (`sinAmbiguedad = false` o `unicaCorrecta = false`).
   - Respuestas incorrectas (`correctaVerdadera = false` o `distractoresFalsos = false`).
   - Desactualizadas (`desactualizada = true` o avisos de `verificar`).
   - Fuera del temario (`respaldoWiki = false`).
   - Explicaciones deficientes (`explicacionesCorrectas = false`).
5. **No modifiques ni borres** `banco/preguntas.jsonl`. Las acciones sobre el histórico requieren autorización expresa del usuario.

## Criterios de aceptación

- [ ] Cada pregunta evaluada lo ha sido por un evaluador que no la escribió y `comprobar` da `EVALUACIONES COMPLETAS`.
- [ ] Ninguna pregunta llega al examen con un criterio incumplido sin corrección documentada.
- [ ] `examen.json` tiene 40 preguntas, 5 por tema, falsador `PENDIENTE`.

## Informe

```text
Modo: <modo>
Evaluadas: <n> — ACEPTADA <n>, MEJORABLE <n>, RECHAZADA <n>
Motivos principales de rechazo: <lista>
Correcciones aplicadas: <id → resumen de cambios>
Selección: <tema → ids> | DÉFICIT <tema → n>
```

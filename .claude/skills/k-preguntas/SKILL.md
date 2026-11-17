---
name: k-preguntas
description: Genera preguntas candidatas tipo test (A-D, una correcta) por competición entre varios subagentes generador-preguntas independientes que trabajan solo sobre la wiki del temario y evitan el banco histórico. Produce el conjunto de candidatas que después evalúa /k-corrector. Úsala dentro de /do-examen o para obtener candidatas de temas concretos.
argument-hint: "<examenId> [temas separados por comas, opcional]"
---

# /k-preguntas

## Propósito

Obtener, para cada tema, candidatas de **varios autores independientes** para que `/k-corrector` las compare y elija las mejores. Esta skill no evalúa ni selecciona: coordina a los generadores y valida su salida con `tools/candidatas.mjs`.

## Entradas

- `examenId` (obligatorio): p. ej. `EX-20261117-1`. Si se invoca sola y no se da, usa `EX-<AAAAMMDD>-<n>` con el primer `n` libre en `examenes/`.
- Temas (opcional): por defecto los 8 de `config/temario.json`.
- Desde `/do-examen` en una ronda de refuerzo: temas con déficit y número de preguntas que faltan.

## Salidas

En `examenes/<examenId>/trabajo/`:

- `banco-<asignatura>.json`: preguntas del banco que los generadores deben evitar.
- `candidatas/<generador>.json`: un fichero por generador.
- `candidatas.json`: todas las candidatas válidas con `id`, y las inválidas con sus errores.
- `similitud.json`: parecidos de cada candidata con el banco y con las demás candidatas.

## Diseño de la competición

| Parámetro | Valor | Motivo |
|---|---|---|
| Generadores | 6 (3 por asignatura) | 3 autores por tema dan competición real y diversidad; más autores aumentan el coste sin mejorar mucho la selección. |
| Temas por generador | los 4 de su asignatura | ≈ 40-70 KB de wiki: cabe con holgura en un contexto. |
| Preguntas por tema y generador | 3 | 9 candidatas por tema para elegir 5, con margen para rechazos. |
| Enfoques | `relaciones-y-diferencias`, `funcionamiento-y-escenarios`, `precision-conceptual` | Cada uno de los 3 generadores de una asignatura recibe uno distinto: evita propuestas clónicas y cubre los 6 tipos. |

Identificadores: `gen-prog-1..3`, `gen-dws-1..3` (el número corresponde al enfoque en el orden de la tabla).

## Procedimiento

### 1. Preparar

```bash
mkdir -p examenes/<examenId>/trabajo/candidatas
node tools/banco.mjs resumen --asignatura prog --salida examenes/<examenId>/trabajo/banco-prog.json
node tools/banco.mjs resumen --asignatura dws  --salida examenes/<examenId>/trabajo/banco-dws.json
```

Si el banco está vacío, los ficheros contienen `[]`.

### 2. Lanzar generadores en paralelo

En **un solo mensaje**, 6 llamadas `Agent` con `subagent_type: "generador-preguntas"`. Si ese tipo no está disponible en la sesión, usa `subagent_type: "general-purpose"` y empieza el prompt con «Lee `.claude/agents/generador-preguntas.md` y actúa estrictamente como ese agente».

Cada prompt contiene solo: `generador`, `temas` (id, asignatura, título y `dirWiki` de `config/temario.json`), `preguntasPorTema: 3`, `enfoque`, `banco` (el fichero de su asignatura), `salida` (`trabajo/candidatas/<generador>.json`) y `fecha` (ISO). No incluyas preguntas de otros generadores: deben trabajar a ciegas entre sí.

En una ronda de refuerzo (desde `/do-examen`): lanza solo 2 generadores por tema con déficit, con enfoques distintos de los usados, `preguntasPorTema` = déficit + 2, y añade al `banco` las candidatas ya rechazadas o seleccionadas de ese tema para que no las repitan.

### 3. Reunir y validar

```bash
node tools/candidatas.mjs reunir examenes/<examenId>/trabajo/candidatas \
  --salida examenes/<examenId>/trabajo/candidatas.json \
  --similitud examenes/<examenId>/trabajo/similitud.json
```

- Si un generador no ha entregado su fichero o falló: relánzalo una vez. Si vuelve a fallar, continúa con los demás y anótalo.
- Si un tema tiene menos de 7 candidatas válidas y no idénticas al banco: haz una ronda de refuerzo para ese tema (máximo 2 rondas en total).

## Criterios de aceptación

- [ ] Se lanzaron los generadores en paralelo, cada uno con un enfoque distinto dentro de su asignatura.
- [ ] `candidatas.json` existe y cada tema tiene ≥ 7 candidatas válidas de al menos 2 autores distintos.
- [ ] Ninguna candidata se ha editado a mano en esta fase: las correcciones son trabajo de `/k-corrector` y quedan registradas allí.

## Errores

- Wiki inválida (`node tools/wiki.mjs comprobar` falla): no generes; informa y remite a `/k-temario`.
- Tras 2 rondas de refuerzo un tema sigue sin 7 candidatas: informa del tema y del número disponible; `/do-examen` decide.

## Informe

```text
Examen: <examenId>
Generadores: <id → nº preguntas válidas / inválidas>
Por tema: <tema → válidas (autores)>
Idénticas al banco descartadas: <n>
Rondas de refuerzo: <n y temas>
```

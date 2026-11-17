# Arquitectura del generador de exámenes

Sistema de generación de exámenes tipo test (40 preguntas, A–D, una correcta) basado exclusivamente en el temario oficial de cesguiro.es, construido con **skills** y **subagentes** de Claude Code y **scripts Node.js** sin dependencias para todo lo que debe ser determinista.

## 1. Principios

1. **Lo que se puede comprobar con código, se comprueba con código.** Recuento de preguntas, distribución por tema, formato, puntuación, escritura del historial y registro en el banco son scripts (`tools/`) con tests (`tests/`). Los modelos solo hacen lo que requiere juicio: redactar la wiki, escribir preguntas, evaluarlas y falsarlas.
2. **Cada skill tiene una responsabilidad.** `/do-examen` coordina y delega; no redacta preguntas ni evalúa.
3. **Ningún autor es su propio juez.** Generadores, evaluadores y falsador son subagentes distintos con contextos separados.
4. **Nada se pierde.** Banco y resultados son *append-only*; la wiki se actualiza de forma incremental y con historial.
5. **Fidelidad al temario.** La wiki deriva de la copia literal de las fuentes (`wiki/_fuentes/`); toda pregunta cita la sección de la wiki que la respalda y el validador comprueba que esa sección existe.

## 2. Mapa de componentes

```
/do-examen  (coordinador, hilo principal)
 ├─ 1. Generar examen
 │    ├─ tools/wiki.mjs comprobar ........... ¿wiki válida? si no → /k-temario
 │    ├─ /k-preguntas ─── 6 × agente generador-preguntas (paralelo, competición)
 │    ├─ /k-corrector ─── 4 × agente evaluador-preguntas (paralelo, independientes)
 │    │                   └─ tools/seleccionar.mjs (elige 5 por tema)
 │    ├─ falsador ─────── 2 × falsador modo contenido + 1 × falsador modo sistema
 │    │                   └─ rechazo → sustitución/corrección → nueva falsación (máx. 3 rondas)
 │    ├─ /k-examen ────── tools/examen.mjs (valida + genera HTML)
 │    └─ tools/banco.mjs registrar
 ├─ 2. Actualizar wiki → /k-temario
 │    ├─ tools/wiki.mjs sincronizar (descarga, diff por secciones)
 │    └─ N × agente redactor-wiki (solo temas con cambios)
 └─ 3. Revisar banco → /k-corrector modo auditoría (+ tools/banco.mjs duplicados)
```

## 3. Estructura de carpetas

| Ruta | Contenido |
|---|---|
| `.claude/skills/<skill>/SKILL.md` | Las cinco skills. |
| `.claude/agents/*.md` | Subagentes: `redactor-wiki`, `generador-preguntas`, `evaluador-preguntas`, `falsador`. |
| `config/temario.json` | Temas, URLs y distribución (5 por tema, 40 total). Fuente única. |
| `wiki/` | Wiki persistente (ver `wiki/README.md`). |
| `wiki/_fuentes/` | Copia literal (`export_raw` de DokuWiki) de cada tema y `estado.json` con huellas por sección. |
| `banco/preguntas.jsonl` | Banco histórico, una pregunta usada por línea. Solo se añade. |
| `banco/revisiones/` | Informes de revisión del banco. |
| `examenes/<examenId>/` | `examen.json`, `examen.html` y la traza del proceso (`trabajo/`). |
| `historial/resultados/<examenId>/` | Un JSON por intento; nunca se sobrescribe. |
| `tools/` | Scripts Node.js (sin dependencias). |
| `tests/` | `node --test`. |

## 4. Modelo de datos

### 4.1 Pregunta

```json
{
  "id": "prog-08-3f2a9c1d",
  "asignatura": "prog",
  "tema": "prog-08",
  "enunciado": "…",
  "opciones": { "A": "…", "B": "…", "C": "…", "D": "…" },
  "correcta": "B",
  "explicacionCorrecta": "Por qué B es correcta.",
  "explicacionesDistractores": { "A": "…", "C": "…", "D": "…" },
  "dificultad": "facil | media | dificil",
  "tipo": "definicion | diferencias | ventajas-inconvenientes | funcionamiento-interno | situacion-practica | afirmaciones",
  "wikiRef": [{ "archivo": "wiki/programacion/tema-08-arquitectura/contenido.md", "seccion": "4. Gestión de dependencias: DI e IoC" }],
  "conocimiento": "Frase que resume el conocimiento exacto evaluado (para detectar repeticiones semánticas).",
  "autor": "generador-prog-1",
  "fechaCreacion": "2026-11-17T10:00:00.000Z"
}
```

El `id` es `<tema>-<8 hex>` derivado de la huella del enunciado normalizado.

### 4.2 Examen (`examenes/<examenId>/examen.json`)

`{ "id", "fechaCreacion", "preguntas": [40 × Pregunta], "proceso": { candidatas, aceptadas, rondasFalsador, … } }`

### 4.3 Banco (`banco/preguntas.jsonl`)

Pregunta + `fechaUso` + `examenId`. Una línea por pregunta. `tools/banco.mjs registrar` se niega a registrar un `id` o un enunciado normalizado ya presente.

### 4.4 Resultado (`historial/resultados/<examenId>/<fecha>-<aleatorio>.json`)

`examenId`, `intentoId`, `fechaHora`, `nota`, `puntuacion`, `aciertos`, `errores`, `enBlanco`, `porcentajeAciertos`, `respuestas[]` (pregunta, asignatura, tema, seleccionada, correcta, resultado), `preguntasFalladas[]`, `temasConErrores[]`. El servidor recalcula la puntuación y rechaza resultados incoherentes; los ficheros se abren con la marca `wx` (fallo si ya existen).

## 5. Puntuación

Acierto +1, error −0,33, blanco 0. `nota = clamp((puntuación / 40) × 10, 0, 10)`, redondeada a 2 decimales al mostrarse. Implementada una sola vez en `tools/lib/puntuacion.mjs` e incrustada en el HTML, para que tests y página usen el mismo código.

## 6. Diseño por skill

### 6.1 `/do-examen` (coordinador)

- **Responsabilidad:** mostrar las tres operaciones y orquestarlas delegando en las demás skills y agentes. No redacta, evalúa ni falsa.
- **Entradas:** `$ARGUMENTS` opcional (`generar`, `wiki`, `banco`); si falta, pregunta con `AskUserQuestion`.
- **Salidas:** examen listo en `examenes/<id>/examen.html`, preguntas registradas en el banco e informe final; o informe de wiki/banco.
- **Dependencias:** `/k-temario`, `/k-preguntas`, `/k-corrector`, `/k-examen`, agente `falsador`, `tools/*.mjs`.
- **Criterios de aceptación:** 40 preguntas, 5 por tema, falsador APROBADO en la última ronda, `examen.mjs validar` sin errores, HTML generado y su prueba headless superada, banco actualizado.
- **Errores:** cualquier fase fallida detiene el flujo con diagnóstico y propuesta; nunca se registra en el banco un examen no aprobado; si faltan preguntas nuevas para un tema lo comunica y no repite.

### 6.2 `/k-temario` (wiki)

- **Responsabilidad:** construir y mantener la wiki incrementalmente.
- **Entradas:** fuentes de `config/temario.json`; opcionalmente una lista de temas.
- **Salidas:** `wiki/**` actualizada, `wiki/CHANGELOG.md` y la sección de historial de cada tema.
- **Dependencias:** `tools/wiki.mjs`, agente `redactor-wiki`.
- **Subagentes:** un `redactor-wiki` por tema con cambios, en paralelo.
- **Aceptación:** `tools/wiki.mjs comprobar` sin errores; cada sección de la fuente tiene su sección en `contenido.md`; sin cambios en la fuente no se modifican ficheros.
- **Errores:** fuente no disponible → se conserva la versión anterior y se anota en el historial; el tema no se marca como revisado.

### 6.3 `/k-preguntas` (generación por competición)

- **Responsabilidad:** obtener candidatas de varios autores independientes por tema.
- **Entradas:** examenId, temas (por defecto los 8), número por generador, preguntas a evitar (resumen del banco por tema).
- **Salidas:** `examenes/<id>/trabajo/candidatas/<generador>.json` validados con `tools/examen.mjs candidatas`.
- **Subagentes:** 6 `generador-preguntas` en paralelo: 3 por asignatura, cada uno con los 4 temas de su asignatura y 3 preguntas por tema (9 candidatas por tema y 3 autores distintos). Cada uno recibe un enfoque distinto para diversificar. Se eligió así porque los 4 temas de una asignatura caben con holgura en un contexto (≈60 KB de wiki) y 3 autores dan competición real sin disparar el coste.
- **Aceptación:** cada fichero pasa la validación de esquema; cada tema tiene ≥ 7 candidatas válidas (si no, ronda adicional solo para ese tema).

### 6.4 `/k-corrector` (evaluación y selección)

- **Responsabilidad:** evaluar candidatas de forma independiente, proponer correcciones explícitas y seleccionar las 5 mejores por tema.
- **Entradas:** candidatas, wiki, banco.
- **Salidas:** `trabajo/evaluaciones/<evaluador>.json`, `trabajo/seleccion.json`, `examen.json` (borrador).
- **Subagentes:** 4 `evaluador-preguntas` en paralelo, uno por pareja de temas. Ninguno es autor de lo que evalúa.
- **Selección:** `tools/seleccionar.mjs` (determinista): descarta RECHAZADA y duplicadas, ordena por puntuación, respeta la mezcla de dificultad y tipos, equilibra la letra correcta permutando opciones.
- **Modo auditoría:** revisa el banco completo y escribe `banco/revisiones/<fecha>.md` sin borrar nada.

### 6.5 `falsador` (agente, adaptado de `code-falsador.md`)

- **Responsabilidad:** buscar afirmaciones falsas. Modo `contenido`: cada pregunta (respuesta correcta verdadera, distractores falsos, explicaciones, pertenencia al temario) contra la wiki. Modo `sistema`: afirmaciones sobre el examen (40, 5 por tema, sin duplicados, HTML funcional, puntuación, historial) contra la ejecución real de los scripts y tests.
- **Veredicto:** `MENTIRA`, `NO DETECTADA`, `INDETERMINADA` por línea; el examen solo se aprueba si todas las líneas son `NO DETECTADA`.

### 6.6 `/k-examen` (HTML)

- **Responsabilidad:** convertir `examen.json` validado en un HTML autocontenido de modo estudio.
- **Dependencias:** `tools/examen.mjs`, `tools/lib/puntuacion.mjs`.
- **Aceptación:** validación sin errores y prueba headless (`tools/probar-html.mjs`) que contesta el examen y comprueba la puntuación mostrada.

### 6.7 Historial

`tools/servidor.mjs` sirve los exámenes y recibe `POST /api/resultados`. Si el HTML se abre sin servidor, ofrece descargar el JSON y `tools/historial.mjs importar` lo incorpora. `tools/historial.mjs listar|ver|estadisticas` permite consultar.

## 7. Rondas y límites

- Falsador: máximo 3 rondas. En cada rechazo se sustituye la pregunta por la siguiente mejor candidata del tema o se aplica la corrección propuesta; ambas vuelven a falsarse. Si tras 3 rondas no hay aprobado, se detiene y se informa.
- Si un tema no reúne 5 preguntas válidas y no repetidas: ronda extra de generación para ese tema (máximo 2). Si sigue faltando, se comunica y no se genera el examen.

---
name: do-examen
description: Coordinador del generador de exámenes tipo test (Programación temas 8, 9, 10, 12 y DWS temas 1-4). Ofrece tres operaciones - generar un examen de 40 preguntas (5 por tema) sin repetir preguntas anteriores, actualizar la wiki del temario o revisar el banco de preguntas - y las delega en /k-temario, /k-preguntas, /k-corrector, /k-examen y el agente falsador.
argument-hint: "[generar | wiki | banco]"
disable-model-invocation: true
---

# /do-examen

## Propósito

Ser el único punto de entrada del sistema. Esta skill **coordina y delega**: no redacta wiki, no escribe ni evalúa preguntas, no falsa y no construye HTML. Cada fase la hace la skill o el agente responsable, y las decisiones de paso se toman con la salida de los scripts de `tools/`, no con impresiones.

Las skills se invocan con la herramienta `Skill` (`k-temario`, `k-preguntas`, `k-corrector`, `k-examen`) y se siguen sus instrucciones en este mismo hilo, que es el que lanza los subagentes.

## Operación

Si `$ARGUMENTS` es `generar`, `wiki` o `banco`, ejecuta esa operación. Si no, pregunta con `AskUserQuestion`:

- **Generar un examen**: 40 preguntas nuevas, 5 por tema, verificadas por el falsador, en HTML de modo estudio.
- **Actualizar la wiki**: comprueba las fuentes oficiales y actualiza solo lo que haya cambiado.
- **Revisar el banco de preguntas**: busca duplicadas, ambiguas, incorrectas, desactualizadas, fuera del temario o mal explicadas, sin borrar nada.

No empieces ninguna fase hasta conocer la operación.

---

## Operación 1: Generar un examen

Usa `TaskCreate`/`TodoWrite` si está disponible para seguir las fases. Si una fase falla, **detente**: informa de qué ha fallado, con la salida del script, y propone una solución. No continúes como si hubiera ido bien.

### Fase 1. Wiki

```bash
node tools/wiki.mjs comprobar
```

Si no da `WIKI VÁLIDA`, muestra los errores y pregunta con `AskUserQuestion` si actualizar la wiki ahora (operación 2) o cancelar. No generes preguntas sobre una wiki inválida.

### Fase 2. Banco e identificador

```bash
node tools/banco.mjs verificar
node tools/banco.mjs estadisticas
```

- `BANCO CON ERRORES` → detente (el banco no es fiable para evitar repeticiones).
- `examenId` = `EX-<AAAAMMDD>-<n>`, con el primer `n` (desde 1) cuya carpeta no exista en `examenes/`. Crea `examenes/<examenId>/trabajo/`.

### Fase 3. Candidatas (competición)

Invoca `k-preguntas` con `examenId`. Resultado: `trabajo/candidatas.json` y `trabajo/similitud.json`.

### Fase 4. Evaluación y selección

Invoca `k-corrector` en modo `seleccion` con `examenId`. Resultado: `examen.json` (falsador `PENDIENTE`) y `trabajo/seleccion.json`.

Si termina con **déficit** en algún tema (no hay 5 preguntas válidas y no repetidas):

1. Ronda de refuerzo: `k-preguntas` solo para esos temas (modo refuerzo), y `k-corrector` evaluando solo las candidatas nuevas (salida `trabajo/evaluaciones/<evaluador>-refuerzo-<n>.json`); después repite `node tools/candidatas.mjs reunir …`, `seleccionar.mjs comprobar` y `seleccionar.mjs seleccionar`.
2. Máximo 2 rondas de refuerzo. Si sigue faltando, **no repitas preguntas para completar**: informa al usuario de qué temas no tienen suficientes preguntas nuevas y cuántas faltan, y detente.

### Fase 5. Comprobaciones previas y HTML provisional

Invoca `k-examen` con `examenId` (`validar` → `html` → `probar-html`). Debe dar `EXAMEN VÁLIDO` (40 preguntas, 5 por tema, sin repetidas) y `HTML FUNCIONAL`. El falsador necesita este HTML para verificar el sistema.

### Fase 6. Falsador (obligatorio, máximo 3 rondas)

El falsador es `.claude/agents/falsador.md`. No lo sustituyas por otro evaluador ni lo omitas.

1. `node tools/falsacion.mjs preparar --examen-id <id>` → crea `trabajo/falsador/ronda-<n>/` con `contenido-prog.jsonl`, `contenido-dws.jsonl`, `sistema.jsonl` y `banco-<asignatura>.json`.
2. Lanza **en un solo mensaje** tres agentes con `subagent_type: "falsador"` (si no está disponible: `"general-purpose"` con «Lee `.claude/agents/falsador.md` y actúa estrictamente como ese agente»):
   - `modo: contenido`, `lineas: …/contenido-prog.jsonl`, `examen: examenes/<id>/examen.json`, `banco: …/banco-prog.json`
   - `modo: contenido`, `lineas: …/contenido-dws.jsonl`, `examen: …`, `banco: …/banco-dws.json`
   - `modo: sistema`, `lineas: …/sistema.jsonl`
   Pide a cada uno que responda solo con el formato de salida del agente.
3. Guarda la respuesta **íntegra y sin editar** de cada agente en `ronda-<n>/informe-<nombre>.txt` (`informe-contenido-prog.txt`, `informe-contenido-dws.txt`, `informe-sistema.txt`).
4. `node tools/falsacion.mjs registrar --examen-id <id>`: calcula el veredicto a partir de las líneas y lo anota en `examen.json`.
   - `APROBADO` → fase 7.
   - `RECHAZADO` por preguntas (`MENTIRA` o `INDETERMINADA`) → invoca `k-corrector` en modo `correccion` con las preguntas y la evidencia; vuelve a la fase 5 y a una nueva ronda del falsador.
   - `RECHAZADO` por una afirmación de **sistema** o por `PROBLEMA` (informe incompleto) → no es un defecto de las preguntas: diagnostica la causa (ejecuta tú la comprobación indicada), corrígela si es del examen o relanza el falsador si el informe estaba incompleto. Si es un fallo de las herramientas, detente e informa.
5. Si tras 3 rondas no hay `APROBADO`, `preparar` se negará a abrir otra: detente e informa de las afirmaciones refutadas.

### Fase 7. HTML definitivo

```bash
node tools/examen.mjs html --examen-id <id>
node tools/probar-html.mjs --examen-id <id>
```

Regenera el HTML desde el `examen.json` aprobado y vuelve a probarlo (`HTML FUNCIONAL`).

### Fase 8. Registro en el banco

```bash
node tools/banco.mjs registrar examenes/<id>/examen.json
```

El banco solo acepta exámenes `APROBADO` cuya huella coincida con la aprobada. Si se niega, detente: el examen se ha modificado después de la falsación.

### Fase 9. Informe

```text
Examen: <id> — examenes/<id>/examen.html
Para hacerlo: npm run servidor → http://localhost:4173/examenes/<id>/examen.html
Candidatas: <n> de <generadores> generadores · evaluadas <n> (ACEPTADA/MEJORABLE/RECHAZADA)
Seleccionadas: 40 (5 por tema) · dificultad facil/media/dificil · tipos
Correcciones documentadas: <n> · sustituciones: <n>
Falsador: <rondas> ronda(s) → APROBADO
Banco: <total> preguntas tras registrar
Ficheros nuevos o modificados: examenes/<id>/…, banco/preguntas.jsonl
```

No hagas commits: indica al usuario qué ficheros han cambiado. Si quiere versionarlos, se hace en una rama `feature/*` creada desde `develop` (nunca en `main`).

---

## Operación 2: Actualizar la wiki

Invoca `k-temario` (con los temas de `$ARGUMENTS` si se indican) y muestra su informe. Si la wiki no tenía cambios, dilo así.

---

## Operación 3: Revisar el banco de preguntas

Invoca `k-corrector` en modo `auditoria`. Muestra el resumen por categoría (duplicadas, ambiguas, respuestas incorrectas, desactualizadas, fuera del temario, explicaciones deficientes) y la ruta del informe en `banco/revisiones/`.

**No modifiques ni borres** `banco/preguntas.jsonl`. Si el usuario quiere actuar sobre alguna pregunta, pide autorización expresa y explica la consecuencia (el banco es la memoria que evita repeticiones).

---

## Gestión de errores

| Situación | Acción |
|---|---|
| Wiki inválida | Ofrecer `/k-temario`; no generar |
| Banco con errores | Detener; informar de las líneas afectadas |
| Generador o evaluador sin entregar | Relanzarlo una vez; después continuar sin él y anotarlo |
| Déficit tras 2 refuerzos | Informar de temas y número; no repetir preguntas |
| `EXAMEN NO VÁLIDO` | No falsar ni generar HTML; corregir la causa (selección) |
| Falsador `RECHAZADO` | Corregir o sustituir y volver a falsar (máx. 3 rondas) |
| Navegador no disponible | La prueba del HTML no puede hacerse: informar y no declarar el examen verificado |
| `registrar` del banco falla | Detener; nunca forzar el registro |

## Criterios de aceptación de la operación 1

- [ ] `WIKI VÁLIDA` antes de generar.
- [ ] Candidatas de varios generadores en paralelo y evaluadas por agentes distintos.
- [ ] `EXAMEN VÁLIDO`: 40 preguntas, 5 por tema, sin repetidas.
- [ ] `falsacion.mjs registrar` → `APROBADO` en la última ronda.
- [ ] `HTML FUNCIONAL` sobre el HTML definitivo.
- [ ] Preguntas registradas en el banco.

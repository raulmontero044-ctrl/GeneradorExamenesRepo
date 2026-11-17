# Banco histórico de preguntas

`preguntas.jsonl` guarda, una por línea, **todas las preguntas que han salido en algún examen**. Su objetivo es que ninguna se repita, tampoco reformulada.

## Reglas

- Solo se añade (`node tools/banco.mjs registrar examenes/<id>/examen.json`). Nunca se editan ni se borran líneas sin autorización expresa del usuario.
- Solo se registran exámenes con `falsador.veredicto = "APROBADO"`. El registro es todo o nada: si una pregunta ya existe (mismo `id`, mismo enunciado normalizado o idéntica con opciones reordenadas), no se registra ninguna.
- La revisión del banco (`/do-examen` → «Revisar banco») deja sus informes en `revisiones/` y no modifica `preguntas.jsonl`.

## Campos de cada línea

`id`, `asignatura`, `tema`, `enunciado`, `opciones` (A-D), `correcta`, `explicacionCorrecta`, `explicacionesDistractores`, `dificultad`, `tipo`, `wikiRef`, `conocimiento`, `autor`, `fechaCreacion`, `fechaUso`, `examenId`.

## Detección de repeticiones

1. **Automática** (`tools/lib/similitud.mjs`): enunciado normalizado idéntico, mismas opciones con la misma respuesta en otro orden (`identica`), y parecido léxico de enunciado, opciones o conocimiento evaluado (`similar`/`revisar`).
2. **Semántica** (`evaluador-preguntas`): recibe el banco del tema y los parecidos marcados y decide si la candidata evalúa el mismo conocimiento con otra formulación (`noRepetida = false` → descartada).

## Comandos

```bash
node tools/banco.mjs estadisticas
node tools/banco.mjs resumen --asignatura prog --salida f.json
node tools/banco.mjs comparar candidatas.json
node tools/banco.mjs duplicados
node tools/banco.mjs verificar
```

# Historial de resultados

Cada vez que se termina un examen se guarda **un fichero JSON nuevo**:

```
historial/resultados/<examenId>/<fechaHora>-<intento>.json
```

## Garantías

- Nunca se sobrescribe un intento: el fichero se crea con la marca `wx` (falla si existe) y un `intentoId` repetido se rechaza (409).
- El servidor no se fía del navegador: recalcula aciertos, errores, blancos, puntuación y nota a partir del examen y de las respuestas seleccionadas, y rechaza (400) cualquier resultado que no coincida.
- Los resultados se conservan indefinidamente. Solo se borran si el usuario lo pide expresamente.

## Contenido de cada intento

`examenId`, `intentoId`, `fechaHora`, `guardadoEn`, `nota`, `puntuacion`, `aciertos`, `errores`, `enBlanco`, `porcentajeAciertos`, `total`, `respuestas[]` (`preguntaId`, `asignatura`, `tema`, `seleccionada`, `correcta`, `resultado`), `preguntasFalladas[]` y `temasConErrores[]`.

## Uso

```bash
npm run servidor                          # http://localhost:4173 → los resultados se guardan solos
node tools/historial.mjs listar [--examen-id EX-…]
node tools/historial.mjs ver <intentoId | ruta>
node tools/historial.mjs estadisticas     # nota media, mejor nota y aciertos/errores por tema
node tools/historial.mjs importar <resultado.json>   # si se hizo el examen abriendo el HTML sin servidor
```

---
name: k-temario
description: Construye y mantiene de forma incremental la wiki del temario (Programación temas 8, 9, 10, 12 y DWS temas 1-4) a partir de las fuentes oficiales de cesguiro.es. Detecta secciones nuevas, modificadas y eliminadas, actualiza solo lo afectado mediante subagentes redactor-wiki y registra los cambios. Úsala para crear o actualizar la wiki.
argument-hint: "[temas separados por comas, opcional: prog-08,dws-02]"
---

# /k-temario

## Propósito

Mantener `wiki/` fiel a las fuentes oficiales con el mínimo de cambios. Esta skill coordina; la redacción la hacen los subagentes `redactor-wiki` y la detección de cambios la hace `tools/wiki.mjs` (determinista).

## Entradas

- `$ARGUMENTS` (opcional): ids de tema separados por comas. Por defecto, los 8 de `config/temario.json`.

## Salidas

- `wiki/**` actualizada (solo los temas con cambios), `wiki/_fuentes/` y `estado.json` al día, entrada en `wiki/CHANGELOG.md`.
- Informe final (ver «Informe»).

## Procedimiento

### 1. Detectar cambios

```bash
node tools/wiki.mjs sincronizar --salida wiki/_sincronizacion/<AAAA-MM-DD> [--temas <ids>]
node tools/wiki.mjs comprobar
```

Lee `wiki/_sincronizacion/<fecha>/informe.json`. Para cada tema decide:

| Estado del informe | Wiki del tema | Acción |
|---|---|---|
| `nuevo` | — | `redactor-wiki` modo `completo` con la fuente descargada |
| `modificado` / `reordenado` | existe | `redactor-wiki` modo `incremental` con `cambios`, `fuente` (descargada) y `fuenteAnterior` (`wiki/_fuentes/<id>.txt`) |
| `sin-cambios` | válida | nada |
| `sin-cambios` | con errores en `comprobar` | `redactor-wiki` modo `completo` (o con `errores`) usando `wiki/_fuentes/<id>.txt` |
| `no-disponible` | — | no tocar el tema; anotarlo en `CHANGELOG.md` y en el informe |

Si todos los temas están `sin-cambios` y `comprobar` da `WIKI VÁLIDA`: informa «Sin cambios en las fuentes; la wiki no se ha modificado», borra `wiki/_sincronizacion/<fecha>` y termina **sin escribir ningún fichero**.

### 2. Redactar en paralelo

Lanza **en un mismo mensaje** una llamada `Agent` por tema afectado, con `subagent_type: "redactor-wiki"`. Si ese tipo no está disponible en la sesión (p. ej. el agente se creó tras abrirla), usa `subagent_type: "general-purpose"` e incluye al inicio del prompt: «Lee `.claude/agents/redactor-wiki.md` y actúa estrictamente como ese agente».

Cada prompt contiene solo lo que el agente necesita: `modo`, `tema` (id, título, asignatura, URL), `fuente`, `fuenteAnterior` y `cambios` si aplica, `carpeta` (`dirWiki` del tema en `config/temario.json`) y `fecha`. No pases el contenido de otros temas.

### 3. Aplicar y comprobar

1. Ejecuta `node tools/wiki.mjs aplicar --desde wiki/_sincronizacion/<fecha>` (avanza las copias solo de los temas redactados).
2. Ejecuta `node tools/wiki.mjs comprobar`.
3. Si hay errores en un tema, relanza su `redactor-wiki` con `errores` (máximo 2 reintentos por tema). Si persisten, detente e informa: no declares la wiki válida.
4. Revisa por muestreo cada tema redactado: abre la fuente y `contenido.md` y comprueba 3 secciones al azar (fidelidad y que no sea un resumen pobre). Anota lo revisado.

### 4. Relaciones e índice

1. Si algún tema ha cambiado, lanza un `redactor-wiki` en modo `relaciones` para actualizar `wiki/relaciones.md`.
2. Actualiza tú la columna «Última revisión» del índice de `wiki/README.md` para los temas redactados.
3. Añade al principio de `wiki/CHANGELOG.md` una entrada:

```markdown
## AAAA-MM-DD
- prog-08: modificado — secciones modificadas: «…»; nuevas: «…»; eliminadas: «…»
- dws-02: fuente no disponible (HTTP 503); se conserva la versión del AAAA-MM-DD
```

4. Borra `wiki/_sincronizacion/<fecha>` (no se versiona).

## Criterios de aceptación

- [ ] `node tools/wiki.mjs comprobar` termina con `WIKI VÁLIDA`.
- [ ] Solo se han modificado los temas con cambios (verifícalo con `git status --short wiki/`).
- [ ] Cada tema redactado tiene una fila nueva en su Historial y la entrada en `CHANGELOG.md`.
- [ ] Ningún tema no disponible ha perdido contenido.

## Informe

```text
Temas comprobados: <n>
Sin cambios: <ids>
Actualizados: <id>: <nuevas/modificadas/eliminadas>
No disponibles: <id>: <error>
Comprobación de la wiki: VÁLIDA | NO VÁLIDA (<errores>)
Revisión por muestreo: <tema → secciones revisadas → conclusión>
```

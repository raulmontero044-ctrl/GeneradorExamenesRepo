# Manual de uso

## Requisitos

- [Claude Code](https://code.claude.com) abierto en la raíz del repositorio.
- Node.js 22 o superior (sin dependencias: no hace falta `npm install`).
- Chrome o Edge instalado para la prueba automática del HTML (variable `CHROME` si está en una ruta no estándar).
- Conexión a internet solo para actualizar la wiki.

## `/do-examen`

Punto de entrada único. Sin argumentos pregunta qué hacer; también acepta `generar`, `wiki` o `banco`.

### 1. Generar un examen

```
/do-examen generar
```

Fases (cada una se detiene si falla, explicando el motivo):

1. Comprueba la wiki (`node tools/wiki.mjs comprobar`). Si no es válida, ofrece actualizarla.
2. Verifica el banco y asigna el identificador `EX-AAAAMMDD-n`.
3. `/k-preguntas`: 6 generadores compiten en paralelo (3 por asignatura, enfoques distintos) → ~72 candidatas.
4. `/k-corrector`: 4 evaluadores independientes juzgan cada candidata; `seleccionar.mjs` elige 5 por tema.
5. `/k-examen`: valida (40 preguntas, 5 por tema, sin repetidas), genera el HTML y lo prueba en el navegador.
6. Falsador: 3 agentes en paralelo (contenido Programación, contenido DWS, sistema). Si rechaza, se corrigen o sustituyen las preguntas y se vuelve a falsar (máximo 3 rondas).
7. HTML definitivo y nueva prueba.
8. Registro de las 40 preguntas en `banco/preguntas.jsonl`.

Resultado: `examenes/<id>/examen.html`, con toda la traza del proceso en `examenes/<id>/trabajo/`.

Si no hay suficientes preguntas nuevas en algún tema tras dos rondas de refuerzo, el sistema lo dice y **no** repite preguntas.

### 2. Actualizar la wiki

```
/do-examen wiki          (o directamente /k-temario [prog-08,dws-02])
```

Descarga las fuentes oficiales, las compara sección a sección con la copia guardada y solo redacta los temas con cambios. Si no hay cambios, no toca ningún fichero. El historial queda en `wiki/CHANGELOG.md` y en el README de cada tema.

### 3. Revisar el banco

```
/do-examen banco
```

Informe en `banco/revisiones/<fecha>.md` con duplicadas, ambiguas, respuestas incorrectas, desactualizadas, fuera del temario y explicaciones deficientes. No borra ni modifica el banco.

## Hacer un examen

```bash
npm run servidor
```

Abre `http://localhost:4173`, elige el examen y contesta. Cada pregunta se confirma (o se deja en blanco) y en ese momento se muestran la respuesta correcta, por qué lo es y por qué las otras tres no. Una respuesta confirmada no se puede cambiar. Al terminar se muestran la nota, aciertos, errores, en blanco, porcentaje, preguntas falladas y temas con errores, y el resultado se guarda en `historial/resultados/`.

Puntuación: acierto +1, error −0,33, en blanco 0; nota = puntuación / 40 × 10, entre 0 y 10.

Sin servidor (abriendo `examen.html` directamente) funciona igual, pero el resultado se descarga y se incorpora con:

```bash
node tools/historial.mjs importar resultado-EX-….json
```

## Consultar resultados

```bash
node tools/historial.mjs listar
node tools/historial.mjs estadisticas
node tools/historial.mjs ver <intentoId>
```

## Comprobaciones manuales

```bash
npm test                                           # toda la batería, incluida la prueba en navegador
node tools/wiki.mjs comprobar
node tools/banco.mjs verificar
node tools/examen.mjs validar --examen-id <id>
node tools/probar-html.mjs --examen-id <id>        # añade --url http://localhost:4173 para probar el guardado
```

## Skills y agentes

| Elemento | Ruta | Función |
|---|---|---|
| `/do-examen` | `.claude/skills/do-examen/SKILL.md` | Coordinador de las tres operaciones |
| `/k-temario` | `.claude/skills/k-temario/SKILL.md` | Wiki incremental |
| `/k-preguntas` | `.claude/skills/k-preguntas/SKILL.md` | Generación por competición |
| `/k-corrector` | `.claude/skills/k-corrector/SKILL.md` | Evaluación, selección, corrección, auditoría |
| `/k-examen` | `.claude/skills/k-examen/SKILL.md` | HTML y su prueba |
| `redactor-wiki` | `.claude/agents/redactor-wiki.md` | Redacta un tema de la wiki |
| `generador-preguntas` | `.claude/agents/generador-preguntas.md` | Propone candidatas |
| `evaluador-preguntas` | `.claude/agents/evaluador-preguntas.md` | Juzga candidatas |
| `falsador` | `.claude/agents/falsador.md` | Busca afirmaciones falsas; puede rechazar |

Los agentes de `.claude/agents/` se cargan al abrir Claude Code. Si se acaban de crear o modificar y la sesión ya estaba abierta, las skills usan `general-purpose` indicándole que lea el fichero del agente; reiniciar la sesión permite usar el tipo propio.

## Git

El trabajo se hace en ramas `feature/*` creadas desde `develop` e integradas solo en `develop`. `main` no se toca. Los ficheros que genera `/do-examen` (examen, banco) no se confirman solos: si quieres versionarlos, hazlo en una rama `feature/*`.

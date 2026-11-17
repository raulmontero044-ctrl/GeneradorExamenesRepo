# Wiki del temario

Base de conocimiento persistente de la que salen **todas** las preguntas. Se mantiene con `/k-temario` de forma incremental: nunca se regenera desde cero.

## Índice

| Asignatura | Tema | Carpeta | Fuente oficial | Última revisión |
|---|---|---|---|---|
| Programación | 08 - Arquitectura de Software por Capas y Diseño de Componentes | [programacion/tema-08-arquitectura](programacion/tema-08-arquitectura/README.md) | [arquitectura](https://cesguiro.es/doku.php/clase/daw/prog/arquitectura) | 2026-11-17 |
| Programación | 09. APIs REST y Protocolo HTTP | [programacion/tema-09-api-rest-http](programacion/tema-09-api-rest-http/README.md) | [api](https://cesguiro.es/doku.php/clase/daw/prog/api) | 2026-11-17 |
| Programación | 10. Frameworks Web: Spring Boot | [programacion/tema-10-spring-boot](programacion/tema-10-spring-boot/README.md) | [spring](https://cesguiro.es/doku.php/clase/daw/prog/spring) | 2026-11-17 |
| Programación | 12 - Login con tokens | [programacion/tema-12-login-tokens](programacion/tema-12-login-tokens/README.md) | [login](https://cesguiro.es/doku.php/clase/daw/prog/login) | 2026-11-17 |
| DWS | 01 - Arquitecturas de software | [dws/tema-01-arquitecturas](dws/tema-01-arquitecturas/README.md) | [arquitecturas](https://cesguiro.es/doku.php/clase/daw/dws/arquitecturas) | 2026-11-17 |
| DWS | 02 - API First | [dws/tema-02-api-first](dws/tema-02-api-first/README.md) | [api_first](https://cesguiro.es/doku.php/clase/daw/dws/api_first) | 2026-11-17 |
| DWS | 03 - Validación e invariancias | [dws/tema-03-validacion](dws/tema-03-validacion/README.md) | [validacion](https://cesguiro.es/doku.php/clase/daw/dws/validacion) | 2026-11-17 |
| DWS | 04 - Monolito modular | [dws/tema-04-monolito-modular](dws/tema-04-monolito-modular/README.md) | [modulith](https://cesguiro.es/doku.php/clase/daw/dws/modulith) | 2026-11-17 |

Otros documentos: [relaciones.md](relaciones.md) (conceptos compartidos entre temas) y [CHANGELOG.md](CHANGELOG.md) (historial global).

## Estructura

```
wiki/
├── README.md            este índice y el formato obligatorio
├── CHANGELOG.md         historial global de actualizaciones
├── relaciones.md        conceptos que aparecen en varios temas
├── _fuentes/            copia literal de cada fuente (?do=export_raw) + estado.json con huellas por sección
├── programacion/tema-XX-…/
│   ├── README.md        ficha: fuente, última revisión, historial del tema
│   ├── contenido.md     explicación completa, una sección por cada sección de la fuente
│   └── conceptos.md     glosario de conceptos y definiciones + comparativas
└── dws/tema-XX-…/       (igual)
```

`wiki/_sincronizacion/` es temporal (descargas de la última comprobación) y no se versiona.

## Formato obligatorio

### `README.md` del tema

```markdown
# <Título del tema>

- Asignatura: <Programación | Desarrollo Web en Entorno Servidor>
- Tema: <id>
- Fuente oficial: <URL>
- Copia de la fuente: wiki/_fuentes/<id>.txt
- Última revisión: AAAA-MM-DD

## Archivos

- [contenido.md](contenido.md): explicación completa por secciones.
- [conceptos.md](conceptos.md): conceptos, definiciones y comparativas.

## Historial

| Fecha | Cambio | Secciones afectadas |
|---|---|---|
| AAAA-MM-DD | Creación inicial | Todas |
```

### `contenido.md`

- `# <título de la fuente>` y una sección por cada encabezado de la fuente, **con el mismo título y en el mismo orden**. `tools/wiki.mjs comprobar` falla si falta alguna.
- Explicación completa, no un resumen: conserva enumeraciones, tablas, matices, excepciones y diferencias.
- Diagramas descritos en texto; código explicado en prosa con fragmentos breves.
- Las preguntas citan estas secciones (`wikiRef.seccion` = título exacto del encabezado).

### `conceptos.md`

```markdown
# Conceptos — <título del tema>

## <Grupo temático>

### <Concepto>

- **Definición:** …
- **Detalles clave:** …
- **No confundir con:** … (o «—»)
- **Relacionados:** [Otro concepto](#otro-concepto), …
- **Sección:** <título de la sección de contenido.md>

## Comparativas

| Aspecto | X | Y |
|---|---|---|
```

Cada concepto se define una sola vez por tema; si otro tema lo trata, se enlaza desde `relaciones.md` en lugar de duplicarlo.

## Reglas

- Solo contenido de las fuentes oficiales. Lo externo, si la fuente lo cita, se marca como «Fuente complementaria».
- Si una fuente no está disponible, la wiki conserva la versión anterior y se anota en `CHANGELOG.md`.

# Generador de exámenes — reglas del proyecto

## Git (obligatorio)

- `main` es intocable: no trabajar sobre ella, no hacer merge, PR ni push hacia `main`. Tampoco `develop → main`.
- Todo cambio va en `feature/<nombre>` creada desde `develop` actualizado e integrada solo en `develop` (PR con `--base develop`).
- Sin `reset --hard`, sin `push --force`, sin borrar ramas sin autorización.
- Commits pequeños con prefijo `feat:`, `fix:`, `test:`, `docs:`, `refactor:`.

## Datos que no se pierden

- `banco/preguntas.jsonl` y `historial/resultados/**` son solo de adición: nunca editar ni borrar líneas o ficheros existentes sin autorización expresa del usuario.
- `wiki/` se actualiza de forma incremental con `/k-temario`; no regenerarla desde cero.
- `.claude/agents/falsador.md` es el falsador del proyecto: no sustituirlo ni cambiar su finalidad.

## Comandos

- Tests: `npm test` (Node ≥ 20, sin dependencias).
- Servidor de exámenes e historial: `npm run servidor` → http://localhost:4173
- Arquitectura y uso: `docs/ARQUITECTURA.md`, `docs/USO.md`.

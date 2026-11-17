# Historial de la wiki

Entradas más recientes primero. Las genera `/k-temario`.

## 2026-11-17
- Creación inicial de la wiki a partir de las fuentes oficiales (`?do=export_raw`), redactada por un `redactor-wiki` por tema:
  - prog-08: 20 conceptos (encabezados en contenido.md: 18).
  - prog-09: 32 conceptos (encabezados en contenido.md: 11).
  - prog-10: 34 conceptos (encabezados en contenido.md: 27).
  - prog-12: 18 conceptos (encabezados en contenido.md: 19).
  - dws-01: 29 conceptos (encabezados en contenido.md: 15).
  - dws-02: 14 conceptos (encabezados en contenido.md: 11).
  - dws-03: 18 conceptos (encabezados en contenido.md: 12).
  - dws-04: 17 conceptos (encabezados en contenido.md: 16).
- Añadido `relaciones.md` con los conceptos compartidos entre temas.
- Dudas que la fuente deja abiertas, anotadas por los redactores y que no deben usarse como base de preguntas:
  - prog-08: `getTitleEs()` en `BookMapper` (posible errata); `BookRequest` en el diagrama y `BookCreateRequest` en el código; no se distinguen las responsabilidades de Repository y DAO.
  - prog-09: solo `301` como ejemplo de 3xx y `500` como ejemplo de 5xx.
  - prog-10: el tratamiento de `HttpMessageNotReadableException` y `MethodArgumentNotValidException` se remite a un tema de validación que no está en esta fuente.
  - prog-12: no se detalla `authService.authenticate`, el código HTTP de `AuthenticationRequiredException` ni la duración concreta de los tokens.
  - dws-01: no se define qué distingue una «API pública» de una «API interna».
  - dws-03: «409 o 422» para errores de negocio, sin criterio para elegir entre ellos.
  - dws-04: no se detallan las facilidades concretas de Spring Modulith para documentar y probar módulos.

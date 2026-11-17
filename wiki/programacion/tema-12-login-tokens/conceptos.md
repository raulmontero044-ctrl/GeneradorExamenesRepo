# Conceptos — 12 - Login con tokens

## Identidad y permisos

### Autenticación

- **Definición:** Proceso que responde a la pregunta «¿Quién realiza la petición?».
- **Detalles clave:** Ejemplo: comprobar las credenciales al iniciar sesión y validar el token en las peticiones posteriores. El login autentica al usuario por primera vez; en cada petición protegida el servidor valida el token de acceso y recupera la identidad.
- **No confundir con:** [Autorización](#autorización): una petición puede estar autenticada y aun así no tener permiso.
- **Relacionados:** [Login](#login), [Token de acceso](#token-de-acceso), [Principal](#principal)
- **Sección:** 1. Autenticación y autorización

### Autorización

- **Definición:** Proceso que responde a la pregunta «¿Qué puede hacer esa identidad?».
- **Detalles clave:** Se evalúa para la operación solicitada. Ejemplo: comprobar si el rol del usuario permite acceder a una operación de administración. En cada petición protegida, tras validar el token y recuperar la identidad, el servidor comprueba los permisos que requiere la operación.
- **No confundir con:** [Autenticación](#autenticación): estar autenticado no implica tener permiso para una acción.
- **Relacionados:** [Principal](#principal), [AuthenticatedPrincipal](#authenticatedprincipal)
- **Sección:** 1. Autenticación y autorización

### Login

- **Definición:** Operación que autentica al usuario por primera vez: valida sus credenciales y le entrega tokens.
- **Detalles clave:** Devuelve un par de tokens (token de acceso y refresh token) que el servidor registra en el almacén de tokens. Es una ruta pública: continúa sin `Principal` en el filtro.
- **No confundir con:** [Renovación y rotación](#renovación-y-rotación): la renovación no usa credenciales sino el refresh token.
- **Relacionados:** [Token de acceso](#token-de-acceso), [Refresh token](#refresh-token), [Rutas públicas y protegidas](#rutas-públicas-y-protegidas)
- **Sección:** 1. Autenticación y autorización

## Tokens

### Token opaco

- **Definición:** Cadena aleatoria cuyo contenido no interpreta el cliente.
- **Detalles clave:** El servidor lo valida consultando el estado que conserva: por ejemplo su hash, tipo, vencimiento y estado de revocación. El servidor almacena el hash del token, no el valor reutilizable en claro, y nunca lo escribe en logs.
- **No confundir con:** —
- **Relacionados:** [SecureRandom](#securerandom), [Token de acceso](#token-de-acceso), [Refresh token](#refresh-token)
- **Sección:** 2. Tokens opacos

### SecureRandom

- **Definición:** Clase de Java que actúa como generador criptográficamente seguro de bytes aleatorios, usada para generar los tokens.
- **Detalles clave:** En el ejemplo se generan 32 bytes con `nextBytes` y se codifican con `Base64.getUrlEncoder().withoutPadding()` para obtener texto apto para HTTP.
- **No confundir con:** —
- **Relacionados:** [Token opaco](#token-opaco)
- **Sección:** 2. Tokens opacos

### Token de acceso

- **Definición:** Token del par devuelto por el login que se envía en cada petición protegida.
- **Detalles clave:** Duración típica corta. Se envía normalmente en la cabecera `Authorization` con el esquema `Bearer`. En la respuesta JSON del login aparece como `accessToken`. Cuando caduca, el cliente puede renovar la sesión con el refresh token.
- **No confundir con:** [Refresh token](#refresh-token), que solo se envía para renovar el par.
- **Relacionados:** [Esquema Bearer](#esquema-bearer), [Renovación y rotación](#renovación-y-rotación)
- **Sección:** 3. Token de acceso y refresh token

### Refresh token

- **Definición:** Token del par devuelto por el login que se envía solo para renovar el par.
- **Detalles clave:** Duración típica más larga que el token de acceso. No se incluye en las peticiones normales. En la respuesta JSON aparece como `refreshToken`. Al usarse, el servidor lo valida y lo consume.
- **No confundir con:** [Token de acceso](#token-de-acceso).
- **Relacionados:** [Renovación y rotación](#renovación-y-rotación), [Reutilización de un refresh token](#reutilización-de-un-refresh-token)
- **Sección:** 3. Token de acceso y refresh token

### Esquema Bearer

- **Definición:** Esquema con el que normalmente se envía el token de acceso en la cabecera `Authorization`.
- **Detalles clave:** El filtro de ejemplo comprueba que la cabecera `Authorization` no sea `null` y empiece por `"Bearer "`; el token es el texto que sigue a ese prefijo. Si no cumple, no hay token.
- **No confundir con:** —
- **Relacionados:** [Token de acceso](#token-de-acceso), [Filtro Servlet](#filtro-servlet)
- **Sección:** 3. Token de acceso y refresh token

## Renovación y seguridad

### Renovación y rotación

- **Definición:** Proceso por el que, al caducar el token de acceso, el cliente envía el refresh token y el servidor lo valida y consume y devuelve un nuevo par (token de acceso y refresh token), que sustituye a los dos anteriores.
- **Detalles clave:** Se renueva el par completo para que cada renovación cree credenciales nuevas asociadas a la misma sesión. Rotar especialmente el refresh token permite detectar si se vuelve a presentar uno ya consumido. El consumo de R1 y la creación del nuevo par deben ser atómicos; el cliente debe coordinar la renovación y evitar solicitudes simultáneas con el mismo refresh token. Tras la renovación, R1 queda inválido y A2 y R2 pertenecen a la misma sesión.
- **No confundir con:** [Login](#login). La rotación no impide el robo de una credencial.
- **Relacionados:** [Refresh token](#refresh-token), [Familia de tokens](#familia-de-tokens)
- **Sección:** 4. Renovación y rotación

### Familia de tokens

- **Definición:** Conjunto de tokens relacionados con una misma sesión, a la que el servidor asocia cada refresh token consumido.
- **Detalles clave:** El servidor conserva que R1 ya se consumió y su relación con la familia o sesión. Si se detecta reuso, se revoca toda la familia, incluido el par más reciente.
- **No confundir con:** —
- **Relacionados:** [Reutilización de un refresh token](#reutilización-de-un-refresh-token), [Renovación y rotación](#renovación-y-rotación)
- **Sección:** 5. Reutilización de un refresh token

### Reutilización de un refresh token

- **Definición:** Situación en la que se presenta otra vez un refresh token ya consumido.
- **Detalles clave:** Puede tratarse de un atacante o de un cliente legítimo con una copia antigua; el servidor no puede saber cuál es legítimo. La respuesta es revocar toda la familia: el cliente legítimo también pierde la sesión y debe autenticarse de nuevo. Si el atacante usa primero el token robado, el reuso posterior por el cliente legítimo revoca también los tokens nuevos. La rotación no impide el robo; permite detectar el reuso y revocar la sesión completa.
- **No confundir con:** [Renovación y rotación](#renovación-y-rotación) normal, en la que el refresh token se presenta una sola vez.
- **Relacionados:** [Familia de tokens](#familia-de-tokens), [Refresh token](#refresh-token)
- **Sección:** 5. Reutilización de un refresh token

## Identidad en el servidor

### Principal

- **Definición:** Interfaz de Java que representa la identidad asociada a una entidad que puede autenticarse.
- **Detalles clave:** Su método principal, `getName()`, devuelve el nombre identificador. La aplicación puede implementarla con un tipo propio que añada solo los datos que necesita (id del usuario y roles); no tiene que exponer el objeto completo `User`. Debe estar disponible mientras se procesa la petición.
- **No confundir con:** El objeto completo `User`.
- **Relacionados:** [AuthenticatedPrincipal](#authenticatedprincipal), [ThreadLocal](#threadlocal)
- **Sección:** 6. Principal y estado por petición

### AuthenticatedPrincipal

- **Definición:** `record` de ejemplo `AuthenticatedPrincipal(Long userId, Set<String> roles)` que implementa `Principal`.
- **Detalles clave:** Copia los roles con `Set.copyOf(roles)` en su constructor compacto; `getName()` devuelve `userId.toString()`. En una ruta protegida, el controlador obtiene `SecurityContext.get()`, hace cast a este tipo y usa `userId()` y `roles()`.
- **No confundir con:** [Principal](#principal), que es la interfaz.
- **Relacionados:** [SecurityContext](#securitycontext), [Rutas públicas y protegidas](#rutas-públicas-y-protegidas)
- **Sección:** 6. Principal y estado por petición

### ThreadLocal

- **Definición:** Mecanismo de Java que asocia un valor al hilo actual.
- **Detalles clave:** En un flujo web síncrono permite a los componentes de la petición consultar un contexto común sin pasar el `Principal` explícitamente. Hay que limpiarlo porque el hilo puede reutilizarse; todo contexto guardado en `ThreadLocal` debe limpiarse en `finally` (Tomcat reutiliza hilos y una petición posterior podría heredar el `Principal` de otra). Aunque el campo que lo contiene sea `static`, lo compartido es el objeto `ThreadLocal`, que mantiene un valor independiente por hilo.
- **No confundir con:** Un campo `static` mutable, que se comparte entre peticiones y puede mezclar identidades.
- **Relacionados:** [SecurityContext](#securitycontext), [Principal](#principal)
- **Sección:** 6. Principal y estado por petición

### SecurityContext

- **Definición:** Clase propia (`public final class SecurityContext`) que guarda el `Principal` de la petición actual en un `ThreadLocal<Principal>` estático llamado `CURRENT`.
- **Detalles clave:** Constructor privado y métodos estáticos `set(Principal)`, `get()` y `clear()` (este último llama a `CURRENT.remove()`). El filtro lo limpia al empezar y en el `finally`.
- **No confundir con:** —
- **Relacionados:** [ThreadLocal](#threadlocal), [Filtro Servlet](#filtro-servlet)
- **Sección:** 6. Principal y estado por petición

## Filtros y rutas

### Filtro Servlet

- **Definición:** Componente que participa en la cadena que procesa cada petición.
- **Detalles clave:** Antes de continuar la cadena puede extraer y validar el token de acceso, construir el `Principal` y guardarlo en el contexto; al finalizar, lo elimina. La idea del filtro y su posición en la cadena pertenecen al modelo Servlet. El ejemplo `AccessTokenFilter` (`@Component`) limpia el contexto, extrae el token Bearer, llama a `authService.authenticate(token).ifPresent(SecurityContext::set)`, continúa con `chain.doFilter(request, response)` y limpia el contexto en `finally`.
- **No confundir con:** [OncePerRequestFilter](#onceperrequestfilter), que es la clase base de Spring usada para implementarlo.
- **Relacionados:** [SecurityContext](#securitycontext), [Esquema Bearer](#esquema-bearer)
- **Sección:** 7. Filtro Servlet y SecurityContext propio

### OncePerRequestFilter

- **Definición:** Clase base que se extiende para implementar el filtro Servlet en una aplicación Spring Boot.
- **Detalles clave:** Gestiona la integración del filtro con Spring. Se sobrescribe `doFilterInternal(HttpServletRequest, HttpServletResponse, FilterChain)`, que puede lanzar `ServletException` e `IOException`.
- **No confundir con:** [Filtro Servlet](#filtro-servlet) como concepto, que pertenece al modelo Servlet.
- **Relacionados:** [Filtro Servlet](#filtro-servlet)
- **Sección:** 7. Filtro Servlet y SecurityContext propio

### Rutas públicas y protegidas

- **Definición:** Las rutas públicas (como login y renovación) continúan sin `Principal`; en una ruta protegida el controlador consulta el contexto y rechaza la operación si no hay identidad autenticada.
- **Detalles clave:** Si `SecurityContext.get()` devuelve `null`, el controlador lanza `AuthenticationRequiredException`.
- **No confundir con:** —
- **Relacionados:** [SecurityContext](#securitycontext), [AuthenticatedPrincipal](#authenticatedprincipal)
- **Sección:** 7. Filtro Servlet y SecurityContext propio

## Comparativas

| Aspecto | Autenticación | Autorización |
|---|---|---|
| Pregunta | ¿Quién realiza la petición? | ¿Qué puede hacer esa identidad? |
| Ejemplo | Comprobar credenciales al iniciar sesión y validar el token después | Comprobar si el rol permite una operación de administración |
| Momento | El login la realiza por primera vez; después se valida el token en cada petición protegida | Se evalúa para cada operación solicitada |

| Aspecto | Token de acceso | Refresh token |
|---|---|---|
| Uso | Se envía en cada petición protegida | Se envía solo para renovar el par |
| Duración típica | Corta | Más larga |
| Envío | Normalmente en `Authorization` con esquema `Bearer` | No se incluye en las peticiones normales |
| Propiedad JSON | `accessToken` | `refreshToken` |

| Dónde guardar el `Principal` | Problema |
|---|---|
| Variable local | Solo está disponible en ese método; habría que pasarla por todos los componentes invocados |
| Campo `static` mutable | Se comparte entre peticiones y puede mezclar las identidades de distintos clientes |
| `ThreadLocal` | Asocia el valor al hilo actual; hay que limpiarlo porque el hilo puede reutilizarse |

| Aspecto | Rotación de refresh token | Reutilización detectada |
|---|---|---|
| Qué ocurre | Se consume R1 y se emite un nuevo par A2 + R2 de la misma sesión | Se revoca toda la familia, incluido el par más reciente |
| Efecto en el cliente legítimo | Sustituye los dos tokens anteriores | Pierde la sesión y debe autenticarse de nuevo |
| Qué no consigue | No impide el robo de una credencial | El servidor no puede saber quién es el legítimo |

# 12 - Login con tokens

Un sistema de login tiene que identificar quién hace cada petición y decidir si puede ejecutar la operación que solicita.

## 1. Autenticación y autorización

| Concepto | Pregunta | Ejemplo |
|---|---|---|
| **Autenticación** | ¿Quién realiza la petición? | Comprobar las credenciales al iniciar sesión y validar el token en las peticiones posteriores |
| **Autorización** | ¿Qué puede hacer esa identidad? | Comprobar si su rol permite acceder a una operación de administración |

- El **login** autentica al usuario **por primera vez**.
- La **autorización** se evalúa **para la operación solicitada**.
- Matiz importante: una petición puede estar **autenticada y aun así no tener permiso** para realizar una acción. Autenticar no implica autorizar.

El login valida las credenciales y entrega tokens. Después, **en cada petición protegida**, el servidor:

1. valida el token de acceso,
2. recupera la identidad,
3. comprueba los permisos que requiere la operación.

##### Diagrama: flujo de login y petición protegida

Diagrama de secuencia con tres participantes: el actor **Cliente**, el **Servidor** y la base de datos **Almacén de tokens**. Los mensajes, en orden:

1. Cliente → Servidor: credenciales.
2. Servidor → Servidor: autentica.
3. Servidor → Almacén de tokens: registra los tokens.
4. Servidor → Cliente (respuesta): token de acceso + refresh token.
5. Cliente → Servidor: petición protegida + token de acceso.
6. Servidor → Almacén de tokens: valida el token y obtiene identidad/roles.
7. Almacén de tokens → Servidor (respuesta): identidad y roles.
8. Servidor → Servidor: autoriza la operación.
9. Servidor → Cliente (respuesta): resultado o acceso denegado.

## 2. Tokens opacos

Un **token opaco** es una **cadena aleatoria cuyo contenido no interpreta el cliente**. El servidor lo valida **consultando el estado que conserva** sobre él, por ejemplo:

- su hash,
- su tipo,
- su vencimiento,
- su estado de revocación.

##### Generación del token

El servidor genera los tokens con un **generador criptográficamente seguro**. En Java, `SecureRandom` proporciona bytes aleatorios que pueden codificarse como texto apto para HTTP.

El ejemplo de la fuente declara una constante `private static final SecureRandom RANDOM = new SecureRandom();` y un método `generateToken()` que:

- crea un array de **32 bytes** (`new byte[32]`),
- lo rellena con `RANDOM.nextBytes(bytes)`,
- lo codifica con `Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)`, es decir, Base64 apto para URL y sin relleno.

##### Almacenamiento

- El servidor **almacena el hash del token**, no el valor reutilizable en claro.
- El servidor **nunca escribe el token en logs**.

## 3. Token de acceso y refresh token

El login devuelve **un par de tokens**, con funciones y vencimientos distintos:

| Token | Uso | Duración típica |
|---|---|---|
| **Token de acceso** | Se envía en cada petición protegida | Corta |
| **Refresh token** | Se envía solo para renovar el par | Más larga |

- El cliente **conserva ambos**.
- Envía el token de acceso, **normalmente** en la cabecera `Authorization` con el esquema `Bearer`.
- El refresh token **no se incluye en las peticiones normales**.

La respuesta del login de ejemplo es un JSON con dos propiedades: `accessToken` (token de acceso aleatorio) y `refreshToken` (refresh token aleatorio).

## 4. Renovación y rotación

Cuando caduca el token de acceso, el cliente puede **renovar automáticamente la sesión** enviando el refresh token:

1. El servidor **valida y consume** ese refresh token.
2. Devuelve **un nuevo par**: token de acceso y refresh token.
3. El cliente **sustituye los dos valores anteriores** por los nuevos.

Motivos:

- Se renueva **el par completo** para que cada renovación cree **credenciales nuevas asociadas a la misma sesión**.
- Rotar **especialmente el refresh token** permite **detectar si se vuelve a presentar uno ya consumido**.

##### Diagrama: renovación con rotación

Diagrama de secuencia con el actor **Cliente**, el **Servidor** y el **Almacén de tokens**. Mensajes en orden:

1. Cliente → Servidor: refresh token R1.
2. Servidor → Almacén: valida y consume R1.
3. Almacén → Servidor (respuesta): R1 válido.
4. Servidor → Almacén: registra A2 + R2.
5. Servidor → Cliente (respuesta): nuevo par A2 + R2.

Nota sobre el Cliente y el Almacén:

> R1 queda inválido. A2 y R2 pertenecen a la misma sesión.

##### Atomicidad y coordinación

- El consumo de R1 y la creación del nuevo par deben ser **atómicos**.
- El cliente debe **coordinar la renovación** y **evitar solicitudes simultáneas con el mismo refresh token**.

## 5. Reutilización de un refresh token

Si se presenta **otra vez un refresh token ya consumido**, puede tratarse de:

- un **atacante**, o
- un **cliente legítimo** que conserva una copia antigua.

El servidor **no puede saber cuál de los dos es legítimo**.

##### Detección del reuso y revocación de la familia

- Para detectar el reuso, el servidor conserva **que R1 ya se consumió** y **su relación con una familia de tokens** o sesión.
- Si R1 ya produjo A2 + R2 y vuelve a presentarse, **se revoca toda la familia, incluido el par más reciente**.
- Consecuencia: **el cliente legítimo también pierde la sesión** y debe autenticarse de nuevo.

##### Diagrama: reuso de un refresh token robado

Diagrama de secuencia con dos actores (**Cliente legítimo** y **Atacante**), el **Servidor** y el **Almacén de tokens**. Mensajes en orden:

1. Cliente legítimo → Servidor: renueva con R1.
2. Servidor → Almacén: consume R1 y emite A2 + R2.
3. Atacante → Servidor: presenta R1 robado.
4. Servidor → Almacén: detecta que R1 ya se consumió.
5. Servidor → Almacén: revoca la familia (A2, R2).
6. Servidor → Atacante (respuesta): renovación rechazada.
7. Cliente legítimo → Servidor: petición con A2.
8. Servidor → Almacén: comprueba el estado de la familia.
9. Almacén → Servidor (respuesta): revocada.
10. Servidor → Cliente legítimo (respuesta): debe autenticarse de nuevo.

##### Qué consigue (y qué no) la rotación

- La rotación **no impide el robo** de una credencial.
- Lo que permite es **detectar la reutilización** de un refresh token anterior y **responder revocando la sesión completa**.
- Si el **atacante usa primero** el token robado, el reuso posterior **por el cliente legítimo** revoca también los tokens nuevos (los que obtuvo el atacante).

## 6. Principal y estado por petición

En Java, `Principal` es una **interfaz** que representa la identidad asociada a una entidad que puede autenticarse.

- Su método principal, `getName()`, devuelve el **nombre identificador**.
- La aplicación puede implementar la interfaz con un **tipo propio** que añada **solo los datos que necesita**, por ejemplo el id del usuario y sus roles; **no tiene que exponer el objeto completo `User`**.

El ejemplo de la fuente define `public record AuthenticatedPrincipal(Long userId, Set<String> roles) implements Principal`:

- su constructor compacto hace una copia inmutable de los roles (`roles = Set.copyOf(roles);`),
- sobrescribe `getName()` devolviendo `userId.toString()`.

##### Dónde guardar el Principal

El servidor necesita que este `Principal` esté disponible **mientras se procesa la petición**:

| Dónde guardar el `Principal` | Problema |
|---|---|
| Variable local | Solo está disponible en ese método; habría que pasarla por todos los componentes invocados |
| Campo `static` mutable | Se comparte entre peticiones y puede mezclar las identidades de distintos clientes |
| `ThreadLocal` | Asocia el valor al hilo actual; hay que limpiarlo porque el hilo puede reutilizarse |

En un **flujo web síncrono**, `ThreadLocal` permite a los componentes de la petición consultar un contexto común **sin pasar el `Principal` explícitamente** por cada llamada.

##### Clase SecurityContext

El ejemplo define una clase `public final class SecurityContext` con:

- un campo `private static final ThreadLocal<Principal> CURRENT = new ThreadLocal<>();`,
- un constructor privado (no se instancia),
- tres métodos estáticos: `set(Principal principal)` (llama a `CURRENT.set`), `get()` (devuelve `CURRENT.get()`) y `clear()` (llama a `CURRENT.remove()`).

Matiz: aunque `CURRENT` es `static`, **lo que se comparte es el objeto `ThreadLocal`**. Este mantiene **un valor independiente para cada hilo**; no guarda un mismo `Principal` global para todos.

## 7. Filtro Servlet y SecurityContext propio

Un **filtro Servlet** participa en la **cadena que procesa cada petición**:

- **Antes de continuar la cadena** puede extraer y validar el token de acceso, construir el `Principal` y guardarlo en el contexto.
- **Al finalizar**, lo elimina.

En una aplicación **Spring Boot**, el filtro Servlet puede implementarse **extendiendo `OncePerRequestFilter`**. La clase base gestiona su integración con Spring; **la idea del filtro y su posición en la cadena pertenecen al modelo Servlet** (no a Spring).

##### El filtro AccessTokenFilter

El ejemplo define `@Component public class AccessTokenFilter extends OncePerRequestFilter`, que recibe un `AuthService` por constructor y sobrescribe `doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)`. Su lógica:

1. Dentro de un `try`, limpia primero el contexto (`SecurityContext.clear()`).
2. Extrae el token Bearer de la petición.
3. Si hay token, lo autentica con `authService.authenticate(token).ifPresent(SecurityContext::set)`: si la autenticación devuelve un `Principal`, lo guarda en el contexto.
4. Continúa la cadena con `chain.doFilter(request, response)`.
5. En el `finally`, vuelve a limpiar el contexto (`SecurityContext.clear()`).

El método auxiliar `extractBearerToken` lee la cabecera `Authorization`; si es `null` o no empieza por `"Bearer "`, devuelve `null`; en otro caso devuelve el texto que sigue a `"Bearer "`.

##### Rutas públicas y protegidas

- Las **rutas públicas**, como **login** y **renovación**, continúan **sin `Principal`**.
- En una **ruta protegida**, el **controlador** consulta el contexto y **rechaza la operación si no hay identidad autenticada**: obtiene `SecurityContext.get()` haciendo cast a `AuthenticatedPrincipal`; si es `null`, lanza `AuthenticationRequiredException`; si no, usa `principal.userId()` y `principal.roles()`.

> **Aviso:** Todo contexto guardado en `ThreadLocal` debe limpiarse en `finally`. Tomcat reutiliza hilos; si no se elimina el valor, una petición posterior podría heredar el `Principal` de otra.

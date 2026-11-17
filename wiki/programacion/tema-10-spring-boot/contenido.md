# 10. Frameworks Web: Spring Boot

Hasta ahora la arquitectura por capas (`Controller`, `Service`, `DAO/Repository`) se ha construido instanciando y conectando las dependencias de forma manual. En este tema se utiliza **Spring Boot**, el framework estándar de la industria Java, para delegar esta tarea a su contenedor de `IoC` y exponer la aplicación como una API REST profesional.

## 1. Introducción a Spring Boot

Un **framework** proporciona la infraestructura necesaria (enrutamiento HTTP, servidor web embebido, gestión de beans, filtros) para que el desarrollador se concentre únicamente en implementar la lógica de negocio.

Diferencia con el desarrollo web Java tradicional:

- **Antes:** crear una aplicación web en Java requería configurar archivos de despliegue complejos, compilar un archivo `.war` y desplegarlo manualmente en un servidor externo (como **Apache Tomcat**).
- **Con Spring Boot:** el proceso se simplifica integrando un servidor *Tomcat* **embebido** dentro del propio ejecutable `.jar` de la aplicación.

### Creación del proyecto

La forma estándar de inicializar un proyecto Spring Boot es a través de **Spring Initializr** (https://start.spring.io/, enlace citado por el tema). Al configurar un nuevo proyecto se selecciona:

- **Gestor de dependencias:** Maven.
- **Lenguaje:** Java.
- **Versión de Spring Boot:** 4.x.
- **Metadatos del proyecto:** Group ID y Artifact ID.
- **Empaquetado:** Jar.
- **Configuration:** Properties.
- **Versión de Java:** 25.

Dependencias principales:

- **Spring Web:** incluye el servidor Tomcat embebido y todo el soporte para APIs REST.

### Punto de entrada y configuración

La clase principal anotada con `@SpringBootApplication` es la encargada de arrancar el servidor embebido y la aplicación mediante el método `main`. En el ejemplo, la clase `BookstoreApiApplication` contiene un `main` cuya única línea clave es:

```java
SpringApplication.run(BookstoreApiApplication.class, args);
```

(Las importaciones proceden de `org.springframework.boot.SpringApplication` y `org.springframework.boot.autoconfigure.SpringBootApplication`.)

Por defecto, el servidor web escucha en el puerto **`8080`**. Para cambiarlo basta con incluir la siguiente propiedad en el archivo `src/main/resources/application.properties`:

```properties
server.port=8081
```

## 2. Arquitectura Interna: Servlets y el patrón Front Controller

Para comprender cómo procesa *Spring Boot* las peticiones HTTP, es necesario entender la especificación base del desarrollo web en Java: los **Servlets**.

Un `Servlet` (definido en la especificación `jakarta.servlet`) es una clase Java encargada de atender peticiones HTTP (`HttpServletRequest`) y generar respuestas HTTP (`HttpServletResponse`).

### El patrón Front Controller (DispatcherServlet)

En lugar de requerir la creación de un `Servlet` independiente para cada ruta del sistema, *Spring Boot* implementa el patrón de diseño **Front Controller** a través de una clase central llamada **`DispatcherServlet`**.

##### Diagrama de componentes (descripción)

El diagrama muestra dos paquetes:

- **Cliente:** contiene el componente *Navegador / Cliente HTTP*.
- **Servidor Web (Tomcat):** contiene la *Cadena de Filtros (Filter Chain)* y, dentro de él, el paquete **Spring Context (IoC Container)**, que agrupa `DispatcherServlet`, *Handler Mapping*, *Http Message Converter*, `BookController` y `BookService`.

Flechas, numeradas en orden:

1. Cliente → Cadena de Filtros: «1. Petición HTTP».
2. Cadena de Filtros → `DispatcherServlet`: «2. Intercepta petición».
3. `DispatcherServlet` ↔ Handler Mapping (bidireccional): «3. Asocia URI con Método».
4. `DispatcherServlet` ↔ Http Message Converter (bidireccional): «4. Transforma JSON <-> Java DTO».
5. `DispatcherServlet` → `BookController`: «5. Ejecuta controlador».
6. `BookController` → `BookService`: «6. Invoca capa de negocio».

Obsérvese que la cadena de filtros está dentro del servidor Tomcat pero **fuera** del contexto de Spring, y actúa antes del `DispatcherServlet`.

##### Flujo de ejecución de una petición

1. **Petición del cliente:** el cliente envía una petición HTTP (por ejemplo, `GET /api/v1/books`).
2. **Recepción en el Front Controller:** el `DispatcherServlet` intercepta la petición entrante.
3. **Enrutamiento (Handler Mapping):** consulta sus tablas internas para localizar qué `@RestController` y qué método están configurados para responder a esa ruta **y** verbo HTTP.
4. **Deserialización:** transforma automáticamente el cuerpo `JSON` de la petición en un objeto Java (`Record` / `DTO`).
5. **Invocación:** ejecuta el método del controlador pasándole los argumentos procesados.
6. **Serialización y Respuesta:** toma el resultado devuelto por el controlador (un DTO o colección de DTOs), lo convierte al formato `JSON` y lo envía al cliente dentro de la respuesta HTTP.

## 3. Interceptación de peticiones: Filtros HTTP

Antes de que una petición alcance el `DispatcherServlet` (y, por extensión, los controladores), es posible interceptarla mediante **Filtros HTTP**.

Los filtros forman una **cadena de responsabilidad (Filter Chain)** y se utilizan para procesar **aspectos transversales** a la aplicación, tales como:

- Registro de logs de auditoría (tiempo de respuesta, dirección IP de origen).
- Verificación de cabeceras de autenticación o seguridad.
- Gestión de cabeceras CORS (Cross-Origin Resource Sharing).

### Ejemplo: Creación de un filtro personalizado

Extendiendo de la clase **`OncePerRequestFilter`** (`org.springframework.web.filter`) se garantiza que el filtro se ejecute **exactamente una vez por cada petición HTTP**.

El ejemplo `AuditLogFilter` está anotado con `@Component` (para que Spring lo registre) y sobrescribe el método:

```java
protected void doFilterInternal(HttpServletRequest request,
                                HttpServletResponse response,
                                FilterChain filterChain) throws ServletException, IOException
```

Qué hace el ejemplo:

1. Guarda el instante inicial (`System.currentTimeMillis()`).
2. Llama a `filterChain.doFilter(request, response);`, que **permite que la petición continúe** hacia el `DispatcherServlet` / Controller.
3. Tras esa llamada calcula la duración e imprime por consola (con `IO.printf` y el patrón `"[%s] %s -> Estado: %d (%d ms)%n"`) el método HTTP (`request.getMethod()`), la URI (`request.getRequestURI()`), el estado de la respuesta (`response.getStatus()`) y los milisegundos transcurridos.

Los tipos usados proceden de `jakarta.servlet` (`FilterChain`, `ServletException`) y `jakarta.servlet.http` (`HttpServletRequest`, `HttpServletResponse`).

## 4. Construcción de APIs REST con Spring Boot

Para exponer recursos como endpoints REST se crean clases anotadas con `@RestController` y `@RequestMapping`.

### Anotaciones de mapeo HTTP

| Anotación | Función |
|---|---|
| `@RestController` | Define la clase como un controlador web REST e indica a Spring que el valor devuelto por sus métodos debe serializarse directamente en el cuerpo de la respuesta HTTP (habitualmente en formato `JSON`). |
| `@RequestMapping("/api/v1/books")` | Define la ruta base para todos los endpoints contenidos en esa clase. |
| `@GetMapping` | Asocia el método a peticiones `GET` (lectura). |
| `@PostMapping` | Asocia el método a peticiones `POST` (creación). |
| `@PutMapping` | Asocia el método a peticiones `PUT` (actualización completa). |
| `@DeleteMapping` | Asocia el método a peticiones `DELETE` (eliminación). |

### Extraer datos de la Petición

| Anotación | Qué extrae | Ejemplo |
|---|---|---|
| `@PathVariable` | Valores incrustados en la propia URL. | `/api/v1/books/{id}` |
| `@RequestParam` | Parámetros de consulta pasados tras el símbolo `?`. | `/api/v1/books?page=2` |
| `@RequestBody` | Deserializa automáticamente el cuerpo JSON de la petición entrante en un objeto Java (`Record` / `DTO`). | — |

## 5. Gestión de Respuestas HTTP con ResponseEntity

En el diseño de APIs REST, el controlador debe devolver **tanto** los datos formateados (DTOs) **como** el código de estado HTTP correspondiente. Para lograr un control explícito sobre la respuesta se utiliza la clase **`ResponseEntity<T>`** (`org.springframework.http`).

### Ejemplo práctico: BookController

El ejemplo es una clase `BookController` anotada con `@RestController` y `@RequestMapping("/api/v1/books")`. Recibe un `BookService` como atributo `private final` a través de su **constructor**; el comentario del código indica que esa inyección de dependencias por constructor la realiza **automáticamente Spring**. Usa los DTOs `BookCreateRequest` (entrada) y `BookResponse` (salida).

Endpoints del ejemplo:

| Método del controlador | Petición | Anotaciones | Retorno | Estado |
|---|---|---|---|---|
| `getAll()` | `GET /api/v1/books` | `@GetMapping` | `ResponseEntity<List<BookResponse>>` mediante `ResponseEntity.ok(books)` | `200 OK` con el listado |
| `getById(@PathVariable Long id)` | `GET /api/v1/books/12` | `@GetMapping("/{id}")` | `ResponseEntity<BookResponse>` mediante `ResponseEntity.ok(book)` | `200 OK` si existe |
| `create(@RequestBody BookCreateRequest request)` | `POST /api/v1/books` | `@PostMapping` | `ResponseEntity.status(HttpStatus.CREATED).body(createdBook)` | `201 Created` con el objeto creado |
| `delete(@PathVariable Long id)` | `DELETE /api/v1/books/12` | `@DeleteMapping("/{id}")` | `ResponseEntity<Void>` mediante `ResponseEntity.noContent().build()` | `204 No Content` |

Puntos clave:

- `ResponseEntity.ok(x)` produce un 200 con `x` en el cuerpo.
- Para 201 se usa `ResponseEntity.status(HttpStatus.CREATED).body(...)`.
- Para el borrado, el tipo es `ResponseEntity<Void>` (sin cuerpo) y se construye con `noContent().build()`.
- El controlador solo delega en el `Service` (`findAll`, `findById`, `create`, `delete`) y traduce el resultado a una respuesta HTTP.

## 6. Integración con el Contenedor IoC de Spring

Spring detecta y gestiona de forma automática el **ciclo de vida** de las clases mediante el **escaneo de anotaciones**:

| Anotación | Capa de la Arquitectura | Descripción |
|---|---|---|
| `@RestController` | Presentación | Expone endpoints REST y serializa las respuestas en JSON. |
| `@Service` | Negocio | Contiene la lógica de negocio del sistema. |
| `@Repository` | Persistencia | Implementa el acceso a datos (DAOs / Repositorios). |
| `@Component` | Genérica | Para componentes o utilidades transversales (Filtros, Mapeadores). |

Al aplicar `@Service` en la capa de negocio y `@Repository` en la capa de persistencia, el contenedor de *IoC* de Spring **resuelve e inyecta las dependencias automáticamente a través del constructor** del `@RestController`, eliminando por completo la necesidad de instanciarlas manualmente.

## 7. Gestión de Excepciones: el Manejador Global

Los apartados anteriores muestran el ***happy path*** de la API: el `Service` encuentra los datos y el controlador devuelve la respuesta correcta. En un sistema real, el flujo puede fallar en **cualquier capa** (recurso inexistente, datos inválidos, error técnico) y la respuesta HTTP debe reflejar ese fallo con el código de estado adecuado.

### Comportamiento por defecto

Si una excepción sale del método del controlador **sin capturarse**, el `DispatcherServlet` la intercepta y *Spring Boot* genera una respuesta de error genérica (la clásica ***Whitelabel Error Page***) con estado **`500 Internal Server Error`**, sin información útil para el cliente de la API.

### El problema de los try-catch en el controlador

La solución ingenua sería envolver cada llamada al `Service` en bloques `try-catch` dentro del `@RestController`. Es un **antipatrón** porque:

- **duplica código** en todos los endpoints, y
- **mezcla la responsabilidad** de presentación con la gestión de errores.

Como se explicó en el tema 05, la arquitectura moderna crea **excepciones personalizadas no verificadas** (`RuntimeException`) y las lanza desde las capas inferiores. La excepción interrumpe el flujo normal y *vuela* hasta **un único punto** donde se traduce a una respuesta HTTP.

### Manejo centralizado: @RestControllerAdvice y @ExceptionHandler

*Spring Boot* centraliza esa traducción en una clase anotada con **`@RestControllerAdvice`** (variante de `@ControllerAdvice` que serializa directamente la respuesta en JSON), registrada como bean junto al resto de componentes del contenedor de `IoC`. Sus métodos, anotados con **`@ExceptionHandler`**, se invocan automáticamente cuando una excepción escapa de **cualquier** controlador:

- `@ExceptionHandler(TipoExcepcion.class)`: declara el tipo de excepción que captura cada método.
- Spring invoca siempre el **manejador más específico** disponible según la jerarquía de clases: una `BookNotFoundException` activa su propio manejador y **no** el genérico de `Exception`.
- El método devuelve un `ResponseEntity` con el estado y el cuerpo adecuados, igual que haría el propio controlador.

### Flujo de una excepción no controlada

El diagrama de secuencia tiene como participantes Cliente, `DispatcherServlet`, `BookController`, `BookService` y `GlobalExceptionHandler`. Orden de los mensajes:

1. Cliente → `DispatcherServlet`: `GET /api/v1/books/99`.
2. `DispatcherServlet` → `BookController`: `getById(99)`.
3. `BookController` → `BookService`: `findById(99)`.
4. `BookService` → `BookController` (retorno): lanza `BookNotFoundException`.
5. `BookController` → `DispatcherServlet` (retorno): propaga la excepción.
6. `DispatcherServlet` → `GlobalExceptionHandler`: busca el `@ExceptionHandler`.
7. `GlobalExceptionHandler` → `DispatcherServlet` (retorno): `ResponseEntity` (404 + JSON).
8. `DispatcherServlet` → Cliente (retorno): `404 Not Found`.

El controlador no captura la excepción: simplemente la deja pasar, y es el `DispatcherServlet` quien recurre al manejador global.

### Ejemplo práctico: GlobalExceptionHandler

El ejemplo consta de cuatro piezas:

1. **Excepción de dominio:** `BookNotFoundException extends RuntimeException`, cuyo constructor recibe el `Long id` y llama a `super("No existe el libro con id " + id)`. La lanza la capa de negocio cuando el recurso no existe.
2. **Lanzamiento en el Service:** `findById` busca en el repositorio y, si no hay resultado, lanza la excepción; la excepción interrumpe el flujo y «vuela» hasta el manejador global:

   ```java
   return bookRepository.findById(id).orElseThrow(() -> new BookNotFoundException(id));
   ```

3. **Cuerpo de la respuesta de error**, modelado como un *record*: `public record ApiErrorResponse(String message) {}`.
4. **Manejador** `GlobalExceptionHandler`, anotado con `@RestControllerAdvice`, con tres métodos:
   - `@ExceptionHandler(BookNotFoundException.class)` → `handleNotFound`: devuelve `ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiErrorResponse(e.getMessage()))` (por ejemplo, `GET /api/v1/books/99` con un id inexistente → 404).
   - `@ExceptionHandler(IllegalArgumentException.class)` → `handleBadRequest`: datos de entrada inválidos → `ResponseEntity.badRequest().body(...)` con el mensaje de la excepción (400).
   - `@ExceptionHandler(Exception.class)` → `handleUnexpected`: **captura final** de cualquier error no previsto → `ResponseEntity.internalServerError().body(new ApiErrorResponse("Error interno del servidor"))` (mensaje genérico, 500).

> **Importante:** Los mensajes de las excepciones de negocio están pensados para el cliente ("No existe el libro con id 99"). Pero **nunca** se debe devolver al cliente la información de una excepción técnica (trazas, nombres de clases, detalles del SQL), y esto es especialmente obligatorio si la API es pública. Por eso el manejador termina **capturando cualquier otra excepción** (`@ExceptionHandler(Exception.class)`) y devolviendo un mensaje **genérico** ("Error interno del servidor") con estado 500; los detalles reales quedan en el log del servidor.

Correspondencia entre excepciones y respuestas:

| Excepción | Estado HTTP | Origen |
|---|---|---|
| `BookNotFoundException` | `404 Not Found` | Negocio: recurso inexistente |
| `IllegalArgumentException` | `400 Bad Request` | Negocio: datos de entrada inválidos |
| `Exception` | `500 Internal Server Error` | Cualquier error técnico no previsto |

### Excepciones del propio framework

Además de las excepciones de dominio, *Spring Boot* lanza las suyas propias durante el procesamiento de la petición, por ejemplo:

- `HttpMessageNotReadableException`: cuando el cuerpo JSON no se puede deserializar.
- `MethodArgumentNotValidException`: cuando falla la validación de los datos de entrada.

Se tratan **igual que las propias**: declarando en el manejador un `@ExceptionHandler` para cada tipo. Su tratamiento detallado se aborda al presentar la validación de datos (la fuente no lo detalla en este tema).

## 8. El registro de la aplicación (logs)

En apartados anteriores ya se ha mostrado información por consola a mano (`IO.printf` en el filtro de auditoría). Para una aplicación real, la consola se queda corta:

- los mensajes **no se guardan**;
- se **mezclan** con la salida del propio framework;
- todos **se ven igual**, por importante o trivial que sea cada uno.

Un **sistema de logs** (o sistema de registro) resuelve esto: la aplicación emite **eventos de log** de forma uniforme —qué ocurre, cuándo y con qué severidad— y es **la configuración, no el código**, la que decide qué se registra y dónde.

### El evento de log y sus niveles

Cada suceso que la aplicación registra de forma intencionada es un **evento de log**. Todos los eventos comparten una estructura mínima:

| Componente | Descripción |
|---|---|
| **Nivel** | La severidad del suceso: permite filtrar o destacar cada mensaje sin tocar el código |
| **Marca de tiempo** | Cuándo se produjo; ordena los sucesos de una ejecución |
| **Origen** | El componente que lo emitió (la clase propietaria del logger) |
| **Mensaje** | La descripción del suceso, con el contexto que lo identifica |

El **nivel** es la pieza central del sistema. De **más a menos** severidad:

| Nivel | Uso |
|---|---|
| `ERROR` | Fallo que impide completar la operación (error técnico no previsto) |
| `WARN` | Incidencia recuperable o sospechosa (dato degradado, reintento) |
| `INFO` | Suceso normal relevante: arranque, petición atendida, operación de negocio |
| `DEBUG` | Detalle de diagnóstico con el que depurar en desarrollo |
| `TRACE` | Información aún más minuciosa; solo se activa para casos muy concretos |

### Fachada e implementación

En el ecosistema Java el registro se divide en dos piezas que se combinan:

- La **fachada**: define la API con la que el código emite eventos. La estándar es **SLF4J** (*Simple Logging Facade for Java*).
- La **implementación**: decide el formato y el destino de cada evento. Las habituales en un proyecto Spring son **Logback** y **Log4j2** (sucesoras de la antigua Log4j); el JDK incluye además `java.util.logging`.

El código **solo conoce la fachada**; la implementación se cambia por configuración, sin retocar ninguna clase. Es el mismo principio que ya se aplica al **programar contra interfaces**.

| Pieza | Papel | En Spring Boot |
|---|---|---|
| **SLF4J** | Fachada: la API con la que escribe el código | Incluida por defecto |
| **Logback** | Implementación por defecto | Incluida por defecto |
| **Log4j2** | Implementación alternativa | Sustituible por configuración |

> **Importante:** Spring Boot ya incluye **Logback** detrás de la fachada **SLF4J**: se puede empezar a registrar eventos desde el primer proyecto sin añadir ninguna dependencia ni configurar nada.

### Registrar eventos en el código

Cada clase **declara su logger** y emite sus eventos con el nivel que les corresponde; el **nombre del logger** —por defecto la propia clase— identifica el **origen**. La declaración del ejemplo es:

```java
private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
```

(`Logger` y `LoggerFactory` proceden de `org.slf4j`.)

El manejador global del apartado 7 es el punto idóneo: en `handleUnexpected` se llama a `log.error("Error técnico no controlado", e);` antes de devolver el 500 genérico. Así, al cliente le llega el mensaje genérico y **la traza completa queda registrada con nivel `ERROR`**. Esto completa la nota del apartado 7: el detalle técnico (trazas, SQL, clases) nunca viaja al cliente, pero sí queda en el log del servidor para diagnosticar después.

Los mensajes de SLF4J usan **marcadores `{}`** en lugar de concatenación: el texto **se formatea solo si el nivel está activo**, lo que evita construir cadenas para eventos que no se van a registrar. El filtro de auditoría del apartado 3 pasa de imprimir por consola a registrar con nivel:

```java
log.info("{} {} -> {} ({} ms)", request.getMethod(), request.getRequestURI(), response.getStatus(), duration);
```

### Configuración de niveles y destinos

En `application.properties` se declara el **nivel por paquete**. Los paquetes del framework son muy verbosos, así que se recortan para que sus mensajes no oculten los propios:

```properties
# Nivel raíz y ajuste por paquete
logging.level.root=INFO
logging.level.org.springframework=WARN
logging.level.com.fpmislata.bookstoreapi=DEBUG
```

El mismo código muestra más o menos detalle según la configuración: el paquete del proyecto en `DEBUG` para el desarrollo, `INFO` en producción, **sin volver a compilar**. También con propiedades se añade una **salida a fichero** (además de la consola):

```properties
logging.file.name=logs/bookstore.log
```

> **Importante:** Nunca se registran datos sensibles: contraseñas, tokens ni cabeceras de autenticación (se verán en el tema 12). El log se consulta más lejos de lo que imaginamos y el mensaje aporta contexto útil (identificadores), no secretos.

Cuando la aplicación se despliega fuera del propio equipo, este registro se convierte en la **principal ventana de diagnóstico**: guardar el log en producción y correlacionar cada mensaje con la petición que lo originó es el siguiente paso del ciclo, ya en 2.º DAW.

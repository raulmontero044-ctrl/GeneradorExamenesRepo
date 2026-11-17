# Conceptos — 10. Frameworks Web: Spring Boot

## Fundamentos del framework

### Spring Boot

- **Definición:** Framework estándar de la industria Java que proporciona la infraestructura (enrutamiento HTTP, servidor web embebido, gestión de beans, filtros) para que el desarrollador se concentre únicamente en la lógica de negocio.
- **Detalles clave:** Delega en su contenedor de IoC la instanciación y conexión de las dependencias de la arquitectura por capas, que antes se hacía a mano. Integra un servidor Tomcat embebido dentro del ejecutable `.jar`. Configuración de proyecto del tema: Maven, Java 25, Spring Boot 4.x, empaquetado Jar, configuración Properties, dependencia Spring Web.
- **No confundir con:** el despliegue tradicional en un servidor externo con un `.war` (ver [Comparativas](#comparativas)).
- **Relacionados:** [Servidor Tomcat embebido](#servidor-tomcat-embebido), [Spring Initializr](#spring-initializr), [Contenedor IoC de Spring](#contenedor-ioc-de-spring)
- **Sección:** 1. Introducción a Spring Boot

### Servidor Tomcat embebido

- **Definición:** Servidor web (Apache Tomcat) integrado dentro del propio ejecutable `.jar` de la aplicación Spring Boot.
- **Detalles clave:** Evita configurar archivos de despliegue complejos, compilar un `.war` y desplegarlo manualmente en un servidor externo. Lo aporta la dependencia **Spring Web**. Por defecto escucha en el puerto `8080`.
- **No confundir con:** un Tomcat externo donde se despliega un `.war`.
- **Relacionados:** [Spring Boot](#spring-boot), [application.properties](#applicationproperties)
- **Sección:** 1. Introducción a Spring Boot

### Spring Initializr

- **Definición:** Herramienta web (start.spring.io) que es la forma estándar de inicializar un proyecto Spring Boot.
- **Detalles clave:** Se eligen gestor de dependencias (Maven), lenguaje (Java), versión de Spring Boot (4.x), metadatos (Group ID y Artifact ID), empaquetado (Jar), configuración (Properties), versión de Java (25) y dependencias (Spring Web).
- **No confundir con:** —
- **Relacionados:** [Spring Boot](#spring-boot)
- **Sección:** Creación del proyecto

### @SpringBootApplication

- **Definición:** Anotación de la clase principal, encargada de arrancar el servidor embebido y la aplicación mediante el método `main`.
- **Detalles clave:** El `main` invoca `SpringApplication.run(ClasePrincipal.class, args)`.
- **No confundir con:** `@RestController` u otras anotaciones de estereotipo de las capas.
- **Relacionados:** [Servidor Tomcat embebido](#servidor-tomcat-embebido)
- **Sección:** Punto de entrada y configuración

### application.properties

- **Definición:** Archivo de configuración `src/main/resources/application.properties` de la aplicación.
- **Detalles clave:** `server.port=8081` cambia el puerto (por defecto `8080`). `logging.level.<paquete>=<NIVEL>` fija el nivel de log por paquete (`logging.level.root` para el raíz). `logging.file.name=logs/bookstore.log` añade salida a fichero. Cambiar estos valores no requiere volver a compilar.
- **No confundir con:** —
- **Relacionados:** [Configuración de logs por paquete](#configuración-de-logs-por-paquete)
- **Sección:** Punto de entrada y configuración

## Arquitectura interna

### Servlet

- **Definición:** Clase Java, definida en la especificación `jakarta.servlet`, encargada de atender peticiones HTTP (`HttpServletRequest`) y generar respuestas HTTP (`HttpServletResponse`).
- **Detalles clave:** Es la especificación base del desarrollo web en Java sobre la que funciona Spring Boot.
- **No confundir con:** el `DispatcherServlet`, que es un único servlet central que actúa de Front Controller.
- **Relacionados:** [DispatcherServlet](#dispatcherservlet), [Patrón Front Controller](#patrón-front-controller)
- **Sección:** 2. Arquitectura Interna: Servlets y el patrón Front Controller

### Patrón Front Controller

- **Definición:** Patrón de diseño en el que una única clase central recibe todas las peticiones, en lugar de crear un servlet independiente para cada ruta.
- **Detalles clave:** Spring Boot lo implementa con el `DispatcherServlet`.
- **No confundir con:** un servlet por ruta (enfoque que el patrón evita).
- **Relacionados:** [DispatcherServlet](#dispatcherservlet), [Servlet](#servlet)
- **Sección:** El patrón Front Controller (DispatcherServlet)

### DispatcherServlet

- **Definición:** Clase central de Spring Boot que implementa el patrón Front Controller e intercepta todas las peticiones HTTP entrantes.
- **Detalles clave:** Flujo: recibe la petición (tras la cadena de filtros) → enruta con el Handler Mapping (ruta y verbo HTTP → `@RestController` y método) → deserializa el JSON a Record/DTO con el Http Message Converter → invoca el método del controlador → serializa el resultado a JSON y responde. Si una excepción sale del controlador sin capturarse, la intercepta: sin manejador genera la Whitelabel Error Page (500); con `@RestControllerAdvice` busca el `@ExceptionHandler` adecuado.
- **No confundir con:** los filtros HTTP, que actúan antes de que la petición llegue al DispatcherServlet.
- **Relacionados:** [Handler Mapping](#handler-mapping), [Http Message Converter](#http-message-converter), [Filtro HTTP](#filtro-http)
- **Sección:** El patrón Front Controller (DispatcherServlet)

### Handler Mapping

- **Definición:** Componente que el `DispatcherServlet` consulta para asociar la URI con el método que debe atenderla.
- **Detalles clave:** Usa tablas internas para localizar qué `@RestController` y qué método responden a esa ruta y verbo HTTP.
- **No confundir con:** Http Message Converter (transforma datos, no enruta).
- **Relacionados:** [DispatcherServlet](#dispatcherservlet)
- **Sección:** El patrón Front Controller (DispatcherServlet)

### Http Message Converter

- **Definición:** Componente que el `DispatcherServlet` consulta para transformar JSON ↔ DTO Java.
- **Detalles clave:** Deserializa el cuerpo JSON de la petición a un Record/DTO y serializa a JSON el DTO o colección de DTOs devuelto por el controlador.
- **No confundir con:** Handler Mapping.
- **Relacionados:** [DispatcherServlet](#dispatcherservlet), [@RequestBody](#requestbody)
- **Sección:** El patrón Front Controller (DispatcherServlet)

### Filtro HTTP

- **Definición:** Componente que intercepta una petición antes de que alcance el `DispatcherServlet` (y, por extensión, los controladores).
- **Detalles clave:** Los filtros forman una cadena de responsabilidad (**Filter Chain**) y procesan aspectos transversales: logs de auditoría (tiempo de respuesta, IP de origen), verificación de cabeceras de autenticación o seguridad y gestión de cabeceras CORS. `filterChain.doFilter(request, response)` deja continuar la petición. En el diagrama, la cadena de filtros está en Tomcat pero fuera del contexto de Spring.
- **No confundir con:** el manejador global de excepciones (`@RestControllerAdvice`), que actúa tras el controlador.
- **Relacionados:** [OncePerRequestFilter](#onceperrequestfilter), [DispatcherServlet](#dispatcherservlet)
- **Sección:** 3. Interceptación de peticiones: Filtros HTTP

### OncePerRequestFilter

- **Definición:** Clase de Spring (`org.springframework.web.filter`) de la que se extiende para garantizar que el filtro se ejecute exactamente una vez por cada petición HTTP.
- **Detalles clave:** Se sobrescribe `doFilterInternal(HttpServletRequest, HttpServletResponse, FilterChain)`, que lanza `ServletException` e `IOException`. El ejemplo `AuditLogFilter` se anota con `@Component` y mide la duración de la petición.
- **No confundir con:** —
- **Relacionados:** [Filtro HTTP](#filtro-http)
- **Sección:** Ejemplo: Creación de un filtro personalizado

## Construcción de la API REST

### @RestController

- **Definición:** Anotación que define la clase como controlador web REST e indica que el valor devuelto por sus métodos se serializa directamente en el cuerpo de la respuesta HTTP (habitualmente JSON).
- **Detalles clave:** Capa de presentación. Recibe sus dependencias (p. ej. `BookService`) por constructor, inyectadas automáticamente por Spring.
- **No confundir con:** `@RestControllerAdvice` (manejo global de excepciones).
- **Relacionados:** [@RequestMapping y anotaciones de verbo](#requestmapping-y-anotaciones-de-verbo), [Anotaciones de estereotipo](#anotaciones-de-estereotipo)
- **Sección:** Anotaciones de mapeo HTTP

### @RequestMapping y anotaciones de verbo

- **Definición:** `@RequestMapping("/api/v1/books")` define la ruta base de todos los endpoints de la clase; `@GetMapping`, `@PostMapping`, `@PutMapping` y `@DeleteMapping` asocian cada método a un verbo HTTP.
- **Detalles clave:** GET → lectura; POST → creación; PUT → actualización completa; DELETE → eliminación. Pueden llevar una subruta, p. ej. `@GetMapping("/{id}")`.
- **No confundir con:** —
- **Relacionados:** [@RestController](#restcontroller), [@PathVariable](#pathvariable)
- **Sección:** Anotaciones de mapeo HTTP

### @PathVariable

- **Definición:** Extrae valores incrustados en la propia URL.
- **Detalles clave:** Ejemplo: `/api/v1/books/{id}` con `@PathVariable Long id`.
- **No confundir con:** `@RequestParam` (parámetros de consulta tras `?`).
- **Relacionados:** [@RequestParam](#requestparam), [@RequestBody](#requestbody)
- **Sección:** Extraer datos de la Petición

### @RequestParam

- **Definición:** Extrae parámetros de consulta pasados tras el símbolo `?`.
- **Detalles clave:** Ejemplo: `/api/v1/books?page=2`.
- **No confundir con:** `@PathVariable` (valor que forma parte de la ruta).
- **Relacionados:** [@PathVariable](#pathvariable)
- **Sección:** Extraer datos de la Petición

### @RequestBody

- **Definición:** Deserializa automáticamente el cuerpo JSON de la petición entrante en un objeto Java (Record/DTO).
- **Detalles clave:** En el ejemplo: `create(@RequestBody BookCreateRequest request)`.
- **No confundir con:** `@PathVariable` y `@RequestParam`, que leen la URL, no el cuerpo.
- **Relacionados:** [Http Message Converter](#http-message-converter)
- **Sección:** Extraer datos de la Petición

### ResponseEntity

- **Definición:** Clase `ResponseEntity<T>` que da control explícito sobre la respuesta HTTP: datos (DTOs) y código de estado.
- **Detalles clave:** `ResponseEntity.ok(x)` → 200; `ResponseEntity.status(HttpStatus.CREATED).body(x)` → 201; `ResponseEntity.noContent().build()` → 204 (tipo `ResponseEntity<Void>`); `ResponseEntity.status(HttpStatus.NOT_FOUND).body(...)` → 404; `ResponseEntity.badRequest().body(...)` → 400; `ResponseEntity.internalServerError().body(...)` → 500. También lo devuelven los métodos `@ExceptionHandler`.
- **No confundir con:** devolver solo el DTO (sin control explícito del estado).
- **Relacionados:** [@RestController](#restcontroller), [@ExceptionHandler](#exceptionhandler)
- **Sección:** 5. Gestión de Respuestas HTTP con ResponseEntity

## Contenedor IoC

### Contenedor IoC de Spring

- **Definición:** Contenedor de Spring que detecta y gestiona automáticamente el ciclo de vida de las clases mediante el escaneo de anotaciones y resuelve e inyecta sus dependencias.
- **Detalles clave:** Inyecta las dependencias a través del constructor (p. ej. del `@RestController`), eliminando por completo la necesidad de instanciarlas manualmente. Las clases gestionadas son beans; el `@RestControllerAdvice` también se registra como bean.
- **No confundir con:** la instanciación y conexión manual de dependencias de temas anteriores.
- **Relacionados:** [Anotaciones de estereotipo](#anotaciones-de-estereotipo), [Spring Boot](#spring-boot)
- **Sección:** 6. Integración con el Contenedor IoC de Spring

### Anotaciones de estereotipo

- **Definición:** Anotaciones con las que Spring detecta las clases que debe gestionar, cada una asociada a una capa.
- **Detalles clave:** `@RestController` → Presentación (expone endpoints REST, serializa a JSON); `@Service` → Negocio (lógica de negocio); `@Repository` → Persistencia (acceso a datos, DAOs/Repositorios); `@Component` → Genérica (componentes o utilidades transversales: filtros, mapeadores).
- **No confundir con:** las anotaciones de mapeo HTTP (`@GetMapping`, etc.).
- **Relacionados:** [Contenedor IoC de Spring](#contenedor-ioc-de-spring)
- **Sección:** 6. Integración con el Contenedor IoC de Spring

## Gestión de excepciones

### Whitelabel Error Page

- **Definición:** Respuesta de error genérica que genera Spring Boot cuando una excepción sale del controlador sin capturarse.
- **Detalles clave:** El `DispatcherServlet` intercepta la excepción y responde con `500 Internal Server Error`, sin información útil para el cliente de la API.
- **No confundir con:** la respuesta genérica 500 del manejador global, que es intencionada y con cuerpo `ApiErrorResponse`.
- **Relacionados:** [@RestControllerAdvice](#restcontrolleradvice)
- **Sección:** Comportamiento por defecto

### Antipatrón try-catch en el controlador

- **Definición:** Solución ingenua de envolver cada llamada al `Service` en bloques `try-catch` dentro del `@RestController`.
- **Detalles clave:** Es un antipatrón porque duplica código en todos los endpoints y mezcla la responsabilidad de presentación con la gestión de errores. La alternativa: excepciones personalizadas no verificadas (`RuntimeException`) lanzadas desde capas inferiores que «vuelan» hasta un único punto de traducción.
- **No confundir con:** el manejo centralizado con `@RestControllerAdvice`.
- **Relacionados:** [@RestControllerAdvice](#restcontrolleradvice), [Excepción de dominio no verificada](#excepción-de-dominio-no-verificada)
- **Sección:** El problema de los try-catch en el controlador

### Excepción de dominio no verificada

- **Definición:** Excepción personalizada que extiende `RuntimeException` y se lanza desde las capas inferiores (p. ej. `BookNotFoundException`).
- **Detalles clave:** Interrumpe el flujo normal y vuela hasta el manejador global. Su mensaje está pensado para el cliente ("No existe el libro con id 99"). En el Service: `.orElseThrow(() -> new BookNotFoundException(id))`. Ya se explicó en el tema 05.
- **No confundir con:** las excepciones técnicas, cuyo detalle nunca debe llegar al cliente.
- **Relacionados:** [@ExceptionHandler](#exceptionhandler)
- **Sección:** El problema de los try-catch en el controlador

### @RestControllerAdvice

- **Definición:** Anotación de la clase que centraliza la traducción de excepciones a respuestas HTTP; variante de `@ControllerAdvice` que serializa directamente la respuesta en JSON.
- **Detalles clave:** Se registra como bean en el contenedor IoC. Sus métodos `@ExceptionHandler` se invocan automáticamente cuando una excepción escapa de cualquier controlador. Ejemplo: `GlobalExceptionHandler`. Es el punto idóneo para registrar con `log.error` la traza de los errores no previstos.
- **No confundir con:** `@ControllerAdvice` (no serializa directamente en JSON) y con `@RestController`.
- **Relacionados:** [@ExceptionHandler](#exceptionhandler), [ApiErrorResponse](#apierrorresponse)
- **Sección:** Manejo centralizado: @RestControllerAdvice y @ExceptionHandler

### @ExceptionHandler

- **Definición:** Anotación de método, `@ExceptionHandler(TipoExcepcion.class)`, que declara el tipo de excepción que ese método captura.
- **Detalles clave:** Spring invoca siempre el manejador **más específico** según la jerarquía de clases (una `BookNotFoundException` activa su manejador, no el de `Exception`). Devuelve un `ResponseEntity`. Correspondencia del ejemplo: `BookNotFoundException` → 404; `IllegalArgumentException` → 400; `Exception` → 500 con mensaje genérico. Sirve también para excepciones del framework (`HttpMessageNotReadableException`, `MethodArgumentNotValidException`).
- **No confundir con:** un `try-catch` en el controlador.
- **Relacionados:** [@RestControllerAdvice](#restcontrolleradvice), [ResponseEntity](#responseentity)
- **Sección:** Manejo centralizado: @RestControllerAdvice y @ExceptionHandler

### ApiErrorResponse

- **Definición:** Record que modela el cuerpo de la respuesta de error: `public record ApiErrorResponse(String message) {}`.
- **Detalles clave:** En errores de negocio lleva el mensaje de la excepción; en errores no previstos, el genérico "Error interno del servidor".
- **No confundir con:** la Whitelabel Error Page.
- **Relacionados:** [@ExceptionHandler](#exceptionhandler)
- **Sección:** Ejemplo práctico: GlobalExceptionHandler

### Captura final de Exception

- **Definición:** Método `@ExceptionHandler(Exception.class)` con el que termina el manejador global para capturar cualquier otra excepción no prevista.
- **Detalles clave:** Devuelve un mensaje genérico ("Error interno del servidor") con estado 500. Nunca se devuelve al cliente información de excepciones técnicas (trazas, nombres de clases, detalles del SQL), obligatorio especialmente si la API es pública; los detalles reales quedan en el log del servidor.
- **No confundir con:** la Whitelabel Error Page (también 500, pero no controlada).
- **Relacionados:** [Logger de SLF4J](#logger-de-slf4j), [@ExceptionHandler](#exceptionhandler)
- **Sección:** Ejemplo práctico: GlobalExceptionHandler

### Excepciones del propio framework

- **Definición:** Excepciones que lanza Spring Boot durante el procesamiento de la petición.
- **Detalles clave:** `HttpMessageNotReadableException` (el cuerpo JSON no se puede deserializar); `MethodArgumentNotValidException` (falla la validación de los datos de entrada). Se tratan igual que las propias, con un `@ExceptionHandler` por tipo; su tratamiento detallado se aborda con la validación de datos.
- **No confundir con:** las excepciones de dominio.
- **Relacionados:** [@ExceptionHandler](#exceptionhandler)
- **Sección:** Excepciones del propio framework

## Registro (logs)

### Sistema de logs

- **Definición:** Sistema de registro en el que la aplicación emite eventos de log de forma uniforme (qué ocurre, cuándo y con qué severidad) y la configuración, no el código, decide qué se registra y dónde.
- **Detalles clave:** Resuelve las carencias de la consola: los mensajes no se guardan, se mezclan con la salida del framework y todos se ven igual. Es la principal ventana de diagnóstico cuando la aplicación se despliega fuera del propio equipo.
- **No confundir con:** imprimir por consola (`IO.printf`).
- **Relacionados:** [Evento de log](#evento-de-log), [Niveles de log](#niveles-de-log)
- **Sección:** 8. El registro de la aplicación (logs)

### Evento de log

- **Definición:** Cada suceso que la aplicación registra de forma intencionada.
- **Detalles clave:** Estructura mínima: **Nivel** (severidad; permite filtrar o destacar sin tocar el código), **Marca de tiempo** (cuándo; ordena los sucesos), **Origen** (componente emisor, la clase propietaria del logger) y **Mensaje** (descripción con el contexto que lo identifica).
- **No confundir con:** —
- **Relacionados:** [Niveles de log](#niveles-de-log)
- **Sección:** El evento de log y sus niveles

### Niveles de log

- **Definición:** Severidad de un evento de log; pieza central del sistema.
- **Detalles clave:** De más a menos severidad: `ERROR` (fallo que impide completar la operación), `WARN` (incidencia recuperable o sospechosa), `INFO` (suceso normal relevante: arranque, petición atendida, operación de negocio), `DEBUG` (diagnóstico para depurar en desarrollo), `TRACE` (aún más minucioso; solo para casos muy concretos).
- **No confundir con:** los códigos de estado HTTP.
- **Relacionados:** [Configuración de logs por paquete](#configuración-de-logs-por-paquete)
- **Sección:** El evento de log y sus niveles

### Fachada e implementación de logging

- **Definición:** División del registro en Java en una **fachada** (API con la que el código emite eventos; la estándar es SLF4J) y una **implementación** (decide formato y destino; Logback o Log4j2, y el JDK incluye `java.util.logging`).
- **Detalles clave:** El código solo conoce la fachada; la implementación se cambia por configuración sin retocar clases, mismo principio que programar contra interfaces. En Spring Boot: SLF4J y Logback incluidos por defecto; Log4j2 sustituible por configuración. Se puede registrar desde el primer proyecto sin dependencias ni configuración.
- **No confundir con:** Log4j (antigua), de la que Logback y Log4j2 son sucesoras.
- **Relacionados:** [Logger de SLF4J](#logger-de-slf4j)
- **Sección:** Fachada e implementación

### Logger de SLF4J

- **Definición:** Objeto que cada clase declara para emitir sus eventos: `private static final Logger log = LoggerFactory.getLogger(Clase.class);`.
- **Detalles clave:** El nombre del logger (por defecto la propia clase) identifica el origen. Se usa con métodos por nivel (`log.error("…", e)`, `log.info(...)`). Los mensajes usan marcadores `{}` en lugar de concatenación: el texto se formatea solo si el nivel está activo.
- **No confundir con:** `IO.printf` (consola sin nivel).
- **Relacionados:** [Fachada e implementación de logging](#fachada-e-implementación-de-logging), [Niveles de log](#niveles-de-log)
- **Sección:** Registrar eventos en el código

### Configuración de logs por paquete

- **Definición:** Declaración en `application.properties` del nivel de log por paquete y de los destinos.
- **Detalles clave:** `logging.level.root=INFO`, `logging.level.org.springframework=WARN` (el framework es muy verboso), `logging.level.com.fpmislata.bookstoreapi=DEBUG`. Paquete del proyecto en `DEBUG` en desarrollo, `INFO` en producción, sin recompilar. `logging.file.name=logs/bookstore.log` añade salida a fichero además de la consola. Nunca se registran datos sensibles (contraseñas, tokens, cabeceras de autenticación).
- **No confundir con:** —
- **Relacionados:** [application.properties](#applicationproperties), [Niveles de log](#niveles-de-log)
- **Sección:** Configuración de niveles y destinos

## Comparativas

| Aspecto | Aplicación web Java tradicional | Spring Boot |
|---|---|---|
| Empaquetado | `.war` | `.jar` ejecutable |
| Servidor | Externo (p. ej. Apache Tomcat), despliegue manual | Tomcat embebido en el `.jar` |
| Configuración | Archivos de despliegue complejos | Proceso simplificado; ajustes en `application.properties` (p. ej. `server.port`) |

| Aspecto | Dependencias manuales (temas anteriores) | Contenedor IoC de Spring |
|---|---|---|
| Creación de objetos | Instanciación y conexión a mano | Escaneo de anotaciones (`@RestController`, `@Service`, `@Repository`, `@Component`) |
| Inyección | Manual | Automática por constructor |

| Aspecto | `@PathVariable` | `@RequestParam` | `@RequestBody` |
|---|---|---|---|
| Origen del dato | Segmento de la URL | Parámetro de consulta tras `?` | Cuerpo JSON |
| Ejemplo | `/api/v1/books/{id}` | `/api/v1/books?page=2` | `BookCreateRequest` |

| Aspecto | Filtro HTTP | `DispatcherServlet` | `@RestControllerAdvice` |
|---|---|---|---|
| Momento | Antes de llegar al `DispatcherServlet` | Recibe la petición y la enruta | Cuando una excepción escapa de un controlador |
| Propósito | Aspectos transversales (auditoría, seguridad, CORS) | Front Controller: enrutar, (de)serializar, invocar | Traducir excepciones a respuestas HTTP |

| Aspecto | Sin manejador (por defecto) | `try-catch` en el controlador | Manejador global |
|---|---|---|---|
| Respuesta | Whitelabel Error Page, 500 sin información útil | Correcta pero repetida | `ResponseEntity` con estado adecuado |
| Problema | No informa al cliente | Duplica código y mezcla responsabilidades | — (punto único centralizado) |

| Excepción | Estado HTTP | Origen |
|---|---|---|
| `BookNotFoundException` | `404 Not Found` | Negocio: recurso inexistente |
| `IllegalArgumentException` | `400 Bad Request` | Negocio: datos de entrada inválidos |
| `Exception` | `500 Internal Server Error` | Error técnico no previsto (mensaje genérico) |

| Aspecto | Consola (`IO.printf`) | Sistema de logs (SLF4J) |
|---|---|---|
| Persistencia | Los mensajes no se guardan | Puede guardarse en fichero (`logging.file.name`) |
| Severidad | Todos se ven igual | Niveles `ERROR`…`TRACE` filtrables |
| Mezcla | Se mezclan con la salida del framework | Niveles por paquete para recortar el framework |
| Control | En el código | Por configuración, sin recompilar |

| Pieza | Papel | En Spring Boot |
|---|---|---|
| SLF4J | Fachada | Incluida por defecto |
| Logback | Implementación por defecto | Incluida por defecto |
| Log4j2 | Implementación alternativa | Sustituible por configuración |

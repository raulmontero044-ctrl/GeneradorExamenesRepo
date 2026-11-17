# Relaciones entre temas

Conceptos que aparecen en más de un tema de la wiki, cómo los trata cada uno y dónde se explican. Solo recoge relaciones que se desprenden de los `conceptos.md` y `contenido.md` de cada tema; no añade contenido nuevo.

- Última revisión: 2026-11-17

Abreviaturas de los temas:

| Abrev. | Tema | Carpeta |
|---|---|---|
| P08 | Programación 08 - Arquitectura de Software por Capas y Diseño de Componentes | [programacion/tema-08-arquitectura](programacion/tema-08-arquitectura/README.md) |
| P09 | Programación 09. APIs REST y Protocolo HTTP | [programacion/tema-09-api-rest-http](programacion/tema-09-api-rest-http/README.md) |
| P10 | Programación 10. Frameworks Web: Spring Boot | [programacion/tema-10-spring-boot](programacion/tema-10-spring-boot/README.md) |
| P12 | Programación 12 - Login con tokens | [programacion/tema-12-login-tokens](programacion/tema-12-login-tokens/README.md) |
| D01 | DWS 01 - Arquitecturas de software | [dws/tema-01-arquitecturas](dws/tema-01-arquitecturas/README.md) |
| D02 | DWS 02 - API First | [dws/tema-02-api-first](dws/tema-02-api-first/README.md) |
| D03 | DWS 03 - Validación e invariancias | [dws/tema-03-validacion](dws/tema-03-validacion/README.md) |
| D04 | DWS 04 - Monolito modular | [dws/tema-04-monolito-modular](dws/tema-04-monolito-modular/README.md) |

## Tabla resumen

| Concepto compartido | Temas | Diferencia principal de enfoque |
|---|---|---|
| [Arquitectura por capas](#arquitectura-por-capas) | P08, D01, P10, D04 | P08 la presenta como patrón jerárquico con reglas de comunicación; D01 la sitúa como una organización interna entre otras (hexagonal, cebolla) y como división lógica no rígida; P10 asocia cada capa a una anotación de estereotipo; D04 la conserva dentro de cada módulo y añade la capa `usecase`. |
| [Repositorio, DAO y dirección de las dependencias](#repositorio-dao-y-dirección-de-las-dependencias) | P08, D01 | P08 coloca la interfaz `BookRepository` en la capa de persistencia; D01 coloca la interfaz `Repository` en `domain` como ejemplo de inversión de dependencias (DIP). |
| [Controlador y servicio](#controlador-y-servicio) | P08, D01, P10, D02, D04 | P08 y D01 definen sus responsabilidades; P10 los implementa con `@RestController`/`@Service`; D02 hace que el controlador implemente una interfaz de contrato; D04 interpone el caso de uso y distingue servicio interno y API del módulo. |
| [DTO](#dto) | P08, P09, P10, D01, D02, D03, D04 | P08 lo justifica (seguridad, desacoplamiento) y lo divide en Request/Response; P09 lo relaciona con el objeto JSON; P10 lo (de)serializa con `@RequestBody` y el Http Message Converter; D01 solo lo ubica en `controller`; D02 lo diseña para el contrato HTTP y puede generarlo; D03 lo valida; D04 lo usa como parte del contrato entre módulos. |
| [Java Record](#java-record) | P08, P09, P10, P12, D03 | P08 lo explica como portador inmutable de datos; P09 y P10 lo usan como forma del DTO; P10 y P12 lo usan para `ApiErrorResponse` y `AuthenticatedPrincipal`; D03 lo usa para value objects que validan en el constructor compacto. |
| [Mapper / mapeo DTO ↔ modelo](#mapper--mapeo-dto--modelo) | P08, P10, D02, D03 | P08 define el mapper; P10 lo clasifica como `@Component`; D02 exige mapear DTO HTTP a modelos internos; D03 cita el mapeador como una vía más de creación que el value object protege. |
| [Inyección de dependencias e IoC](#inyección-de-dependencias-e-ioc) | P08, P10, P12, D01 | P08 explica DI, IoC, ensamblado manual y un contenedor propio; P10 delega en el contenedor de Spring; P12 aplica la inyección por constructor en el filtro; D01 trata un principio distinto, la inversión de dependencias (DIP). |
| [HTTP: métodos, URL y endpoints](#http-métodos-url-y-endpoints) | P09, P10, D02 | P09 explica el protocolo y las buenas prácticas; P10 lo mapea con anotaciones de Spring; D02 lo describe como contrato en OpenAPI (`paths`, operaciones, `requestBody`). |
| [Códigos de estado HTTP](#códigos-de-estado-http) | P09, P10, D02, D03, P12 | P09 da el catálogo y su uso por método; P10 los produce con `ResponseEntity` y el manejador global; D02 los declara en el contrato; D03 fija 400 para formato y 409/422 como ejemplo para errores de negocio; P12 rechaza sin identidad, sin precisar el código. |
| [JSON y serialización](#json-y-serialización) | P09, P10, D02 | P09: formato y parser; P10: Http Message Converter y `@RestController`; D02: OpenAPI se escribe en YAML o JSON y usa `application/json`. |
| [Validación: formato frente a reglas de negocio](#validación-formato-frente-a-reglas-de-negocio) | P08, P09, P10, D02, D03, D04 | P08 separa validación formal (presentación) y validaciones complejas (dominio); P09 y P10 solo apuntan el 400 y `MethodArgumentNotValidException`; D02 introduce Jakarta Bean Validation; D03 lo desarrolla con invariantes y value objects; D04 ubica las reglas que se cumplen siempre en el servicio. |
| [Gestión centralizada de errores](#gestión-centralizada-de-errores) | P10, D03, P12 | P10 introduce `@RestControllerAdvice`/`@ExceptionHandler` y `ApiErrorResponse`; D03 lo usa para validación con `ProblemDetail` (RFC 9457) y para excepciones de dominio; P12 lanza `AuthenticationRequiredException` desde el controlador. |
| [Contrato y API](#contrato-y-api) | P09, D01, D02, D03, D04 | P09: endpoints REST; D01: API pública/interna entre módulos; D02: API como contrato HTTP, API First y OpenAPI; D03: el DTO y sus anotaciones describen el contrato; D04: API pública del módulo. |
| [OpenAPI, springdoc-openapi y Swagger UI](#openapi-springdoc-openapi-y-swagger-ui) | D02, D03 | D02 compara springdoc-openapi y OpenAPI Generator como fuentes del contrato; D03 muestra cómo las constraints se reflejan (o no) en el esquema. |
| [Monolito, monolito modular y módulos](#monolito-monolito-modular-y-módulos) | D01, D04 | D01 los clasifica como estilos de despliegue frente a microservicios; D04 desarrolla la organización interna del monolito modular y su verificación. |
| [Filtros HTTP y modelo Servlet](#filtros-http-y-modelo-servlet) | P10, P12 | P10 explica la Filter Chain, `OncePerRequestFilter` y un filtro de auditoría; P12 lo aplica para autenticar el token de acceso y gestionar el `SecurityContext`. |
| [Autenticación y autorización](#autenticación-y-autorización) | P09, P10, P12, D04 | P09 distingue 401 y 403; P10 cita la verificación de cabeceras de autenticación en filtros; P12 desarrolla el login con tokens; D04 ubica la autorización de usuario en el caso de uso. |
| [Pruebas y testabilidad](#pruebas-y-testabilidad) | P08, D01, D02, D03, D04 | P08: DI permite mocks; D01: principio «testeable»; D02: comprobación de conformidad; D03: estrategia por pieza; D04: tests de arquitectura. |
| [Registro (logs) y datos sensibles](#registro-logs-y-datos-sensibles) | P10, P12 | P10 prohíbe registrar contraseñas, tokens y cabeceras de autenticación; P12 indica que el token nunca se escribe en logs. |

## Arquitectura y organización del código

### Arquitectura por capas

- **P08** — Patrón de diseño (*Layered Architecture*) que divide la aplicación en niveles jerárquicos: presentación (`controller`), dominio (`domain`) y persistencia (`persistence`). Cada capa ofrece servicios a la inmediatamente superior y se rige por tres reglas: flujo unidireccional (Controller → Service → Repository), prohibido el salto de capas y aislamiento. Surge como solución al código espagueti.
  - [2. La Arquitectura por Capas (Layered Architecture)](programacion/tema-08-arquitectura/contenido.md#2-la-arquitectura-por-capas-layered-architecture) · [Principales Capas del Sistema](programacion/tema-08-arquitectura/contenido.md#principales-capas-del-sistema) · [Reglas de Comunicación entre Capas](programacion/tema-08-arquitectura/contenido.md#reglas-de-comunicación-entre-capas)
- **D01** — Una de las tres organizaciones internas (junto a hexagonal y cebolla): agrupa componentes por responsabilidad y delega entre capas. Insiste en que las capas son una división lógica, no una estructura rígida (se pueden añadir, dividir o reorganizar), y en evitar que el dominio dependa directamente de tecnologías. Es la arquitectura de referencia del curso, desplegada como monolito modular. La distingue de la arquitectura de despliegue.
  - [2.1 Arquitectura por capas](dws/tema-01-arquitecturas/contenido.md#21-arquitectura-por-capas) · [2. Organización interna](dws/tema-01-arquitecturas/contenido.md#2-organización-interna)
- **P10** — No redefine las capas: las asocia a anotaciones de estereotipo (`@RestController` → presentación, `@Service` → negocio, `@Repository` → persistencia, `@Component` → genérica) para que el contenedor de Spring las gestione.
  - [6. Integración con el Contenedor IoC de Spring](programacion/tema-10-spring-boot/contenido.md#6-integración-con-el-contenedor-ioc-de-spring)
- **D04** — Conserva las capas dentro de cada módulo de negocio (paquete `internal`: `application`, `controller`, `domain`, `persistence` y después `usecase`) y añade la capa `usecase` entre controlador y servicio. Contrapone la organización por capas (por responsabilidad técnica) a la organización por módulos (por capacidad de negocio).
  - [1. Una posible arquitectura modular](dws/tema-04-monolito-modular/contenido.md#1-una-posible-arquitectura-modular) · [6. Qué cambia y qué permanece](dws/tema-04-monolito-modular/contenido.md#6-qué-cambia-y-qué-permanece)

### Repositorio, DAO y dirección de las dependencias

- **P08** — Dentro de la capa de persistencia hay dos niveles: el repositorio (`BookRepository`/`BookRepositoryImpl`, que sirve al dominio) y el DAO (`BookDao`/`BookDaoImpl`, que accede físicamente a los datos y usa `BookEntity`). En el diagrama, la interfaz `BookRepository` pertenece a la capa de persistencia y `BookServiceImpl` la consume «hacia abajo».
  - [Diagrama de componentes del ejemplo (libros)](programacion/tema-08-arquitectura/contenido.md#diagrama-de-componentes-del-ejemplo-libros)
- **D01** — La interfaz `Repository` se define en `domain` y `RepositoryImpl` en `persistence`; el DAO (interfaz e implementación) está entero en `persistence`. Es el ejemplo de inversión de dependencias (DIP): el dominio no depende de la tecnología de persistencia. La misma idea aparece como `RepositoryPort`/`RepositoryAdapter` en la hexagonal y como `Repository` en el núcleo / `RepositoryImpl` en infraestructura en la cebolla.
  - [2.1 Arquitectura por capas](dws/tema-01-arquitecturas/contenido.md#21-arquitectura-por-capas) · [1. Principios de arquitectura limpia](dws/tema-01-arquitecturas/contenido.md#1-principios-de-arquitectura-limpia)
- **Diferencia clave:** en P08 todas las dependencias van hacia la capa inferior (también hacia la interfaz del repositorio, en persistencia); en D01 las dependencias apuntan hacia el dominio (regla de dependencia) porque es el dominio quien define la interfaz del repositorio.

### Controlador y servicio

- **P08** — La presentación recibe datos, los valida formalmente, llama al dominio y devuelve el resultado formateado; no contiene lógica de negocio ni accede a datos. `BookController` consume la interfaz `BookService`; `BookServiceImpl` aplica las reglas de negocio.
  - [Principales Capas del Sistema](programacion/tema-08-arquitectura/contenido.md#principales-capas-del-sistema)
- **D01** — `Controller` invoca la interfaz `Service`, no su implementación; `ServiceImpl` aplica reglas sobre `Model` y usa la interfaz `Repository`. En la hexagonal, el `RestController` es un adaptador de entrada que invoca un `InputPort`.
  - [2.1 Arquitectura por capas](dws/tema-01-arquitecturas/contenido.md#21-arquitectura-por-capas) · [2.2 Arquitectura hexagonal (Ports and Adapters)](dws/tema-01-arquitecturas/contenido.md#22-arquitectura-hexagonal-ports-and-adapters)
- **P10** — `@RestController` con `@RequestMapping`; el controlador solo delega en el `Service` y traduce el resultado a una respuesta HTTP. Señala como antipatrón meter `try-catch` en el controlador (mezcla presentación y gestión de errores).
  - [Ejemplo práctico: BookController](programacion/tema-10-spring-boot/contenido.md#ejemplo-práctico-bookcontroller) · [El problema de los try-catch en el controlador](programacion/tema-10-spring-boot/contenido.md#el-problema-de-los-try-catch-en-el-controlador)
- **D02** — El controlador (`OrderController`) implementa una interfaz de contrato HTTP (`OrderHttpApi`) o las interfaces generadas por OpenAPI Generator, separando las declaraciones del contrato de su lógica.
  - [3. Contrato e implementación en Spring](dws/tema-02-api-first/contenido.md#3-contrato-e-implementación-en-spring)
- **D04** — El flujo HTTP pasa por un caso de uso: `CatalogController → CatalogUseCase → CatalogService`; la entrada entre módulos es `CatalogModule → CatalogModuleImpl → CatalogService`. El servicio interno es el punto en el que confluyen ambas entradas y aloja las reglas e invariantes que se cumplen siempre.
  - [3. Separar los flujos de entrada con casos de uso](dws/tema-04-monolito-modular/contenido.md#3-separar-los-flujos-de-entrada-con-casos-de-uso)

## Datos que cruzan fronteras

### DTO

- **P08** — Objeto que gestiona la entrada y salida entre la presentación y el exterior en lugar de exponer las entidades del dominio. Ventajas: seguridad y privacidad, especialización (Request DTO / Response DTO) y desacoplamiento. Se implementa con Java Records.
  - [3. DTOs (Data Transfer Objects) y Java Records](programacion/tema-08-arquitectura/contenido.md#3-dtos-data-transfer-objects-y-java-records)
- **P09** — Enfoque desde el formato: un objeto JSON se corresponde con un DTO (Java Record) y una colección JSON con un `List`; el parser convierte entre ambos. Si falla la validación de un DTO, se responde `400 Bad Request`.
  - [4. Formato de Intercambio: JSON](programacion/tema-09-api-rest-http/contenido.md#4-formato-de-intercambio-json) · [Objeto JSON simple (Mapea con un DTO)](programacion/tema-09-api-rest-http/contenido.md#objeto-json-simple-mapea-con-un-dto)
- **P10** — Enfoque desde el framework: `@RequestBody` deserializa el cuerpo JSON en un Record/DTO (p. ej. `BookCreateRequest`) mediante el Http Message Converter; `ResponseEntity` devuelve DTOs junto al código de estado.
  - [Extraer datos de la Petición](programacion/tema-10-spring-boot/contenido.md#extraer-datos-de-la-petición) · [El patrón Front Controller (DispatcherServlet)](programacion/tema-10-spring-boot/contenido.md#el-patrón-front-controller-dispatcherservlet) · [5. Gestión de Respuestas HTTP con ResponseEntity](programacion/tema-10-spring-boot/contenido.md#5-gestión-de-respuestas-http-con-responseentity)
- **D01** — Solo los ubica: DTO de entrada y de salida en la capa `controller`, junto a los controladores (distintos del `Model` del dominio).
  - [2.1 Arquitectura por capas](dws/tema-01-arquitecturas/contenido.md#21-arquitectura-por-capas)
- **D02** — DTO HTTP: describen los datos que cruzan la frontera HTTP, se diseñan para el contrato y no tienen por qué coincidir con los modelos internos; se mapean a ellos. Con OpenAPI Generator se generan a partir del contrato.
  - [02 - API First](dws/tema-02-api-first/contenido.md#02---api-first) · [3. Contrato e implementación en Spring](dws/tema-02-api-first/contenido.md#3-contrato-e-implementación-en-spring)
- **D03** — DTO de entrada: describe el contrato de una operación y lleva las anotaciones de validación; puede contener DTO anidados validados en cascada. Se contrapone al value object del dominio.
  - [2. Validación de entrada con Jakarta Validation](dws/tema-03-validacion/contenido.md#2-validación-de-entrada-con-jakarta-validation) · [2.2 Validación automática y en cascada](dws/tema-03-validacion/contenido.md#22-validación-automática-y-en-cascada)
- **D04** — DTO del contrato de un módulo (p. ej. `BookSummary` en `catalog.dto`): no cruza una frontera HTTP sino la frontera entre módulos; con Spring Modulith hay que exponer el subpaquete con `@NamedInterface` o colocarlos en el paquete raíz.
  - [2. API pública e implementación interna](dws/tema-04-monolito-modular/contenido.md#2-api-pública-e-implementación-interna) · [5. Spring Modulith: detección y verificación de módulos](dws/tema-04-monolito-modular/contenido.md#5-spring-modulith-detección-y-verificación-de-módulos)
- **Hilo común:** todos los temas coinciden en no exponer directamente los modelos o entidades del dominio (P08, D02) o los modelos internos del módulo (D04).

### Java Record

- **P08** — Clase inmutable de sintaxis compacta (Java 14+) para transportar datos: componentes `private final`, accesores `isbn()` (no `getIsbn()`), `equals()`/`hashCode()` por valor y `toString()` generados.
  - [Java Records](programacion/tema-08-arquitectura/contenido.md#java-records)
- **P09** — El DTO al que el parser convierte el JSON se denomina «DTO (Java Record)».
  - [4. Formato de Intercambio: JSON](programacion/tema-09-api-rest-http/contenido.md#4-formato-de-intercambio-json)
- **P10** — `@RequestBody` deserializa a un Record/DTO; el cuerpo de error es el record `ApiErrorResponse(String message)`.
  - [Ejemplo práctico: GlobalExceptionHandler](programacion/tema-10-spring-boot/contenido.md#ejemplo-práctico-globalexceptionhandler)
- **P12** — `AuthenticatedPrincipal(Long userId, Set<String> roles)` es un record que implementa `Principal` y copia los roles en su constructor compacto con `Set.copyOf(roles)`.
  - [6. Principal y estado por petición](programacion/tema-12-login-tokens/contenido.md#6-principal-y-estado-por-petición)
- **D03** — El record deja de ser un mero portador de datos: el value object `record Iban(String value)` valida en su constructor compacto y lanza `InvalidIbanException`, de modo que el tipo no puede existir en estado inválido.
  - [3. Invariancias con value objects](dws/tema-03-validacion/contenido.md#3-invariancias-con-value-objects)
- **Diferencia clave:** P08 lo presenta «sin lógica de negocio»; P12 y D03 usan el constructor compacto para copiar o validar datos.

### Mapper / mapeo DTO ↔ modelo

- **P08** — `BookMapper` con `toDomain(BookCreateRequest)` y `toResponse(Book)`; responsabilidad que surge al separar DTOs y entidades.
  - [Conversión entre objetos: Mapeadores (Mappers)](programacion/tema-08-arquitectura/contenido.md#conversión-entre-objetos-mapeadores-mappers)
- **P10** — Los mapeadores se registran como `@Component` (componentes transversales).
  - [6. Integración con el Contenedor IoC de Spring](programacion/tema-10-spring-boot/contenido.md#6-integración-con-el-contenedor-ioc-de-spring)
- **D02** — Los DTO HTTP se mapean a modelos internos; no se exponen los modelos del dominio.
  - [3. Contrato e implementación en Spring](dws/tema-02-api-first/contenido.md#3-contrato-e-implementación-en-spring)
- **D03** — El mapeador es una de las vías de creación del value object (junto a deserialización, caso de uso u otro módulo), y por eso la invariante debe vivir en el tipo y no en el DTO.
  - [3. Invariancias con value objects](dws/tema-03-validacion/contenido.md#3-invariancias-con-value-objects)

## Gestión de dependencias

### Inyección de dependencias e IoC

- **P08** — Explicación completa: DI (la clase recibe sus dependencias desde fuera), inyección por constructor como buena práctica (`private final BookDao bookDao`), IoC como principio más amplio, ensamblado manual en `main`, un contenedor de IoC hecho a mano con el patrón Factory (`IoCContainer`) y ventajas (desacoplamiento, mocks). Anticipa que Spring automatiza el contenedor.
  - [4. Gestión de Dependencias: DI e IoC](programacion/tema-08-arquitectura/contenido.md#4-gestión-de-dependencias-di-e-ioc) · [Inyección de Dependencias (DI)](programacion/tema-08-arquitectura/contenido.md#inyección-de-dependencias-di) · [Inyección por constructor (Buena práctica)](programacion/tema-08-arquitectura/contenido.md#inyección-por-constructor-buena-práctica) · [Inversión de Control (IoC)](programacion/tema-08-arquitectura/contenido.md#inversión-de-control-ioc) · [Ensamblado manual del sistema](programacion/tema-08-arquitectura/contenido.md#ensamblado-manual-del-sistema) · [El contenedor de IoC (IoC Container)](programacion/tema-08-arquitectura/contenido.md#el-contenedor-de-ioc-ioc-container)
- **P10** — El contenedor IoC de Spring sustituye al ensamblado manual: detecta las clases por escaneo de anotaciones de estereotipo, gestiona su ciclo de vida (beans) e inyecta automáticamente por constructor (p. ej. `BookService` en `BookController`). `@RestControllerAdvice` también se registra como bean.
  - [1. Introducción a Spring Boot](programacion/tema-10-spring-boot/contenido.md#1-introducción-a-spring-boot) · [6. Integración con el Contenedor IoC de Spring](programacion/tema-10-spring-boot/contenido.md#6-integración-con-el-contenedor-ioc-de-spring)
- **P12** — Aplicación práctica: `AccessTokenFilter` (`@Component`) recibe un `AuthService` por constructor.
  - [El filtro AccessTokenFilter](programacion/tema-12-login-tokens/contenido.md#el-filtro-accesstokenfilter)
- **D01** — No trata la DI sino la **inversión de dependencias (DIP)**, principio de arquitectura limpia: el núcleo define las abstracciones y los detalles externos las implementan.
  - [2.1 Arquitectura por capas](dws/tema-01-arquitecturas/contenido.md#21-arquitectura-por-capas) · [1. Principios de arquitectura limpia](dws/tema-01-arquitecturas/contenido.md#1-principios-de-arquitectura-limpia)
- **No confundir:** DI (patrón, P08), IoC (principio de delegar la creación de objetos, P08/P10) y DIP (dónde se definen las abstracciones, D01) son conceptos distintos en la wiki; coinciden en que las clases dependan de interfaces y no de implementaciones concretas.

## HTTP y API REST

### HTTP: métodos, URL y endpoints

- **P09** — Base conceptual: modelo cliente-servidor, anatomía de la URL (protocolo, host, ruta, query params), endpoints con sustantivos en plural y anidamiento, y los cinco métodos (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) con dónde viajan los datos.
  - [1. El protocolo HTTP](programacion/tema-09-api-rest-http/contenido.md#1-el-protocolo-http) · [Anatomía de una URL / URI](programacion/tema-09-api-rest-http/contenido.md#anatomía-de-una-url--uri) · [Buenas prácticas en el diseño de Endpoints](programacion/tema-09-api-rest-http/contenido.md#buenas-prácticas-en-el-diseño-de-endpoints) · [3. Métodos HTTP y transmisión de datos](programacion/tema-09-api-rest-http/contenido.md#3-métodos-http-y-transmisión-de-datos)
- **P10** — Implementación en Spring: `@RequestMapping("/api/v1/books")` y `@GetMapping`, `@PostMapping`, `@PutMapping` (actualización completa), `@DeleteMapping`; los datos de la URL se extraen con `@PathVariable` (Path Params) y `@RequestParam` (Query Params), y el cuerpo con `@RequestBody`. La tabla de anotaciones del tema no incluye `PATCH`. El `DispatcherServlet` enruta por ruta y verbo con el Handler Mapping.
  - [Anotaciones de mapeo HTTP](programacion/tema-10-spring-boot/contenido.md#anotaciones-de-mapeo-http) · [Extraer datos de la Petición](programacion/tema-10-spring-boot/contenido.md#extraer-datos-de-la-petición) · [El patrón Front Controller (DispatcherServlet)](programacion/tema-10-spring-boot/contenido.md#el-patrón-front-controller-dispatcherservlet)
- **D02** — Las mismas piezas como contrato: OpenAPI define rutas y operaciones, parámetros, esquemas, respuestas y restricciones (ejemplo: `post` sobre `/orders` con `requestBody` obligatorio en `application/json`).
  - [2. OpenAPI y Swagger](dws/tema-02-api-first/contenido.md#2-openapi-y-swagger) · [Ejemplo de fragmento OpenAPI](dws/tema-02-api-first/contenido.md#ejemplo-de-fragmento-openapi)

### Códigos de estado HTTP

- **P09** — Catálogo: familias 2xx/3xx/4xx/5xx; `200` (GET, PUT, PATCH), `201` (POST), `204` (DELETE), `400`, `401`, `403`, `404`, `500`.
  - [5. Códigos de Estado HTTP](programacion/tema-09-api-rest-http/contenido.md#5-códigos-de-estado-http)
- **P10** — Cómo producirlos: `ResponseEntity.ok` (200), `status(HttpStatus.CREATED)` (201), `noContent().build()` (204), etc.; el manejador global traduce `BookNotFoundException` → 404, `IllegalArgumentException` → 400 y `Exception` → 500 genérico; sin manejador, la Whitelabel Error Page responde 500.
  - [5. Gestión de Respuestas HTTP con ResponseEntity](programacion/tema-10-spring-boot/contenido.md#5-gestión-de-respuestas-http-con-responseentity) · [7. Gestión de Excepciones: el Manejador Global](programacion/tema-10-spring-boot/contenido.md#7-gestión-de-excepciones-el-manejador-global)
- **D02** — Las respuestas forman parte del contrato: el fragmento OpenAPI declara `'201'` («Order created») y `'400'` («Invalid request»); cambiar el significado de una respuesta puede ser un cambio incompatible.
  - [Ejemplo de fragmento OpenAPI](dws/tema-02-api-first/contenido.md#ejemplo-de-fragmento-openapi) · [4. Cambios y comprobaciones](dws/tema-02-api-first/contenido.md#4-cambios-y-comprobaciones)
- **D03** — Distingue el origen del error: `400` con campo y motivo para fallos de formato (documento `ProblemDetail`) y, para excepciones de dominio, el error documentado en el contrato, por ejemplo `409` o `422` (códigos que P09 no recoge).
  - [2.4 El resultado: 400 coherente con la API](dws/tema-03-validacion/contenido.md#24-el-resultado-400-coherente-con-la-api) · [4. ¿Duplicar la regla en dos sitios?](dws/tema-03-validacion/contenido.md#4-duplicar-la-regla-en-dos-sitios)
- **P12** — En una ruta protegida sin identidad, el controlador lanza `AuthenticationRequiredException`; la wiki no indica con qué código se responde.
  - [Rutas públicas y protegidas](programacion/tema-12-login-tokens/contenido.md#rutas-públicas-y-protegidas)

### JSON y serialización

- **P09** — JSON es el formato estándar de las APIs REST; el parser del servidor convierte JSON ↔ Java Record (DTO).
  - [4. Formato de Intercambio: JSON](programacion/tema-09-api-rest-http/contenido.md#4-formato-de-intercambio-json)
- **P10** — Ese parser se concreta en el Http Message Converter que consulta el `DispatcherServlet`; `@RestController` serializa el valor devuelto en el cuerpo de la respuesta; `@RestControllerAdvice` serializa directamente en JSON. `HttpMessageNotReadableException` se lanza si el JSON no se puede deserializar.
  - [El patrón Front Controller (DispatcherServlet)](programacion/tema-10-spring-boot/contenido.md#el-patrón-front-controller-dispatcherservlet) · [Excepciones del propio framework](programacion/tema-10-spring-boot/contenido.md#excepciones-del-propio-framework)
- **D02** — OpenAPI describe la API en YAML o JSON y declara cuerpos `application/json`.
  - [2. OpenAPI y Swagger](dws/tema-02-api-first/contenido.md#2-openapi-y-swagger)

## Validación y errores

### Validación: formato frente a reglas de negocio

- **P08** — Primera aparición de la distinción: la presentación solo hace validaciones **formales**; las **validaciones complejas** son reglas de negocio del dominio.
  - [Principales Capas del Sistema](programacion/tema-08-arquitectura/contenido.md#principales-capas-del-sistema)
- **P09** — Solo menciona que el fallo de validación de un DTO produce `400 Bad Request`.
  - [5. Códigos de Estado HTTP](programacion/tema-09-api-rest-http/contenido.md#5-códigos-de-estado-http)
- **P10** — Cita `MethodArgumentNotValidException` (falla la validación de los datos de entrada) y remite su tratamiento detallado a la validación de datos.
  - [Excepciones del propio framework](programacion/tema-10-spring-boot/contenido.md#excepciones-del-propio-framework)
- **D02** — Introduce Jakarta Bean Validation (`@NotBlank`, `@Email`, `@Size`, `@Valid`) para el formato de la solicitud en la capa de presentación; las reglas de negocio siguen en el dominio. Remite al tema 03.
  - [02 - API First](dws/tema-02-api-first/contenido.md#02---api-first)
- **D03** — Desarrollo completo: dos preguntas, dos fronteras (formato del contrato en el DTO con Jakarta Validation frente a invariantes en el dominio); constraints estándar y personalizadas, `@Valid` y cascada; value objects que protegen la invariante en toda vía de creación; la regla puede duplicarse sin ser redundante; `jakarta.validation` está prohibido en el dominio por la verificación de módulos del tema 04.
  - [1. Dos preguntas, dos fronteras](dws/tema-03-validacion/contenido.md#1-dos-preguntas-dos-fronteras) · [2. Validación de entrada con Jakarta Validation](dws/tema-03-validacion/contenido.md#2-validación-de-entrada-con-jakarta-validation) · [3. Invariancias con value objects](dws/tema-03-validacion/contenido.md#3-invariancias-con-value-objects) · [3.1 Por qué no Jakarta Validation en el dominio](dws/tema-03-validacion/contenido.md#31-por-qué-no-jakarta-validation-en-el-dominio) · [4. ¿Duplicar la regla en dos sitios?](dws/tema-03-validacion/contenido.md#4-duplicar-la-regla-en-dos-sitios)
- **D04** — Añade otra distinción: las reglas e invariantes que se cumplen siempre residen en el servicio interno; las políticas de acceso que dependen de quién inicia el flujo, en el caso de uso.
  - [3. Separar los flujos de entrada con casos de uso](dws/tema-04-monolito-modular/contenido.md#3-separar-los-flujos-de-entrada-con-casos-de-uso)

### Gestión centralizada de errores

- **P10** — `@RestControllerAdvice` + `@ExceptionHandler` como punto único de traducción de excepciones a respuestas HTTP (se elige el manejador más específico); excepciones de dominio no verificadas (`RuntimeException`) como `BookNotFoundException`; cuerpo `ApiErrorResponse`; captura final de `Exception` con mensaje genérico y sin detalles técnicos.
  - [Manejo centralizado: @RestControllerAdvice y @ExceptionHandler](programacion/tema-10-spring-boot/contenido.md#manejo-centralizado-restcontrolleradvice-y-exceptionhandler) · [Ejemplo práctico: GlobalExceptionHandler](programacion/tema-10-spring-boot/contenido.md#ejemplo-práctico-globalexceptionhandler)
- **D03** — Mismo mecanismo aplicado a la validación: `@ExceptionHandler(MethodArgumentNotValidException.class)` devuelve un `ProblemDetail` (RFC 9457) con título «Solicitud inválida» y propiedad `errors`, en lugar de un record propio; el mismo manejador traduce las excepciones de dominio (p. ej. `InvalidIbanException`) al error del contrato.
  - [2.4 El resultado: 400 coherente con la API](dws/tema-03-validacion/contenido.md#24-el-resultado-400-coherente-con-la-api) · [4. ¿Duplicar la regla en dos sitios?](dws/tema-03-validacion/contenido.md#4-duplicar-la-regla-en-dos-sitios)
- **P12** — El controlador lanza `AuthenticationRequiredException` cuando no hay `Principal` en una ruta protegida.
  - [Rutas públicas y protegidas](programacion/tema-12-login-tokens/contenido.md#rutas-públicas-y-protegidas)

## Contratos, módulos y despliegue

### Contrato y API

- **P09** — Enfoque REST: endpoints como URLs que exponen recursos, cuya acción determina el método HTTP.
  - [2. Servicios REST y Diseño de Endpoints](programacion/tema-09-api-rest-http/contenido.md#2-servicios-rest-y-diseño-de-endpoints)
- **D01** — API pública / API interna: interfaz explícita con la que los módulos de un monolito modular colaboran en el mismo proceso (llamada directa síncrona), frente a la comunicación HTTP entre microservicios.
  - [3.1 Monolito, monolito modular y microservicios](dws/tema-01-arquitecturas/contenido.md#31-monolito-monolito-modular-y-microservicios) · [3.2 Tipos de comunicación](dws/tema-01-arquitecturas/contenido.md#32-tipos-de-comunicación)
- **D02** — La API como contrato entre la aplicación y sus consumidores (operaciones, datos y respuestas); se centra en el contrato HTTP y advierte que la misma idea se aplica entre módulos (tema 04). API First frente a Code First, fuente de verdad del contrato, cambios incompatibles y comprobación de conformidad. La interfaz `OrderHttpApi` se llama así para no confundirla con una API interna de módulo.
  - [02 - API First](dws/tema-02-api-first/contenido.md#02---api-first) · [1. API First y Code First](dws/tema-02-api-first/contenido.md#1-api-first-y-code-first) · [3. Contrato e implementación en Spring](dws/tema-02-api-first/contenido.md#3-contrato-e-implementación-en-spring) · [4. Cambios y comprobaciones](dws/tema-02-api-first/contenido.md#4-cambios-y-comprobaciones)
- **D03** — El DTO describe el contrato y sus anotaciones, qué solicitudes admite; una constraint personalizada no documentada hace que el contrato «mienta».
  - [2. Validación de entrada con Jakarta Validation](dws/tema-03-validacion/contenido.md#2-validación-de-entrada-con-jakarta-validation) · [2.5 Del código al contrato: OpenAPI](dws/tema-03-validacion/contenido.md#25-del-código-al-contrato-openapi)
- **D04** — API pública del módulo (`CatalogModule`) y sus DTO como contrato entre módulos; los demás dependen del contrato, no de la implementación (`CatalogModuleImpl`, `CatalogService`). En Spring Modulith, el paquete raíz del módulo es su API pública.
  - [2. API pública e implementación interna](dws/tema-04-monolito-modular/contenido.md#2-api-pública-e-implementación-interna) · [5. Spring Modulith: detección y verificación de módulos](dws/tema-04-monolito-modular/contenido.md#5-spring-modulith-detección-y-verificación-de-módulos)

### OpenAPI, springdoc-openapi y Swagger UI

- **D02** — OpenAPI es la especificación; Swagger, las herramientas; Swagger UI, la documentación interactiva (que no demuestra por sí sola la conformidad). springdoc-openapi genera OpenAPI desde el código (ligado a Java) y OpenAPI Generator genera código desde el archivo OpenAPI (contrato independiente).
  - [2. OpenAPI y Swagger](dws/tema-02-api-first/contenido.md#2-openapi-y-swagger) · [3. Contrato e implementación en Spring](dws/tema-02-api-first/contenido.md#3-contrato-e-implementación-en-spring)
- **D03** — springdoc-openapi traduce las constraints estándar al esquema (`@NotBlank` → requerido, `@Size` → longitud máxima, `@Min` → mínimo); las personalizadas hay que documentarlas a mano (p. ej. `@Schema`).
  - [2.5 Del código al contrato: OpenAPI](dws/tema-03-validacion/contenido.md#25-del-código-al-contrato-openapi)

### Monolito, monolito modular y módulos

- **D01** — Estilos de **despliegue**: monolito (una unidad; puede crecer con alto acoplamiento, pero no implica código desordenado), monolito modular (una unidad con módulos de límites y APIs internas explícitas; estilo de referencia del curso) y microservicios (varios desplegables, comunicación por red). Separar módulos en carpetas no los convierte en microservicios.
  - [3. Arquitectura de despliegue](dws/tema-01-arquitecturas/contenido.md#3-arquitectura-de-despliegue) · [3.1 Monolito, monolito modular y microservicios](dws/tema-01-arquitecturas/contenido.md#31-monolito-monolito-modular-y-microservicios)
- **D04** — Organización **interna** del monolito modular: el problema del monolito no es desplegarse como unidad sino la falta de límites entre capacidades; módulos de negocio con API pública y DTO, paquete `internal`, casos de uso, modelos privados relacionados mediante identificadores y verificación con ArchUnit y Spring Modulith. Es una opción entre varias, no una receta universal.
  - [04 - Monolito modular](dws/tema-04-monolito-modular/contenido.md#04---monolito-modular) · [1. Una posible arquitectura modular](dws/tema-04-monolito-modular/contenido.md#1-una-posible-arquitectura-modular) · [4. Modelos privados y relaciones mediante identificadores](dws/tema-04-monolito-modular/contenido.md#4-modelos-privados-y-relaciones-mediante-identificadores) · [6. Qué cambia y qué permanece](dws/tema-04-monolito-modular/contenido.md#6-qué-cambia-y-qué-permanece)
- **Diferencia clave:** D01 compara estilos de despliegue; D04 asume el monolito modular y explica cómo estructurar y verificar sus módulos. D01 cita también la comunicación entre módulos mediante eventos, que D04 no desarrolla.

## Infraestructura web y seguridad

### Filtros HTTP y modelo Servlet

- **P10** — Servlet como especificación base (`jakarta.servlet`); los filtros forman una cadena de responsabilidad (Filter Chain) que actúa antes del `DispatcherServlet` para aspectos transversales (auditoría, verificación de cabeceras de autenticación, CORS). Ejemplo `AuditLogFilter` que extiende `OncePerRequestFilter` y llama a `filterChain.doFilter`.
  - [2. Arquitectura Interna: Servlets y el patrón Front Controller](programacion/tema-10-spring-boot/contenido.md#2-arquitectura-interna-servlets-y-el-patrón-front-controller) · [3. Interceptación de peticiones: Filtros HTTP](programacion/tema-10-spring-boot/contenido.md#3-interceptación-de-peticiones-filtros-http) · [Ejemplo: Creación de un filtro personalizado](programacion/tema-10-spring-boot/contenido.md#ejemplo-creación-de-un-filtro-personalizado)
- **P12** — Uso para seguridad: `AccessTokenFilter` extiende `OncePerRequestFilter`, extrae el token Bearer, lo autentica, guarda el `Principal` en `SecurityContext` (`ThreadLocal`) y lo limpia en `finally`, porque Tomcat reutiliza hilos. Subraya que la idea del filtro y su posición en la cadena pertenecen al modelo Servlet, no a Spring.
  - [7. Filtro Servlet y SecurityContext propio](programacion/tema-12-login-tokens/contenido.md#7-filtro-servlet-y-securitycontext-propio) · [El filtro AccessTokenFilter](programacion/tema-12-login-tokens/contenido.md#el-filtro-accesstokenfilter) · [6. Principal y estado por petición](programacion/tema-12-login-tokens/contenido.md#6-principal-y-estado-por-petición)

### Autenticación y autorización

- **P09** — Desde los códigos de estado: `401 Unauthorized` (el cliente debe autenticarse) frente a `403 Forbidden` (no tiene permisos).
  - [5. Códigos de Estado HTTP](programacion/tema-09-api-rest-http/contenido.md#5-códigos-de-estado-http)
- **P10** — La verificación de cabeceras de autenticación o seguridad es uno de los usos de los filtros HTTP.
  - [3. Interceptación de peticiones: Filtros HTTP](programacion/tema-10-spring-boot/contenido.md#3-interceptación-de-peticiones-filtros-http)
- **P12** — Desarrollo completo: autenticación («¿quién?») frente a autorización («¿qué puede hacer?»), login con par de tokens opacos, cabecera `Authorization` con esquema `Bearer`, renovación con rotación y `Principal` con id y roles.
  - [1. Autenticación y autorización](programacion/tema-12-login-tokens/contenido.md#1-autenticación-y-autorización) · [3. Token de acceso y refresh token](programacion/tema-12-login-tokens/contenido.md#3-token-de-acceso-y-refresh-token) · [6. Principal y estado por petición](programacion/tema-12-login-tokens/contenido.md#6-principal-y-estado-por-petición)
- **D04** — Dónde se comprueba la autorización de usuario: en el caso de uso (políticas de acceso, p. ej. ser administradora para crear un libro), no en el controlador ni indiscriminadamente en el servicio, para no evaluar llamadas legítimas de otros módulos con una identidad que no corresponde.
  - [3. Separar los flujos de entrada con casos de uso](dws/tema-04-monolito-modular/contenido.md#3-separar-los-flujos-de-entrada-con-casos-de-uso)

## Calidad y operación

### Pruebas y testabilidad

- **P08** — La DI permite pasar un mock al constructor y probar la lógica de negocio aisladamente; el código espagueti impide las pruebas unitarias.
  - [Ventajas de IoC / DI](programacion/tema-08-arquitectura/contenido.md#ventajas-de-ioc--di)
- **D01** — «Testeable» como principio de arquitectura limpia: las reglas se prueban sin levantar interfaz, base de datos ni framework.
  - [1. Principios de arquitectura limpia](dws/tema-01-arquitecturas/contenido.md#1-principios-de-arquitectura-limpia)
- **D02** — Comprobación de conformidad con el contrato: validar la sintaxis OpenAPI, comparar versiones, comprobar solicitudes y respuestas y pruebas HTTP de `controller`.
  - [4. Cambios y comprobaciones](dws/tema-02-api-first/contenido.md#4-cambios-y-comprobaciones)
- **D03** — Qué probar en cada pieza: value objects con tests unitarios sin framework ni mocks; validadoras directamente; DTO con integración HTTP (`@WebMvcTest`, `MockMvc`, `@MockitoBean`); el manejador una sola vez.
  - [5. Pruebas](dws/tema-03-validacion/contenido.md#5-pruebas)
- **D04** — Tests de arquitectura (ArchUnit, `ApplicationModules.verify()`) que verifican los límites entre módulos; no son protección en tiempo de compilación.
  - [2.1 Verificar los límites entre módulos](dws/tema-04-monolito-modular/contenido.md#21-verificar-los-límites-entre-módulos) · [5. Spring Modulith: detección y verificación de módulos](dws/tema-04-monolito-modular/contenido.md#5-spring-modulith-detección-y-verificación-de-módulos)

### Registro (logs) y datos sensibles

- **P10** — Sistema de logs con SLF4J y Logback; nunca se registran datos sensibles (contraseñas, tokens, cabeceras de autenticación); el manejador global registra con `log.error` los errores no previstos sin devolver detalles técnicos al cliente.
  - [Configuración de niveles y destinos](programacion/tema-10-spring-boot/contenido.md#configuración-de-niveles-y-destinos) · [Ejemplo práctico: GlobalExceptionHandler](programacion/tema-10-spring-boot/contenido.md#ejemplo-práctico-globalexceptionhandler)
- **P12** — El servidor almacena el hash del token, no el valor en claro, y nunca lo escribe en logs.
  - [2. Tokens opacos](programacion/tema-12-login-tokens/contenido.md#2-tokens-opacos)

# Conceptos — 08 - Arquitectura de Software por Capas y Diseño de Componentes

## Fundamentos de arquitectura

### Código espagueti

- **Definición:** sistema monolítico y acoplado que resulta de escribir todo el código (lectura de datos, validaciones, cálculos, acceso a base de datos o ficheros y presentación del resultado) en un único método o en la misma clase.
- **Detalles clave:** sus problemas son alta rigidez, falta de reusabilidad, dificultad para trabajar en equipo (*merge conflicts*) e imposibilidad de realizar pruebas unitarias.
- **No confundir con:** [Arquitectura de Software](#arquitectura-de-software), que es precisamente su solución.
- **Relacionados:** [Acoplamiento](#acoplamiento), [Arquitectura de Software](#arquitectura-de-software)
- **Sección:** 1. El problema del código "Espagueti" y la necesidad de la arquitectura

### Arquitectura de Software

- **Definición:** define cómo se dividen, organizan y comunican los componentes de una aplicación.
- **Detalles clave:** una buena arquitectura produce un sistema mantenible (localizar y corregir errores o añadir funcionalidades rápido), desacoplado (cada componente no depende de los detalles internos de los demás), escalable (crecer en complejidad o carga sin romper la estructura) y testable (probar cada pieza de forma aislada).
- **No confundir con:** [Arquitectura por capas](#arquitectura-por-capas), que es un patrón concreto de arquitectura.
- **Relacionados:** [Código espagueti](#código-espagueti), [Arquitectura por capas](#arquitectura-por-capas)
- **Sección:** 1. El problema del código "Espagueti" y la necesidad de la arquitectura

### Acoplamiento

- **Definición:** grado en que una parte del sistema depende de otra; el código espagueti es «monolítico y acoplado» y un sistema desacoplado es aquel en que cada componente realiza su trabajo sin depender de los detalles internos de los demás.
- **Detalles clave:** el alto acoplamiento aparece cuando una clase crea sus dependencias con `new` (por ejemplo, `BookRepositoryImpl` atado a `BookDaoMySql`): cambiar la persistencia obliga a modificar el código interno. La DI/IoC consigue un «desacoplamiento total» porque cada capa depende de interfaces, no de implementaciones concretas.
- **No confundir con:** —
- **Relacionados:** [Inyección de Dependencias (DI)](#inyección-de-dependencias-di), [Código espagueti](#código-espagueti)
- **Sección:** 4. Gestión de Dependencias: DI e IoC

## Arquitectura por capas

### Arquitectura por capas

- **Definición:** patrón de diseño (*Layered Architecture*) que divide la aplicación en niveles jerárquicos; cada capa tiene una responsabilidad única y ofrece servicios a la capa inmediatamente superior.
- **Detalles clave:** tres capas principales: presentación (`controller`), dominio/negocio (`domain`) y persistencia/acceso a datos (`persistence`). Se rige por las reglas de comunicación entre capas.
- **No confundir con:** [Arquitectura de Software](#arquitectura-de-software) (concepto general).
- **Relacionados:** [Capa de Presentación](#capa-de-presentación-controller), [Capa de Dominio / Negocio](#capa-de-dominio--negocio-domain), [Capa de Persistencia / Acceso a Datos](#capa-de-persistencia--acceso-a-datos-persistence), [Reglas de comunicación entre capas](#reglas-de-comunicación-entre-capas)
- **Sección:** 2. La Arquitectura por Capas (Layered Architecture)

### Capa de Presentación (controller)

- **Definición:** capa que gestiona la entrada/salida de la aplicación (peticiones HTTP, menú de consola, etc.).
- **Detalles clave:** recibe los datos del usuario, los valida formalmente, llama a la capa de dominio y devuelve el resultado formateado. No contiene lógica de negocio ni accede a datos. En el ejemplo: `BookController`, `BookRequest`, `BookResponse`; consume la interfaz `BookService`.
- **No confundir con:** la capa de dominio: la presentación hace validación formal; las validaciones complejas son reglas de negocio del dominio.
- **Relacionados:** [DTO](#dto-data-transfer-object), [Reglas de comunicación entre capas](#reglas-de-comunicación-entre-capas)
- **Sección:** Principales Capas del Sistema

### Capa de Dominio / Negocio (domain)

- **Definición:** capa que representa el corazón de la aplicación.
- **Detalles clave:** contiene las entidades del modelo y aplica las reglas de negocio (cálculos, validaciones complejas, permisos). Es totalmente independiente de cómo se muestran los datos o dónde se almacenan. En el ejemplo: interfaz `BookService`, `BookServiceImpl` y entidad `Book`.
- **No confundir con:** [DTO](#dto-data-transfer-object): las entidades del dominio no deben exponerse directamente al exterior.
- **Relacionados:** [Mapper](#mapper-mapeador), [Arquitectura por capas](#arquitectura-por-capas)
- **Sección:** Principales Capas del Sistema

### Capa de Persistencia / Acceso a Datos (persistence)

- **Definición:** capa que gestiona la lectura y escritura de datos.
- **Detalles clave:** se comunica con el soporte físico (base de datos relacional, ficheros JSON/CSV, APIs externas) y convierte esa información en objetos manejables por el dominio. En el ejemplo: `BookRepository`/`BookRepositoryImpl`, que consume `BookDao`/`BookDaoImpl`, que lee/escribe en la base de datos o fichero y utiliza `BookEntity`.
- **No confundir con:** —
- **Relacionados:** [Arquitectura por capas](#arquitectura-por-capas), [Inyección de Dependencias (DI)](#inyección-de-dependencias-di)
- **Sección:** Principales Capas del Sistema

### Reglas de comunicación entre capas

- **Definición:** normas que rigen cómo se llaman las capas entre sí.
- **Detalles clave:** (1) flujo unidireccional: las llamadas siempre van hacia abajo, Controller → Service → Repository; (2) prohibido el salto de capas: el controlador nunca debe comunicarse directamente con la persistencia; (3) aislamiento: una capa inferior nunca debe conocer ni llamar a las superiores.
- **No confundir con:** —
- **Relacionados:** [Arquitectura por capas](#arquitectura-por-capas)
- **Sección:** Reglas de Comunicación entre Capas

## DTOs y mapeo

### DTO (Data Transfer Object)

- **Definición:** objeto que gestiona de forma segura y eficiente la entrada y salida de información entre la capa de presentación y el exterior (usuarios, clientes API, vistas), en lugar de exponer directamente las entidades internas del dominio.
- **Detalles clave:** seguridad y privacidad (ocultan claves internas, contraseñas, borrados lógicos); especialización en Request DTO y Response DTO; desacoplamiento (se puede modificar el dominio o la base de datos sin romper la interfaz externa).
- **No confundir con:** entidad de dominio (`Book`), que es interna y no debe exponerse.
- **Relacionados:** [Request DTO](#request-dto), [Response DTO](#response-dto), [Java Record](#java-record), [Mapper](#mapper-mapeador)
- **Sección:** 3. DTOs (Data Transfer Objects) y Java Records

### Request DTO

- **Definición:** DTO de entrada que transporta solo los campos requeridos para realizar una acción.
- **Detalles clave:** por ejemplo, crear un libro sin el ID, ya que lo asigna el sistema: `BookCreateRequest(String isbn, String title, BigDecimal basePrice)`.
- **No confundir con:** [Response DTO](#response-dto).
- **Relacionados:** [DTO](#dto-data-transfer-object)
- **Sección:** 3. DTOs (Data Transfer Objects) y Java Records

### Response DTO

- **Definición:** DTO de salida que entrega la información formateada y procesada explícitamente para el cliente.
- **Detalles clave:** ejemplo `BookResponse(String isbn, String title, BigDecimal finalPrice)`, con el precio final ya calculado por el dominio.
- **No confundir con:** [Request DTO](#request-dto).
- **Relacionados:** [DTO](#dto-data-transfer-object)
- **Sección:** 3. DTOs (Data Transfer Objects) y Java Records

### Java Record

- **Definición:** clase inmutable de sintaxis compacta, disponible a partir de Java 14+, diseñada específicamente para transportar datos de forma inmutable.
- **Detalles clave:** componentes implícitamente `private final` (no modificables tras instanciarse); el compilador genera constructor canónico, accesores con el mismo nombre que el campo (`isbn()`, no `getIsbn()`), `equals()` y `hashCode()` basados en el valor de los campos (dos records con los mismos datos son iguales) y `toString()` descriptivo; semántica clara de mero portador de datos sin lógica de negocio ni estado mutable. Evita el código repetitivo que antes requería un DTO.
- **No confundir con:** clase convencional con getters `getX()` (como la entidad `Book`).
- **Relacionados:** [DTO](#dto-data-transfer-object)
- **Sección:** Java Records

### Mapper (Mapeador)

- **Definición:** componente encargado de convertir instancias de un DTO a una entidad de dominio, y viceversa.
- **Detalles clave:** responsabilidad adicional que surge al separar DTOs y entidades, al cruzar la frontera entre presentación y dominio. Ejemplo `BookMapper` con `static Book toDomain(BookCreateRequest dto)` y `static BookResponse toResponse(Book domain)`; ambos devuelven `null` si reciben `null`; `toResponse` usa `getFinalPrice()`, donde se aplica la regla del dominio.
- **No confundir con:** [DTO](#dto-data-transfer-object) (el mapper convierte; el DTO transporta).
- **Relacionados:** [DTO](#dto-data-transfer-object), [Capa de Dominio / Negocio](#capa-de-dominio--negocio-domain)
- **Sección:** Conversión entre objetos: Mapeadores (Mappers)

## Gestión de dependencias

### Inyección de Dependencias (DI)

- **Definición:** patrón de diseño (*Dependency Injection*) en el que una clase recibe sus dependencias desde el exterior en lugar de instanciarlas internamente.
- **Detalles clave:** la clase declara «Necesito un BookDao para funcionar, entregádmelo al construirme». Sustituye al error habitual de crear dependencias con `new` dentro de la clase (alto acoplamiento e imposibilidad de pruebas unitarias aisladas).
- **No confundir con:** [Inversión de Control (IoC)](#inversión-de-control-ioc), que es un principio más amplio.
- **Relacionados:** [Inyección por constructor](#inyección-por-constructor), [Contenedor de IoC](#contenedor-de-ioc-ioc-container), [Mock](#mock)
- **Sección:** Inyección de Dependencias (DI)

### Inyección por constructor

- **Definición:** forma de DI en la que la dependencia se recibe a través del constructor; es el enfoque recomendado en la industria (buena práctica).
- **Detalles clave:** garantiza que la clase se cree en un estado válido y con atributos inmutables: `private final BookDao bookDao;` (apunta a una interfaz) y `public BookRepositoryImpl(BookDao bookDao)`.
- **No confundir con:** instanciar la dependencia con `new` dentro del constructor (`this.bookDao = new BookDaoMySql();`), señalado como error.
- **Relacionados:** [Inyección de Dependencias (DI)](#inyección-de-dependencias-di)
- **Sección:** Inyección por constructor (Buena práctica)

### Inversión de Control (IoC)

- **Definición:** principio de diseño más amplio (*Inversion of Control*) en el que el control del flujo de ejecución y de la creación de objetos se delega a un componente externo (el ensamblador o contenedor).
- **Detalles clave:** flujo tradicional: las clases deciden cuándo y cómo crear a sus colaboradores; flujo invertido: un elemento externo crea los objetos, resuelve sus dependencias y los entrega (inyecta) a quien los necesite.
- **No confundir con:** [Inyección de Dependencias (DI)](#inyección-de-dependencias-di), que es un patrón concreto.
- **Relacionados:** [Ensamblado manual](#ensamblado-manual), [Contenedor de IoC](#contenedor-de-ioc-ioc-container)
- **Sección:** Inversión de Control (IoC)

### Ensamblado manual

- **Definición:** creación y conexión de las capas a mano en el punto de entrada de la aplicación (el método `main`), cuando no se usa un framework como Spring.
- **Detalles clave:** orden: instanciar el DAO (`new BookDaoMySql()`), inyectarlo al repositorio, el repositorio al servicio, el servicio al controlador y llamar a `bookController.run()`. Se vuelve inmanejable con decenas o cientos de clases.
- **No confundir con:** [Contenedor de IoC](#contenedor-de-ioc-ioc-container), que automatiza o encapsula este ensamblado.
- **Relacionados:** [Inversión de Control (IoC)](#inversión-de-control-ioc)
- **Sección:** Ensamblado manual del sistema

### Contenedor de IoC (IoC Container)

- **Definición:** componente (también *Dependency Injection Container*) encargado de instanciar, configurar y ensamblar todos los objetos del sistema, denominados habitualmente beans o componentes.
- **Detalles clave:** Spring automatiza esta tarea mediante un contenedor de IoC. La fuente construye uno básico a mano con el patrón Factoría (Factory): `IoCContainer` crea e inyecta en su constructor DAO → repositorio → servicio → controlador y ofrece `getBookController()`; así `main` ya no necesita saber cómo se construyen ni conectan las capas.
- **No confundir con:** [Ensamblado manual](#ensamblado-manual) en `main`.
- **Relacionados:** [Bean](#bean), [Inversión de Control (IoC)](#inversión-de-control-ioc)
- **Sección:** El contenedor de IoC (IoC Container)

### Bean

- **Definición:** nombre que reciben habitualmente los objetos del sistema que instancia, configura y ensambla un contenedor de IoC (también llamados componentes).
- **Detalles clave:** La fuente no lo detalla más allá de esta denominación.
- **No confundir con:** —
- **Relacionados:** [Contenedor de IoC](#contenedor-de-ioc-ioc-container)
- **Sección:** El contenedor de IoC (IoC Container)

### Mock

- **Definición:** objeto simulado que se puede pasar al constructor para probar la lógica de negocio aisladamente.
- **Detalles clave:** es posible gracias a la DI: si la clase recibe sus dependencias, se le puede entregar un mock en lugar de la implementación real de la persistencia.
- **No confundir con:** —
- **Relacionados:** [Inyección de Dependencias (DI)](#inyección-de-dependencias-di)
- **Sección:** Ventajas de IoC / DI

## Comparativas

| Aspecto | Capa de Presentación (`controller`) | Capa de Dominio (`domain`) | Capa de Persistencia (`persistence`) |
|---|---|---|---|
| Responsabilidad | Entrada/salida (HTTP, consola…) | Corazón de la aplicación | Lectura y escritura de datos |
| Validación | Formal | Validaciones complejas (reglas de negocio) | — |
| Lógica de negocio | No | Sí (cálculos, validaciones, permisos) | No |
| Acceso a datos | No | Independiente de dónde se almacenan | Sí (BD relacional, JSON/CSV, APIs externas) |
| Clases del ejemplo | `BookController`, `BookRequest`, `BookResponse` | `BookService`, `BookServiceImpl`, `Book` | `BookRepository(Impl)`, `BookDao(Impl)`, `BookEntity` |

| Aspecto | Request DTO | Response DTO |
|---|---|---|
| Dirección | Entrada | Salida |
| Contenido | Solo los campos requeridos para la acción | Información formateada y procesada para el cliente |
| Ejemplo | `BookCreateRequest(isbn, title, basePrice)`, sin ID | `BookResponse(isbn, title, finalPrice)` |

| Aspecto | Clase DTO tradicional | Java Record |
|---|---|---|
| Código | Repetitivo: `private final`, constructor, getters, `equals()`, `hashCode()`, `toString()` | Sintaxis compacta; el compilador lo genera |
| Accesores | `getIsbn()` | `isbn()` |
| Mutabilidad | Depende de cómo se escriba | Inmutable por defecto |
| Disponibilidad | Siempre | Java 14+ |

| Aspecto | Crear dependencias con `new` | Inyección por constructor |
|---|---|---|
| Quién elige la implementación | La propia clase | Un elemento externo |
| Acoplamiento | Alto (atado a `BookDaoMySql`) | Bajo (depende de la interfaz `BookDao`) |
| Pruebas unitarias | Imposibles de forma aislada | Posibles con un Mock |
| Atributo | `private BookDao bookDao` | `private final BookDao bookDao` (inmutable) |
| Cambiar persistencia | Modificar el código interno del repositorio | Modificar una línea en el ensamblado |

| Aspecto | Inyección de Dependencias (DI) | Inversión de Control (IoC) |
|---|---|---|
| Naturaleza | Patrón de diseño | Principio de diseño más amplio |
| Qué plantea | La clase recibe sus dependencias desde el exterior | El control del flujo y de la creación de objetos se delega a un componente externo |

| Aspecto | Flujo tradicional | Flujo invertido (IoC) |
|---|---|---|
| Quién crea los colaboradores | Las propias clases deciden cuándo y cómo | Un elemento externo los crea, resuelve dependencias y los inyecta |

| Aspecto | Ensamblado manual en `main` | Contenedor de IoC |
|---|---|---|
| Dónde se crean los objetos | En el método `main` | En el contenedor (ej. `IoCContainer`, patrón Factory; o Spring) |
| Escala | Inmanejable con decenas o cientos de clases | Pensado para aplicaciones reales |
| Qué sabe `main` | Cómo se construye y conecta cada capa | Solo pide el controlador al contenedor y lo ejecuta |

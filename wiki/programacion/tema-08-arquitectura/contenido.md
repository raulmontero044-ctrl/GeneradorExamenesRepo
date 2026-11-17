# 08 - Arquitectura de Software por Capas y Diseño de Componentes

## 1. El problema del código "Espagueti" y la necesidad de la arquitectura

Cuando se empieza a programar es habitual escribir todo el código en un único método o dentro de la misma clase: la lectura de datos, las validaciones, los cálculos, el acceso a la base de datos o a ficheros y la presentación del resultado.

Este enfoque crea un sistema **monolítico y acoplado**, conocido popularmente como **código espagueti**.

#### Problemas del código sin estructurar

- **Alta rigidez**: cambiar una parte del sistema (por ejemplo, pasar de guardar datos en un fichero de texto a una base de datos SQL) obliga a modificar y reescribir la lógica de negocio y la interfaz.
- **Falta de reusabilidad**: la lógica de negocio está mezclada con la entrada/salida de datos, lo que impide reutilizarla en otros entornos (por ejemplo, pasar de una aplicación de consola a una API Web).
- **Dificultad para trabajar en equipo**: varios desarrolladores tocando la misma clase o fichero generan constantes conflictos de código (*merge conflicts*).
- **Imposibilidad de realizar pruebas unitarias (testing)**: no se puede probar la lógica de cálculo sin ejecutar simultáneamente el acceso a la base de datos o la interacción con el usuario.

#### Arquitectura de Software

La **Arquitectura de Software** define cómo se dividen, organizan y comunican los componentes de una aplicación.

Aplicar una buena arquitectura permite obtener un sistema:

- **Mantenible**: permite localizar y corregir errores o añadir funcionalidades de forma rápida.
- **Desacoplado**: cada componente realiza su trabajo sin depender de los detalles internos de los demás.
- **Escalable**: capaz de crecer en complejidad o en carga de trabajo sin romper la estructura existente.
- **Testable**: permite probar cada pieza de forma aislada.

## 2. La Arquitectura por Capas (Layered Architecture)

La **arquitectura por capas** es un patrón de diseño que divide la aplicación en **niveles jerárquicos**. Cada capa tiene una **responsabilidad única** y **ofrece servicios a la capa inmediatamente superior**.

#### Principales Capas del Sistema

| Capa | Paquete | Responsabilidad | Comportamiento |
|---|---|---|---|
| Capa de Presentación | `controller` | Gestiona la entrada/salida de la aplicación (peticiones HTTP, menú de consola, etc.). | Recibe los datos del usuario, los valida **formalmente**, llama a la capa de dominio y devuelve el resultado formateado. **No contiene lógica de negocio ni accede a datos.** |
| Capa de Dominio / Negocio | `domain` | Representa el corazón de la aplicación. | Contiene las entidades del modelo y aplica las reglas de negocio (cálculos, validaciones complejas, permisos). **Es totalmente independiente de cómo se muestran los datos o dónde se almacenan.** |
| Capa de Persistencia / Acceso a Datos | `persistence` | Gestiona la lectura y escritura de datos. | Se comunica con el soporte físico (base de datos relacional, ficheros JSON/CSV, APIs externas) y convierte esa información en objetos manejables por el dominio. |

Matiz importante sobre las validaciones: la capa de presentación solo hace validaciones **formales** de los datos de entrada; las **validaciones complejas** forman parte de las reglas de negocio y corresponden a la capa de dominio.

#### Reglas de Comunicación entre Capas

- **Flujo unidireccional**: las llamadas siempre van hacia abajo: Controller → Service → Repository.
- **Prohibido el salto de capas**: el controlador nunca debe comunicarse directamente con la capa de persistencia.
- **Aislamiento**: una capa inferior nunca debe conocer ni llamar a las capas superiores.

##### Diagrama de componentes del ejemplo (libros)

La fuente incluye un diagrama con tres paquetes y una base de datos:

- **Capa de Presentación**: `BookController`, `BookRequest` y `BookResponse`.
- **Capa de Dominio**: la interfaz `BookService`, su implementación `BookServiceImpl` y la entidad `Book`.
- **Capa de Persistencia**: la interfaz `BookRepository` y su implementación `BookRepositoryImpl`; la interfaz `BookDao` y su implementación `BookDaoImpl`; y la clase `BookEntity`.
- Un elemento externo **«Base de Datos / Fichero»**.

Relaciones (todas en sentido descendente o lateral, nunca hacia arriba):

1. `BookController` **consume** `BookService` (flecha hacia abajo, hacia la interfaz del dominio, no hacia la implementación).
2. `BookController` **utiliza** `BookRequest` y `BookResponse` (los DTO de entrada y salida).
3. `BookServiceImpl` **implementa** `BookService`.
4. `BookServiceImpl` **utiliza** la entidad de dominio `Book`.
5. `BookServiceImpl` **consume** `BookRepository` (hacia la capa de persistencia, de nuevo a través de una interfaz).
6. `BookRepositoryImpl` **implementa** `BookRepository`.
7. `BookRepositoryImpl` **consume** `BookDao`.
8. `BookDaoImpl` **implementa** `BookDao`.
9. `BookDaoImpl` **lee/escribe** en la Base de Datos / Fichero.
10. `BookDaoImpl` **utiliza** `BookEntity`.

El diagrama refleja las reglas de comunicación: el controlador no salta a la persistencia, cada capa depende de la interfaz de la capa inmediatamente inferior y solo el DAO toca el soporte físico. Dentro de la persistencia hay dos niveles: el repositorio (que sirve al dominio) y el DAO (que accede físicamente a los datos y trabaja con `BookEntity`).

## 3. DTOs (Data Transfer Objects) y Java Records

Cuando la capa de presentación interactúa con el exterior (usuarios, clientes API, vistas), **no es recomendable exponer directamente las entidades internas del dominio**. Para gestionar esta entrada y salida de información de forma segura y eficiente se utilizan los **DTO** (**Data Transfer Objects**). Sus características principales son:

- **Seguridad y Privacidad**: ocultan datos sensibles o internos que el usuario no necesita ver (por ejemplo, claves internas, contraseñas, borrados lógicos).
- **Especialización** (Request vs Response):
  - **Request DTO (Entrada)**: transporta solo los campos requeridos para realizar una acción (por ejemplo, crear un libro **sin el ID**, ya que este lo asigna el sistema).
  - **Response DTO (Salida)**: entrega la información formateada y procesada explícitamente para el cliente.
- **Desacoplamiento**: permite modificar la estructura interna del dominio o de la base de datos sin romper la interfaz externa de la aplicación.

### Java Records

Históricamente, crear un DTO en Java requería escribir mucho código repetitivo: atributos `private final`, constructor, *getters*, `equals()`, `hashCode()` y `toString()`.

A partir de **Java 14+** se dispone de los `Records`: clases **inmutables** de sintaxis compacta, diseñadas específicamente para transportar datos de forma inmutable.

Un `Record` de Java es una clase con las siguientes características:

- **Inmutabilidad por defecto**: todos sus componentes (campos) son implícitamente `private final`. Una vez instanciado el `record`, sus valores no pueden ser modificados, lo que garantiza la integridad de los datos durante su transporte.
- **Generación automática de métodos**: con solo declarar la firma del `record`, el compilador genera automáticamente:
  - Un **constructor canónico** que inicializa todos los campos.
  - **Métodos de acceso** tipo *getter* para cada campo, **con el mismo nombre que el campo** (por ejemplo, `isbn()` en lugar de `getIsbn()`).
  - Métodos `equals()` y `hashCode()` **basados en el valor de sus campos** (dos `records` con los mismos datos se consideran iguales).
  - Un método `toString()` descriptivo con la lista formateada de sus campos.
- **Semántica clara**: indica explícitamente al desarrollador y al framework que esta clase es un mero portador de datos, sin lógica de negocio ni estado mutable.

##### Ejemplos de records

La fuente muestra dos DTO declarados como records, ambos con importación de `java.math.BigDecimal`:

- `BookCreateRequest` representa los datos necesarios para **crear** un nuevo libro (**sin ID**): `public record BookCreateRequest(String isbn, String title, BigDecimal basePrice) {}`. Recibe el **precio base**.
- `BookResponse` representa los datos que se envían **al exterior**, con el **precio final calculado**: `public record BookResponse(String isbn, String title, BigDecimal finalPrice) {}`.

La diferencia entre ambos ilustra la especialización Request/Response: la entrada lleva `basePrice` (dato que aporta el cliente) y la salida lleva `finalPrice` (resultado de una regla del dominio). Ninguno lleva el ID en el ejemplo de creación.

### Conversión entre objetos: Mapeadores (Mappers)

La separación entre DTOs y Entidades del Dominio introduce una **responsabilidad adicional**: transformar o mapear objetos de un tipo a otro **al cruzar la frontera entre la capa de presentación y la de dominio**.

Un **Mapper** es un componente encargado de convertir instancias de un DTO a una Entidad de Dominio, y viceversa.

El ejemplo `BookMapper` tiene dos métodos estáticos:

- `public static Book toDomain(BookCreateRequest dto)`: convierte el DTO de entrada en la entidad del dominio, creando un `Book` con `dto.isbn()`, `dto.title()` y `dto.basePrice()` (usa los accesores propios del record, sin prefijo `get`).
- `public static BookResponse toResponse(Book domain)`: convierte la entidad del dominio en el DTO de salida, creando un `BookResponse` con los getters de la entidad (`domain.getIsbn()`, el título y `domain.getFinalPrice()`). La llamada a `getFinalPrice()` es donde **se aplica la regla/cálculo del dominio**.

Ambos métodos devuelven `null` si reciben `null` (`if (dto == null) return null;`). Obsérvese que la entidad `Book` es una clase convencional con getters (`getIsbn()`), mientras que los DTO son records con accesores (`isbn()`).

## 4. Gestión de Dependencias: DI e IoC

Para conectar las distintas capas de la aplicación de forma limpia, cada clase necesita interactuar con los servicios de la capa inferior. Sin embargo, **la forma en que se instancian y gestionan esas colaboraciones** marca la diferencia entre un código rígido y un sistema mantenible y desacoplado.

El **error habitual** al empezar a desarrollar aplicaciones en capas es que cada clase cree directamente sus propias dependencias utilizando el operador `new`.

En el ejemplo, `BookRepositoryImpl implements BookRepository` tiene un atributo `private BookDao bookDao;` y en su constructor sin parámetros hace `this.bookDao = new BookDaoMySql();` (marcado como **ERROR**: la clase decide internamente la implementación concreta). Existen dos implementaciones de `BookDao`: `BookDaoMySql` (usa una base de datos SQL) y `BookDaoJson`.

Inconvenientes de este enfoque:

- **Alto acoplamiento**: `BookRepositoryImpl` queda atado a la clase concreta `BookDaoMySql`. Si se cambia el mecanismo de persistencia (por ejemplo, a `BookDaoJson`), habrá que modificar el código interno del repositorio.
- **Imposible realizar pruebas unitarias aisladas**: no se puede probar la lógica del servicio sin ejecutar la implementación real de la persistencia.

### Inyección de Dependencias (DI)

La **Inyección de Dependencias** (**Dependency Injection**) es un **patrón de diseño** en el que una clase **recibe sus dependencias desde el exterior** en lugar de instanciarlas internamente.

En lugar de que la clase cree el DAO, declara: *«Necesito un BookDao para funcionar, entregádmelo al construirme»*.

#### Inyección por constructor (Buena práctica)

La **inyección a través del constructor** es el enfoque recomendado en la industria porque garantiza que la clase **se cree en un estado válido** y con **atributos inmutables**.

En el ejemplo, el atributo pasa a ser `private final BookDao bookDao;` (apunta a una **interfaz** y es **inmutable**) y el constructor recibe la dependencia desde fuera:

```java
public BookRepositoryImpl(BookDao bookDao) {
    this.bookDao = bookDao;
}
```

Frente al ejemplo erróneo, cambian dos cosas: el atributo es `final` y el repositorio ya no decide qué implementación concreta de `BookDao` usa.

### Inversión de Control (IoC)

La **Inversión de Control** (**Inversion of Control**) es un **principio de diseño más amplio** en el que el control del flujo de ejecución y de la creación de objetos **se delega a un componente externo** (el ensamblador o contenedor).

- **Flujo tradicional**: las clases toman el control y deciden cuándo y cómo crear a sus colaboradores.
- **Flujo invertido (IoC)**: un elemento externo crea los objetos, resuelve sus dependencias y se los entrega (inyecta) a quien los necesite.

La fuente distingue así ambos términos: la DI es un **patrón de diseño** (la clase recibe sus dependencias desde fuera) y la IoC es un **principio de diseño más amplio** (el control de la creación de objetos y del flujo se delega a un componente externo).

#### Ensamblado manual del sistema

Al no usar de momento un framework como Spring (que automatiza esta tarea mediante un contenedor de IoC), el ensamblado de las distintas capas se puede realizar **manualmente en el punto de entrada de la aplicación** (el método `main`).

El ejemplo de `main` sigue este orden, **de abajo arriba**:

1. Se instancia el DAO: `BookDao bookDao = new BookDaoMySql();`
2. Se inyecta el DAO al repositorio: `new BookRepositoryImpl(bookDao)`.
3. Se inyecta el repositorio al servicio: `new BookServiceImpl(bookRepository)`.
4. Se inyecta el servicio en la capa de presentación: `new BookController(bookService)`.
5. Se inicia la ejecución del sistema: `bookController.run();`

Las variables se declaran con el tipo de la interfaz (`BookDao`, `BookRepository`, `BookService`), y la única línea que nombra la implementación concreta de persistencia es la del paso 1.

#### El contenedor de IoC (IoC Container)

En aplicaciones reales con decenas o cientos de clases, instanciar y conectar todos los objetos manualmente en el método `main` **se vuelve inmanejable**.

Para solucionarlo existen los **Contenedores de IoC** (**IoC Containers** o **Dependency Injection Containers**): componentes encargados de **instanciar, configurar y ensamblar** todos los objetos del sistema (denominados habitualmente **beans** o **componentes**).

Para entender cómo funciona internamente un framework como Spring, se puede construir un contenedor de IoC básico a mano utilizando el **patrón Factoría (Factory)**.

El ejemplo `IoCContainer` (un «contenedor IoC casero que gestiona el ciclo de vida y las dependencias»):

- Tiene como atributos `private final` el `BookDao`, el `BookRepository`, el `BookService` y el `BookController`.
- En su constructor **asume la responsabilidad de crear e inyectar**: crea `new BookDaoMySql()`, se lo pasa a `new BookRepositoryImpl(...)`, este a `new BookServiceImpl(...)` y este a `new BookController(...)` (el mismo orden que el ensamblado manual).
- Ofrece métodos para proporcionar los componentes ya instanciados, como `public BookController getBookController()`.

Con esta abstracción, la clase `Main` **se simplifica al máximo**: ya no necesita saber cómo se construyen ni cómo se conectan las capas. Solo crea el contenedor (`new IoCContainer()`), le pide el controlador (`container.getBookController()`) y llama a `bookController.run()`.

#### Ventajas de IoC / DI

- **Desacoplamiento total**: cada capa depende de **interfaces**, no de implementaciones concretas.
- **Facilidad para Pruebas Unitarias**: es posible pasarle al constructor un **objeto simulado (Mock)** para probar la lógica de negocio aisladamente.
- **Flexibilidad y Mantenibilidad**: cambiar la implementación de una capa (por ejemplo, reemplazar la persistencia en ficheros por una base de datos) **solo requiere modificar una línea en el ensamblado**, sin tocar el código del Servicio ni del Controlador.

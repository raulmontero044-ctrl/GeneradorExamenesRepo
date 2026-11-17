# Conceptos — 04 - Monolito modular

## Monolito y modularidad

### Monolito

- **Definición:** Sistema en el que todas las capacidades de la aplicación forman parte de un mismo sistema y se construyen y despliegan como una unidad.
- **Detalles clave:** Al crecer, el código de catálogo, pedidos, usuarios o envíos puede quedar repartido por paquetes compartidos; las dependencias entre capacidades se vuelven difíciles de reconocer y controlar, y un cambio en una parte puede tener efectos poco evidentes en otra. El problema no es el despliegue como unidad, sino la falta de límites claros entre capacidades.
- **No confundir con:** [Monolito modular](#monolito-modular), que también es un único despliegue pero con límites explícitos.
- **Relacionados:** [Monolito modular](#monolito-modular), [Módulo de negocio](#módulo-de-negocio)
- **Sección:** 1. Una posible arquitectura modular

### Monolito modular

- **Definición:** Monolito que mantiene un único despliegue pero organiza el código en módulos de negocio con límites explícitos y verificables.
- **Detalles clave:** Sigue siendo una aplicación; conserva las capas dentro de cada módulo; los módulos se relacionan mediante API pública y DTO; separa `Controller → UseCase → Service` de `Module → ModuleImpl → Service`; los modelos de otros módulos se relacionan mediante IDs; ArchUnit y Spring Modulith ayudan a verificar los límites. La estructura propuesta es una opción entre varias arquitecturas válidas, no una receta universal.
- **No confundir con:** Organización por capas sin módulos (ver [Comparativas](#comparativas)).
- **Relacionados:** [Monolito](#monolito), [Módulo de negocio](#módulo-de-negocio), [Spring Modulith](#spring-modulith)
- **Sección:** 6. Qué cambia y qué permanece

### Módulo de negocio

- **Definición:** Unidad del monolito que reúne el código de una capacidad de negocio concreta (p. ej. `catalog`, `orders`, `users`, `shipping`) y limita cómo pueden utilizarla los demás módulos.
- **Detalles clave:** Expone una API pública y sus DTO; su implementación queda en `internal`, organizada con las capas existentes. Otros módulos dependen de su contrato, no de su implementación.
- **No confundir con:** Una capa técnica (controlador, dominio, persistencia): las capas organizan por responsabilidad técnica; los módulos, por capacidad de negocio.
- **Relacionados:** [API pública del módulo](#api-pública-del-módulo), [Paquete internal](#paquete-internal)
- **Sección:** 1. Una posible arquitectura modular

## Límites del módulo

### API pública del módulo

- **Definición:** Contrato que un módulo ofrece a los demás, junto con los DTO que forman parte de él. En el ejemplo, `CatalogModule`.
- **Detalles clave:** Su implementación, `CatalogModuleImpl`, vive en `internal.application` y delega en `CatalogService` (implementación interna). Ruta de entrada entre módulos: `CatalogModule → CatalogModuleImpl → CatalogService`; no pasa por casos de uso de usuario. Para consultar datos de otro módulo se usa la API pública del módulo propietario. En Spring Modulith, el paquete raíz del módulo constituye su API pública.
- **No confundir con:** `CatalogModuleImpl` o `CatalogService`, que son implementación interna.
- **Relacionados:** [DTO del contrato](#dto-del-contrato), [Paquete internal](#paquete-internal), [Caso de uso](#caso-de-uso)
- **Sección:** 2. API pública e implementación interna

### DTO del contrato

- **Definición:** Objetos de transferencia que forman parte del contrato público de un módulo (p. ej. `BookSummary` en `com.example.store.catalog.dto`).
- **Detalles clave:** La API pública los expone en su contrato. En Spring Modulith, si están en un subpaquete (`catalog.dto`) hay que exponerlo con `@NamedInterface`; si se colocan directamente en el paquete raíz del módulo son públicos por defecto, sin `@NamedInterface` ni `package-info.java`.
- **No confundir con:** Los modelos de dominio internos, que son privados del módulo.
- **Relacionados:** [API pública del módulo](#api-pública-del-módulo), [NamedInterface](#namedinterface)
- **Sección:** 2. API pública e implementación interna

### Paquete internal

- **Definición:** Paquete donde cada módulo coloca su implementación (capas `application`, `controller`, `domain`, `persistence`… y, después, `usecase`) y sus modelos de dominio.
- **Detalles clave:** En Java, estar en un paquete `internal` no hace inaccesible una clase: si es pública, otras clases pueden usarla. Por eso se necesitan tests de arquitectura que prohíban a otros módulos depender de él.
- **No confundir con:** Un mecanismo de visibilidad del lenguaje: es una convención que hay que verificar.
- **Relacionados:** [Test de arquitectura](#test-de-arquitectura), [Modelo privado del módulo](#modelo-privado-del-módulo)
- **Sección:** 2.1 Verificar los límites entre módulos

## Verificación de límites

### Test de arquitectura

- **Definición:** Test que verifica automáticamente cómo se relacionan los módulos y si las dependencias respetan los límites.
- **Detalles clave:** La estructura expresa los límites, pero no siempre los hace cumplir. Si hay dependencias que incumplen la regla, el test falla; no impide escribir la importación ni compilar el código.
- **No confundir con:** Una protección en tiempo de compilación.
- **Relacionados:** [ArchUnit](#archunit), [ApplicationModules verify](#applicationmodules-verify)
- **Sección:** 2.1 Verificar los límites entre módulos

### ArchUnit

- **Definición:** Biblioteca Java con la que se expresan reglas de arquitectura como tests (`@ArchTest`, `ArchRule`).
- **Detalles clave:** Ejemplo: `noClasses().that().resideOutsideOfPackage("..catalog..").should().dependOnClassesThat().resideInAPackage("..catalog.internal..")`. También puede comprobar que los casos de uso no se invoquen entre sí y que `CatalogModule` no dependa de ellos, o exigir el flujo `Controller → UseCase → Service` dentro de un módulo. Spring Modulith usa por debajo su análisis de dependencias, pero no sustituye todas sus reglas.
- **No confundir con:** [Spring Modulith](#spring-modulith), que deriva el modelo modular de los paquetes.
- **Relacionados:** [Test de arquitectura](#test-de-arquitectura), [Spring Modulith](#spring-modulith)
- **Sección:** 2.1 Verificar los límites entre módulos

## Flujos de entrada

### Caso de uso

- **Definición:** Elemento de la capa `usecase`, situada entre el controlador y el servicio, que coordina el flujo iniciado por una persona usuaria y comprueba las condiciones específicas de ese flujo (p. ej. autorización) antes de llamar al servicio.
- **Detalles clave:** Flujo HTTP: `CatalogController → CatalogUseCase → CatalogService`. Representa un flujo de entrada, no una operación reutilizable: un caso de uso no debe llamar a otro (acoplaría flujos y arrastraría decisiones de acceso); la operación compartida se comparte mediante el servicio. Un módulo no pasa por un caso de uso de usuario.
- **No confundir con:** El servicio interno (`CatalogService`), que aplica reglas e invariantes siempre; ni con la API pública del módulo.
- **Relacionados:** [Políticas de acceso de la persona usuaria](#políticas-de-acceso-de-la-persona-usuaria), [Reglas e invariantes del servicio](#reglas-e-invariantes-del-servicio)
- **Sección:** 3. Separar los flujos de entrada con casos de uso

### Políticas de acceso de la persona usuaria

- **Definición:** Comprobaciones que dependen de quién inicia el flujo (p. ej. ser administradora para crear un libro, estar logueado para consultar el carrito).
- **Detalles clave:** En el controlador quedarían mezcladas con HTTP y repetidas; aplicadas indiscriminadamente en el servicio, una llamada legítima de otro módulo (p. ej. envíos cancelando un pedido sin ser su dueño) se evaluaría con una identidad o contexto que no corresponde. Se ubican en el caso de uso.
- **No confundir con:** [Reglas e invariantes del servicio](#reglas-e-invariantes-del-servicio).
- **Relacionados:** [Caso de uso](#caso-de-uso)
- **Sección:** 3. Separar los flujos de entrada con casos de uso

### Reglas e invariantes del servicio

- **Definición:** Reglas que deben cumplirse siempre, venga la llamada de una persona usuaria o de otro módulo.
- **Detalles clave:** Residen en el servicio interno, punto en el que confluyen la entrada HTTP y la entrada entre módulos.
- **No confundir con:** [Políticas de acceso de la persona usuaria](#políticas-de-acceso-de-la-persona-usuaria), que dependen de quién inicia el flujo.
- **Relacionados:** [Caso de uso](#caso-de-uso)
- **Sección:** 3. Separar los flujos de entrada con casos de uso

## Modelos

### Modelo privado del módulo

- **Definición:** Modelo de dominio que un módulo mantiene en su paquete `internal` y que, por las reglas de arquitectura, otros módulos no pueden usar.
- **Detalles clave:** `Order` (en `orders.internal`) no puede tener un campo `User` de `users.internal`, ni `OrderDetail` un campo `Product` de `catalog.internal`: violaría el límite entre módulos.
- **No confundir con:** [DTO del contrato](#dto-del-contrato), que sí es público.
- **Relacionados:** [Relación mediante identificadores](#relación-mediante-identificadores), [Paquete internal](#paquete-internal)
- **Sección:** 4. Modelos privados y relaciones mediante identificadores

### Relación mediante identificadores

- **Definición:** Forma de relacionar modelos de distintos módulos guardando identificadores en lugar de referencias a objetos.
- **Detalles clave:** `Order` almacena `userId: UUID`; `OrderDetail`, `productId: UUID`. El tipo del identificador no debe importar clases de `users.internal` ni `catalog.internal`: puede ser `UUID`, un tipo definido localmente en el módulo consumidor o uno incluido en un contrato público si se decide exponerlo. Para más datos se usa la API pública del módulo propietario.
- **No confundir con:** Referencias directas entre modelos, propias de la organización por capas sin módulos.
- **Relacionados:** [Modelo privado del módulo](#modelo-privado-del-módulo), [API pública del módulo](#api-pública-del-módulo)
- **Sección:** 4. Modelos privados y relaciones mediante identificadores

## Spring Modulith

### Spring Modulith

- **Definición:** Biblioteca del ecosistema Spring que deriva un modelo modular a partir de los paquetes de la aplicación, ayuda a documentarlo y a verificar que se respeta.
- **Detalles clave:** No decide la arquitectura por el equipo. Por defecto, los paquetes hijos directos del paquete base son módulos (p. ej. `com.example.store.catalog`, `com.example.store.orders`). El paquete raíz de cada módulo es su API pública; los subpaquetes son internos salvo exposición explícita. Usa por debajo el análisis de ArchUnit. Ofrece facilidades para documentar la estructura y probar módulos por separado.
- **No confundir con:** [ArchUnit](#archunit); Modulith no sustituye todas sus reglas.
- **Relacionados:** [NamedInterface](#namedinterface), [ApplicationModule](#applicationmodule), [ApplicationModules verify](#applicationmodules-verify)
- **Sección:** 5. Spring Modulith: detección y verificación de módulos

### NamedInterface

- **Definición:** Anotación `@org.springframework.modulith.NamedInterface` que, en un `package-info.java`, expone explícitamente un subpaquete de un módulo con un nombre.
- **Detalles clave:** `@NamedInterface("dto")` sobre `package com.example.store.catalog.dto;` hace público `catalog.dto`. No es necesaria si los DTO se colocan en el paquete raíz del módulo.
- **No confundir con:** [ApplicationModule](#applicationmodule), que declara dependencias permitidas.
- **Relacionados:** [Spring Modulith](#spring-modulith), [DTO del contrato](#dto-del-contrato)
- **Sección:** 5. Spring Modulith: detección y verificación de módulos

### ApplicationModule

- **Definición:** Anotación `@org.springframework.modulith.ApplicationModule` que el paquete raíz de un módulo usa para declarar sus dependencias permitidas.
- **Detalles clave:** Ejemplo en `package com.example.store.orders;`: `allowedDependencies = "catalog::dto"` (orders puede depender de la interfaz `dto` de `catalog`). Se declara en `package-info.java`, que puede usarse para esto aunque los DTO estén en el paquete raíz.
- **No confundir con:** [NamedInterface](#namedinterface), que expone un subpaquete.
- **Relacionados:** [Spring Modulith](#spring-modulith)
- **Sección:** 5. Spring Modulith: detección y verificación de módulos

### ApplicationModules verify

- **Definición:** Verificación del modelo modular con `ApplicationModules.of(Application.class).verify()` dentro de un test JUnit.
- **Detalles clave:** Va en el código de pruebas, no en producción (p. ej. `src/test/java/com/example/store/ApplicationModulesTest.java`). No necesita arrancar el contexto de Spring: analiza paquetes y dependencias. Detecta ciclos entre módulos, accesos a paquetes internos y dependencias no permitidas. Es verificación automatizada, no protección en tiempo de compilación.
- **No confundir con:** Un control del compilador.
- **Relacionados:** [Spring Modulith](#spring-modulith), [Test de arquitectura](#test-de-arquitectura)
- **Sección:** 5. Spring Modulith: detección y verificación de módulos

## Comparativas

| Aspecto | Organización por capas | Monolito modular |
|---|---|---|
| Despliegue | Una aplicación | Sigue siendo una aplicación y un único despliegue |
| Organización | Por responsabilidad técnica, no por capacidad de negocio | Conserva las capas dentro de cada módulo de negocio |
| Colaboración entre módulos | Sin límites explícitos entre capacidades de negocio | Mediante API pública y DTO |
| Entradas | Los flujos de entrada llegan a los servicios | Separa `Controller → UseCase → Service` de `Module → ModuleImpl → Service` |
| Modelos | Puede haber referencias directas entre modelos de distintas capacidades | Relación mediante IDs |
| Verificación | Depende principalmente de convenciones | ArchUnit y Spring Modulith ayudan a verificar los límites |

| Aspecto | Políticas de acceso de la persona usuaria | Reglas e invariantes del servicio |
|---|---|---|
| Depende de | Quién inicia el flujo | No depende del origen; se cumplen siempre |
| Dónde se ubican | Caso de uso (capa `usecase`) | Servicio interno |
| Se aplican a llamadas entre módulos | No | Sí |

| Aspecto | Entrada HTTP | Entrada entre módulos |
|---|---|---|
| Ruta | `CatalogController → CatalogUseCase → CatalogService` | `CatalogModule → CatalogModuleImpl → CatalogService` |
| Comprobación de autorización de usuario | Sí, en el caso de uso | No pasa por caso de uso de usuario |

| Aspecto | ArchUnit | Spring Modulith |
|---|---|---|
| Enfoque | Reglas explícitas escritas como tests (`@ArchTest`) | Deriva el modelo modular de los paquetes |
| Uso típico en el tema | Prohibir acceso a `catalog.internal`; reglas internas como `Controller → UseCase → Service`; casos de uso que no se llamen entre sí | Detectar ciclos, accesos a internos y dependencias no permitidas; documentar y probar módulos por separado |
| Relación | Base del análisis de dependencias | Usa ArchUnit por debajo; no sustituye todas sus reglas |
| Momento | Al ejecutar el test, no en compilación | Al ejecutar el test, no en compilación |

| Aspecto | NamedInterface | ApplicationModule |
|---|---|---|
| Propósito | Exponer un subpaquete como interfaz con nombre | Declarar dependencias permitidas del módulo |
| Dónde | `package-info.java` del subpaquete (p. ej. `catalog.dto`) | `package-info.java` del paquete raíz del módulo (p. ej. `orders`) |

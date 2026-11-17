# 04 - Monolito modular

En un **monolito**, todas las capacidades de la aplicación forman parte de un mismo sistema. A medida que crece, el código de catálogo, pedidos, usuarios o envíos puede quedar repartido por paquetes compartidos. Las dependencias entre esas capacidades se vuelven difíciles de reconocer y controlar, y un cambio en una parte puede tener efectos poco evidentes en otra.

El problema **no** es que la aplicación se construya y despliegue como una unidad, sino que el código **no tenga límites claros entre sus capacidades**.

## 1. Una posible arquitectura modular

Una forma de abordar este problema es organizar el monolito en **módulos de negocio**:

- La aplicación **sigue teniendo un único despliegue**.
- Cada módulo reúne el código de **una capacidad concreta** y **limita cómo pueden utilizarla los demás**.

La estructura que se propone es **una opción entre varias arquitecturas válidas, no una receta universal**. En ella:

- Cada módulo expone una **API pública** y sus **DTO**.
- Su implementación queda dentro de `internal`, organizada con las capas ya existentes (las de la arquitectura por capas).

##### Diagrama: aplicación con un único despliegue

El diagrama (titulado «Aplicación (un despliegue)») muestra tres paquetes dentro de la misma aplicación:

- **`catalog`**, con tres componentes: la *API pública* `CatalogModule`, los *DTO públicos* `catalog.dto` y las *capas internas* `catalog.internal`.
- **`orders`**, con el componente «Módulo de pedidos».
- **`shipping`**, con el componente «Módulo de envíos».

Relaciones (sentido de las flechas):

- `CatalogModule` → `catalog.dto` (dependencia discontinua): «contrato»; los DTO forman parte del contrato de la API.
- `CatalogModule` → `catalog.internal` (asociación continua): «delega»; la API pública delega en las capas internas.
- Módulo de pedidos → `CatalogModule` (discontinua): «usa la API pública»; `orders` no accede a `catalog.internal`.
- Módulo de envíos → Módulo de pedidos (discontinua): «solicita una operación».

## 2. API pública e implementación interna

En una tienda, módulos como `catalog`, `orders`, `users` y `shipping` agrupan **capacidades de negocio**. Cada módulo ofrece a los demás:

- una **API pública**, y
- los **DTO que forman parte de ese contrato**.

El resto de su código queda dentro de `internal`.

En el catálogo:

- `CatalogModule` es la **API pública**.
- Su implementación, `CatalogModuleImpl`, vive en `internal.application` y **delega** en `CatalogService`, que forma parte de la implementación interna.
- Así, otro módulo **depende del contrato del catálogo**, no de esa clase de implementación ni de su servicio.

##### Diagrama: paquetes del módulo de catálogo

Paquetes y elementos:

- `com.example.store.catalog`: API pública `CatalogModule`.
- `com.example.store.catalog.dto`: DTO `BookSummary`.
- `com.example.store.catalog.internal`, con subpaquetes por capa:
  - `application`: `CatalogModuleImpl`.
  - `controller`: `CatalogController`.
  - `domain`: `CatalogService` y la interfaz `CatalogRepository`.
  - `persistence`: `CatalogRepositoryImpl`.
- `com.example.store.orders`: «Código consumidor».

Relaciones:

- `CatalogModule` ⇢ `BookSummary`: «expone en el contrato».
- `CatalogModule` → `CatalogModuleImpl`: «delega».
- `CatalogModuleImpl` → `CatalogService`: «llama».
- `CatalogController` → `CatalogService`: «invoca».
- `CatalogService` ⇢ `CatalogRepository`: «usa».
- `CatalogRepositoryImpl` ⇢ `CatalogRepository`: «implementa» (realización de la interfaz).
- Código consumidor de `orders` ⇢ `CatalogModule`: «usa la API pública».

### 2.1 Verificar los límites entre módulos

La estructura de un sistema **expresa** sus límites, pero **no siempre los hace cumplir**. Para comprobar que las dependencias respetan esos límites se pueden ejecutar **tests de arquitectura** que verifiquen automáticamente cómo se relacionan los módulos.

En Java, que una clase esté en un paquete llamado `internal` **no la hace inaccesible**: si es pública, otras clases pueden usarla. Con **ArchUnit** se puede expresar una regla que prohíba a las clases ajenas a `catalog` depender de `catalog.internal`. El ejemplo define un campo anotado con `@ArchTest` de tipo `ArchRule` (`outside_catalog_must_not_use_internal`) construido así:

```java
noClasses()
    .that().resideOutsideOfPackage("..catalog..")
    .should().dependOnClassesThat()
    .resideInAPackage("..catalog.internal..");
```

Al ejecutar el test, ArchUnit comprueba las dependencias y detecta las que incumplen la regla:

- Si encuentra alguna, **el test falla**.
- **No impide por sí mismo** que se escriba la importación ni que se compile el código.

## 3. Separar los flujos de entrada con casos de uso

Con la arquitectura actual hay **dos entradas** que llegan a servicios internos:

- La **API pública del módulo**: `CatalogModule → CatalogModuleImpl → CatalogService`.
- Una **petición HTTP**: `CatalogController → CatalogService`.

Esta separación importa cuando **una operación depende de quién la solicita**. Por ejemplo, crear un libro puede requerir que la persona usuaria sea administradora, mientras que consultar su carrito requiere que el usuario esté logueado.

- Si estas comprobaciones se hacen **en el controlador**, quedan mezcladas con HTTP y habrá que **repetirlas** cuando existan más controladores o entradas.
- Si se aplican **indiscriminadamente en el servicio interno**, una llamada legítima desde otro módulo puede evaluarse con una identidad o un contexto que no corresponden. Por ejemplo, el módulo de envíos puede solicitar cancelar un pedido **sin actuar como la persona dueña** de ese pedido.

Distinción clave:

- Las **políticas de acceso de la persona usuaria** dependen de **quién inicia** ese flujo.
- Las **reglas e invariantes del servicio** deben cumplirse **siempre**, venga la llamada de una persona usuaria o de otro módulo.

Para separar ambas responsabilidades se añade la **capa `usecase`** entre el controlador y el servicio. El **caso de uso** coordina el flujo iniciado por una persona usuaria y comprueba las condiciones específicas de ese flujo **antes** de llamar al servicio. La entrada entre módulos **permanece igual**: `CatalogModule → CatalogModuleImpl → CatalogService`. **Un módulo no pasa por un caso de uso de usuario.**

##### Diagrama de secuencia: dos flujos de entrada

Participantes: actor «Persona usuaria», `CatalogController`, `CatalogUseCase`, `CatalogService`, «Módulo consumidor», `CatalogModule` y `CatalogModuleImpl`.

Grupo **«Petición HTTP»**, en orden:

1. Persona usuaria → `CatalogController`: petición HTTP.
2. `CatalogController` → `CatalogUseCase`: ejecutar caso de uso.
3. `CatalogUseCase` → `CatalogUseCase`: comprobar autorización (mensaje a sí mismo).
4. `CatalogUseCase` → `CatalogService`: ejecutar operación.

Grupo **«Llamada de otro módulo»**, en orden:

1. Módulo consumidor → `CatalogModule`: invocar operación.
2. `CatalogModule` → `CatalogModuleImpl`: delegar operación.
3. `CatalogModuleImpl` → `CatalogService`: ejecutar operación.

La comprobación de autorización solo aparece en el flujo HTTP; ambos flujos confluyen en `CatalogService`.

> **Importante:** Los casos de uso representan **flujos de entrada**, no operaciones reutilizables para otros flujos. Si un caso de uso llamara a otro, acoplaría ambos flujos y podría arrastrar las decisiones de acceso propias del caso invocado. Cuando varios flujos necesitan la misma operación, la comparten **mediante el servicio**. Por el mismo motivo, una llamada entre módulos utiliza la API pública —`CatalogModule → CatalogModuleImpl → CatalogService`— y no un caso de uso de usuario. ArchUnit también puede comprobar que los casos de uso no se invoquen entre sí y que `CatalogModule` no dependa de ellos.

## 4. Modelos privados y relaciones mediante identificadores

Cada módulo mantiene sus **modelos de dominio** en su paquete `internal`. Las reglas de arquitectura impiden que otros módulos dependan de ese paquete; por tanto, esos modelos son **privados para el módulo** que los contiene.

Ejemplos:

- `Order` pertenece a `orders.internal`. Si tuviera un campo de tipo `User`, necesitaría importar `users.internal.User` y dependería de un modelo interno de otro módulo, lo que **violaría el límite** entre ambos.
- Del mismo modo, `OrderDetail` no puede tener un campo de tipo `Product` de `catalog.internal`.

Por eso, los pedidos guardan **identificadores** en lugar de referencias a esos objetos:

- `Order` almacena `userId: UUID`.
- `OrderDetail` almacena `productId: UUID`.

El **tipo del identificador** tampoco debe importar clases de `users.internal` ni de `catalog.internal`. En el ejemplo se usa `UUID`, pero también podría emplearse:

- un tipo definido localmente en el módulo consumidor, o
- un tipo incluido en un contrato público, si se decide exponerlo.

Si hace falta consultar más datos del usuario o del producto, se utiliza la **API pública del módulo propietario**.

##### Diagrama de clases: identificadores entre módulos

- Paquete `orders.internal`: clase `Order` con atributo `+userId: UUID` y clase `OrderDetail` con atributo `+productId: UUID`.
- Paquete `users.internal`: clase `User`.
- Paquete `catalog.internal`: clase `Product`.

No hay ninguna flecha entre los paquetes: `Order` y `OrderDetail` no referencian a `User` ni a `Product`; solo guardan sus identificadores.

## 5. Spring Modulith: detección y verificación de módulos

**Spring Modulith** es una biblioteca del ecosistema Spring que **deriva un modelo modular a partir de los paquetes** de la aplicación. Ayuda a **documentar** ese modelo y a **verificar** que se respeta, pero **no decide la arquitectura por el equipo**.

##### Detección de módulos

Por defecto, los **paquetes hijos directos del paquete base** de la aplicación se detectan como módulos. Por ejemplo, si la aplicación parte de `com.example.store`, entonces `com.example.store.catalog` y `com.example.store.orders` se consideran módulos.

##### API pública y subpaquetes internos

El **paquete raíz de cada módulo constituye su API pública**. Sus **subpaquetes son internos**, salvo que se expongan explícitamente. Para hacer público el subpaquete `catalog.dto` se puede añadir un `package-info.java` con la anotación `@NamedInterface`:

```java
@org.springframework.modulith.NamedInterface("dto")
package com.example.store.catalog.dto;
```

##### Dependencias permitidas

Después, el paquete raíz del módulo puede declarar las **dependencias permitidas** mediante `@ApplicationModule`. Por ejemplo, `orders` puede depender de la interfaz `dto` de `catalog` (en su `package-info.java`):

```java
@org.springframework.modulith.ApplicationModule(
    allowedDependencies = "catalog::dto"
)
package com.example.store.orders;
```

La sintaxis `"catalog::dto"` designa la interfaz con nombre `dto` del módulo `catalog`.

##### Test de verificación

La verificación se añade como un **test JUnit dentro del código de pruebas**, no en el código de producción. Si la clase principal `Application` está en el paquete `com.example.store`, el archivo puede ubicarse en `src/test/java/com/example/store/ApplicationModulesTest.java`.

El test (clase `ApplicationModulesTest` en el paquete `com.example.store`) contiene un método anotado con `@Test` (`verifiesModuleStructure`) cuya línea clave es:

```java
ApplicationModules.of(Application.class).verify();
```

(`ApplicationModules` se importa de `org.springframework.modulith.core`.)

- **No hace falta arrancar el contexto de Spring**: la prueba analiza la estructura de paquetes y sus dependencias.
- Detecta **ciclos entre módulos**, **accesos a paquetes internos** y **dependencias que no estén permitidas**.
- Spring Modulith usa por debajo el **análisis de dependencias de ArchUnit**.
- Es una verificación automatizada del modelo modular, **no una protección en tiempo de compilación**.

##### Relación con ArchUnit

ArchUnit **sigue siendo útil** para definir reglas más específicas **dentro de un módulo**, por ejemplo, exigir que las dependencias sigan el flujo `Controller → UseCase → Service`. Modulith también ofrece facilidades para **documentar la estructura** y **probar módulos por separado**, pero **no sustituye todas las reglas de ArchUnit**.

> **Consejo:** Los DTO también se pueden colocar **directamente en el paquete raíz del módulo**; allí son públicos por defecto y no hace falta usar `@NamedInterface` ni crear `package-info.java` para exponerlos. Aun así, `package-info.java` puede utilizarse para declarar `@ApplicationModule` y sus dependencias permitidas.

## 6. Qué cambia y qué permanece

El **monolito modular** mantiene un **único despliegue**, pero organiza el código en **módulos de negocio con límites explícitos y verificables**.

| Dimensión | Organización por capas | Monolito modular |
|---|---|---|
| Despliegue | Una aplicación | Sigue siendo una aplicación y un único despliegue |
| Organización | Las capas organizan por responsabilidad técnica, no por capacidad de negocio | Conserva las capas dentro de cada módulo de negocio |
| Colaboración entre módulos | La estructura no define límites explícitos entre capacidades de negocio | Los módulos se relacionan mediante API pública y DTO |
| Entradas | Los flujos de entrada llegan a los servicios | Separa `Controller → UseCase → Service` de `Module → ModuleImpl → Service` |
| Modelos | Puede haber referencias directas entre modelos de distintas capacidades | Los modelos de otros módulos se relacionan mediante IDs |
| Verificación | La estructura depende principalmente de convenciones | ArchUnit y Spring Modulith ayudan a verificar los límites entre módulos |

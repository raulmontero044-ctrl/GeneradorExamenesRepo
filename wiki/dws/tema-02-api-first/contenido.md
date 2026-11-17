# 02 - API First

La **API** es el contrato entre una aplicación y quienes la consumen. Define:

- las operaciones,
- los datos de entrada y salida,
- las respuestas posibles.

Este tema se centra en el contrato **HTTP**. La misma idea de contrato explícito se aplica a la comunicación entre módulos internos, que se desarrolla en el tema 04.

Los **DTO de entrada y salida** describen los datos que cruzan la frontera HTTP: se diseñan para el contrato y **no tienen por qué coincidir con los modelos internos**.

La validación del **formato de la solicitud** (campos obligatorios, formatos, longitudes) se declara con **Jakarta Bean Validation** mediante `@NotBlank`, `@Email`, `@Size` y `@Valid`, y corresponde a la **capa de presentación**. Las **reglas de negocio siguen perteneciendo al dominio**. La validación completa de la entrada, con sus invariantes, se desarrolla en el tema 03.

## 1. API First y Code First

| Enfoque | Punto de partida | Uso del contrato |
|---|---|---|
| **API First** | Se diseña el contrato antes de implementar | Guía y permite acordar el trabajo de clientes y servidor |
| **Code First** | Se implementa primero | El contrato se deriva después del código, por ejemplo, con anotaciones |

**API First** hace explícitas las decisiones de interfaz y permite revisarlas antes de implementarlas. El contrato describe lo que necesita el cliente; **no expone automáticamente los modelos internos**.

##### Diagrama del flujo API First

El diagrama (de izquierda a derecha) muestra cuatro pasos encadenados por flechas en este orden:

1. **Diseñar contrato** →
2. **Revisar y acordar** →
3. **Implementar API** →
4. **Comprobar contrato**.

Es decir, el contrato se diseña y se acuerda antes de la implementación, y tras implementar se comprueba que la API cumple el contrato.

## 2. OpenAPI y Swagger

**OpenAPI** es una especificación para describir APIs **HTTP** en **YAML** o **JSON**. Define:

- rutas y operaciones,
- parámetros,
- esquemas de datos,
- respuestas,
- restricciones.

**Swagger** es un conjunto de herramientas para trabajar con **OpenAPI**. Por ejemplo, **Swagger UI** presenta el contrato como documentación interactiva.

##### Ejemplo de fragmento OpenAPI

La fuente muestra un fragmento YAML que define una solicitud y dos respuestas de una operación:

- Bajo `paths`, la ruta `/orders` con la operación `post`, identificada con `operationId: createOrder`.
- Un `requestBody` con `required: true`, de tipo `application/json`, cuyo esquema es una referencia: `$ref: '#/components/schemas/CreateOrderRequest'`.
- Dos `responses`: `'201'` con descripción «Order created» y `'400'` con descripción «Invalid request».

## 3. Contrato e implementación en Spring

El contrato **HTTP** y el código que implementa sus operaciones son responsabilidades relacionadas, pero **pueden mantenerse separados**. En **Spring**, **springdoc-openapi** genera un documento **OpenAPI** y **Swagger UI** a partir de las anotaciones del código.

##### Opción 1: interfaz Java como contrato

Una opción es declarar rutas, parámetros y documentación en una **interfaz Java** como `OrderHttpApi`, y dejar que `OrderController` implemente sus operaciones. El nombre indica que es el **contrato HTTP**, distinto de una API interna que un módulo pueda ofrecer a otros módulos.

El ejemplo de la fuente muestra:

- La interfaz `OrderHttpApi`, anotada con `@Tag(name = "Orders")`.
- Su método `create` anotado con `@Operation(summary = "Create an order")`, con `@ApiResponses` que contiene dos `@ApiResponse` (`responseCode = "201"`, «Order created», y `responseCode = "400"`, «Invalid request») y con `@PostMapping("/orders")`.
- La firma: `ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest request);`
- La clase `OrderController`, anotada con `@RestController`, que hace `implements OrderHttpApi` y sobrescribe (`@Override`) `create(CreateOrderRequest request)`; su cuerpo se limita a delegar la operación y producir la respuesta.

Así se **separan las declaraciones del contrato HTTP de la lógica del controlador** y **springdoc-openapi** puede generar la documentación. La interfaz puede diseñarse antes de implementar el controlador y formar parte de un flujo API First, **pero queda ligada al código Java**: el documento generado **no es una especificación independiente del código**.

##### Opción 2: archivo OpenAPI como fuente de verdad

Otra opción es mantener una especificación **OpenAPI** en un archivo, por ejemplo `orders-api.yaml`, como **fuente de verdad antes de implementar**. Es útil para revisar el contrato con consumidores y trabajar en paralelo. Además, a partir de esa especificación se puede generar parte del código Java.

##### Diagrama de los dos flujos

El diagrama de actividad parte de una decisión, «Fuente del contrato», con dos ramas:

- **Interfaz Java:** Interfaz Java + anotaciones → springdoc-openapi → Documento OpenAPI y Swagger UI.
- **Archivo OpenAPI:** `orders-api.yaml` → OpenAPI Generator (plugin de Maven) → Interfaces API + DTOs generados → El Controller implementa la interfaz generada.

Ambas ramas confluyen en el final del flujo.

##### OpenAPI Generator y Maven

En el segundo flujo, **OpenAPI Generator** lee `orders-api.yaml` y genera:

- las **interfaces de la API**,
- las **clases de modelo** (los **DTO**) definidas en el contrato.

El plugin de Maven **suele** ejecutar esta generación en la fase `generate-sources`, **antes de compilar** el proyecto. Por ejemplo, al ejecutar `mvn compile`, Maven recorre las fases anteriores e invoca la generación si el plugin está configurado para ello.

Las clases generadas **suelen** quedar en una carpeta como `target/generated-sources/openapi`, aunque **la ruta depende de la configuración**. **No siempre** aparecen entre los archivos escritos a mano: puede ser necesario ejecutar Maven y actualizar el proyecto en el IDE para que las muestre. **Se pueden consultar, pero no se deben modificar directamente**; si cambia el contrato, se vuelve a generar el código.

El equipo implementa las operaciones de las interfaces generadas en sus `Controller`.

En resumen:

- con **springdoc-openapi** se obtiene **documentación OpenAPI a partir del código Spring**;
- con **OpenAPI Generator** se obtiene **código Java a partir del archivo OpenAPI**.

##### Comparativa de fuentes del contrato

| Fuente del contrato | Ventaja | Precaución |
|---|---|---|
| Interfaz Java `OrderHttpApi` y anotaciones | Contrato y documentación junto a la interfaz HTTP; documentación generada desde Spring | Se define desde el código; los cambios requieren revisar el contrato resultante |
| Archivo `orders-api.yaml` y OpenAPI Generator | Contrato independiente; permite generar interfaces API y DTOs | Configurar el generador y comprobar que la implementación sigue la especificación |

**Elegir una fuente de verdad** evita mantener dos contratos manuales que puedan divergir. En ambos enfoques, los **DTO HTTP** describen los datos públicos y **se mapean a modelos internos**; **no se exponen directamente los modelos del dominio**.

## 4. Cambios y comprobaciones

Un cambio es **incompatible** si obliga a los consumidores a cambiar sus solicitudes o cómo interpretan las respuestas. Ejemplos que **pueden** romper clientes:

- eliminar un campo,
- cambiar su tipo,
- alterar el significado de una respuesta.

Al revisar cambios, comprobar:

- Que operaciones, datos y respuestas describen el comportamiento público.
- Que restricciones y errores son claros para quien consume la API.
- Que los cambios no rompen compatibilidad sin una transición acordada.

Comprobaciones posibles:

- validar la sintaxis **OpenAPI**,
- comparar versiones,
- comprobar solicitudes y respuestas de la implementación.

Las **pruebas HTTP de `controller`** verifican el comportamiento integrado; **abrir Swagger UI no demuestra por sí solo la conformidad**. Si se usa un archivo OpenAPI como fuente, hay que comprobar que la implementación se ajusta a él.

> **Importante:** **OpenAPI** describe el contrato; **Swagger UI** ayuda a explorarlo. La documentación no sustituye el diseño, la revisión de compatibilidad ni las pruebas.

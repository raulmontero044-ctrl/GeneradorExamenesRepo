# Conceptos — 02 - API First

## Contrato y datos

### API

- **Definición:** Contrato entre una aplicación y quienes la consumen. Define operaciones, datos de entrada y salida y respuestas posibles.
- **Detalles clave:** Este tema se centra en el contrato HTTP; la misma idea de contrato explícito se aplica a la comunicación entre módulos internos (tema 04).
- **No confundir con:** una API interna que un módulo ofrece a otros módulos (por eso la interfaz del ejemplo se llama `OrderHttpApi`).
- **Relacionados:** [DTO HTTP](#dto-http), [API First](#api-first), [OpenAPI](#openapi)
- **Sección:** 02 - API First

### DTO HTTP

- **Definición:** DTO de entrada y salida que describen los datos que cruzan la frontera HTTP.
- **Detalles clave:** Se diseñan para el contrato y no tienen por qué coincidir con los modelos internos. Describen los datos públicos y se mapean a modelos internos; no se exponen directamente los modelos del dominio. Con OpenAPI Generator, las clases de modelo (DTO) se generan a partir del contrato.
- **No confundir con:** los modelos internos o del dominio.
- **Relacionados:** [API](#api), [OpenAPI Generator](#openapi-generator), [Jakarta Bean Validation](#jakarta-bean-validation)
- **Sección:** 02 - API First; 3. Contrato e implementación en Spring

### Jakarta Bean Validation

- **Definición:** Mecanismo con el que se declara la validación del formato de la solicitud: campos obligatorios, formatos y longitudes.
- **Detalles clave:** Anotaciones citadas: `@NotBlank`, `@Email`, `@Size` y `@Valid`. Corresponde a la capa de presentación; las reglas de negocio siguen perteneciendo al dominio. En el ejemplo, `@Valid @RequestBody CreateOrderRequest request`. La validación completa con invariantes se desarrolla en el tema 03.
- **No confundir con:** las reglas de negocio, que pertenecen al dominio.
- **Relacionados:** [DTO HTTP](#dto-http)
- **Sección:** 02 - API First

## Enfoques de diseño

### API First

- **Definición:** Enfoque en el que se diseña el contrato antes de implementar; el contrato guía y permite acordar el trabajo de clientes y servidor.
- **Detalles clave:** Hace explícitas las decisiones de interfaz y permite revisarlas antes de implementarlas. El contrato describe lo que necesita el cliente; no expone automáticamente los modelos internos. Flujo: diseñar contrato → revisar y acordar → implementar API → comprobar contrato.
- **No confundir con:** [Code First](#code-first).
- **Relacionados:** [Fuente de verdad del contrato](#fuente-de-verdad-del-contrato), [OpenAPI](#openapi)
- **Sección:** 1. API First y Code First

### Code First

- **Definición:** Enfoque en el que se implementa primero y el contrato se deriva después del código, por ejemplo, con anotaciones.
- **Detalles clave:** Es el punto de partida opuesto a API First.
- **No confundir con:** [API First](#api-first).
- **Relacionados:** [springdoc-openapi](#springdoc-openapi)
- **Sección:** 1. API First y Code First

## Especificación y herramientas

### OpenAPI

- **Definición:** Especificación para describir APIs HTTP en YAML o JSON.
- **Detalles clave:** Define rutas y operaciones, parámetros, esquemas de datos, respuestas y restricciones. Ejemplo: `paths` → `/orders` → `post` con `operationId: createOrder`, `requestBody` obligatorio en `application/json` con `$ref: '#/components/schemas/CreateOrderRequest'` y respuestas `'201'` y `'400'`. OpenAPI describe el contrato.
- **No confundir con:** [Swagger](#swagger) (herramientas) ni con [Swagger UI](#swagger-ui) (exploración).
- **Relacionados:** [Swagger UI](#swagger-ui), [OpenAPI Generator](#openapi-generator), [springdoc-openapi](#springdoc-openapi)
- **Sección:** 2. OpenAPI y Swagger

### Swagger

- **Definición:** Conjunto de herramientas para trabajar con OpenAPI.
- **Detalles clave:** Un ejemplo es Swagger UI.
- **No confundir con:** [OpenAPI](#openapi), que es la especificación.
- **Relacionados:** [Swagger UI](#swagger-ui)
- **Sección:** 2. OpenAPI y Swagger

### Swagger UI

- **Definición:** Herramienta de Swagger que presenta el contrato como documentación interactiva.
- **Detalles clave:** Ayuda a explorar el contrato. Abrir Swagger UI no demuestra por sí solo la conformidad; la documentación no sustituye el diseño, la revisión de compatibilidad ni las pruebas. springdoc-openapi la genera en Spring.
- **No confundir con:** [OpenAPI](#openapi) ni con las pruebas HTTP de `controller`.
- **Relacionados:** [springdoc-openapi](#springdoc-openapi), [Comprobación de conformidad](#comprobación-de-conformidad)
- **Sección:** 2. OpenAPI y Swagger; 4. Cambios y comprobaciones

### springdoc-openapi

- **Definición:** Herramienta que, en Spring, genera un documento OpenAPI y Swagger UI a partir de las anotaciones del código.
- **Detalles clave:** Obtiene documentación OpenAPI a partir del código Spring. El documento generado no es una especificación independiente del código.
- **No confundir con:** [OpenAPI Generator](#openapi-generator), que hace el camino inverso (código Java a partir del archivo OpenAPI).
- **Relacionados:** [Interfaz de contrato HTTP](#interfaz-de-contrato-http), [Code First](#code-first)
- **Sección:** 3. Contrato e implementación en Spring

### OpenAPI Generator

- **Definición:** Herramienta que lee un archivo OpenAPI (p. ej. `orders-api.yaml`) y genera las interfaces de la API y las clases de modelo (DTO) definidas en el contrato.
- **Detalles clave:** Como plugin de Maven suele ejecutarse en la fase `generate-sources`, antes de compilar; al ejecutar `mvn compile` Maven recorre las fases anteriores e invoca la generación si el plugin está configurado. Las clases suelen quedar en `target/generated-sources/openapi` (la ruta depende de la configuración); no siempre aparecen entre los archivos escritos a mano (puede hacer falta ejecutar Maven y actualizar el proyecto en el IDE). Se pueden consultar pero no modificar directamente; si cambia el contrato, se regenera. Los `Controller` implementan las interfaces generadas. Precaución: configurar el generador y comprobar que la implementación sigue la especificación.
- **No confundir con:** [springdoc-openapi](#springdoc-openapi).
- **Relacionados:** [Fuente de verdad del contrato](#fuente-de-verdad-del-contrato), [DTO HTTP](#dto-http)
- **Sección:** 3. Contrato e implementación en Spring

### Interfaz de contrato HTTP

- **Definición:** Interfaz Java (p. ej. `OrderHttpApi`) en la que se declaran rutas, parámetros y documentación del contrato HTTP, implementada por el controlador (`OrderController`).
- **Detalles clave:** Anotaciones del ejemplo: `@Tag`, `@Operation`, `@ApiResponses`/`@ApiResponse`, `@PostMapping`, `@Valid`, `@RequestBody`; el controlador lleva `@RestController` e `implements OrderHttpApi`. Separa las declaraciones del contrato de la lógica del controlador. Puede diseñarse antes que el controlador y formar parte de un flujo API First, pero queda ligada al código Java. Precaución: se define desde el código; los cambios requieren revisar el contrato resultante.
- **No confundir con:** una API interna que un módulo ofrece a otros módulos.
- **Relacionados:** [springdoc-openapi](#springdoc-openapi), [API](#api)
- **Sección:** 3. Contrato e implementación en Spring

### Fuente de verdad del contrato

- **Definición:** Origen único del contrato: la interfaz Java con anotaciones o un archivo OpenAPI (p. ej. `orders-api.yaml`).
- **Detalles clave:** Elegir una fuente de verdad evita mantener dos contratos manuales que puedan divergir. El archivo OpenAPI como fuente de verdad antes de implementar es útil para revisar el contrato con consumidores y trabajar en paralelo, y permite generar parte del código Java. Si se usa un archivo OpenAPI como fuente, hay que comprobar que la implementación se ajusta a él.
- **No confundir con:** la documentación generada.
- **Relacionados:** [OpenAPI Generator](#openapi-generator), [Interfaz de contrato HTTP](#interfaz-de-contrato-http)
- **Sección:** 3. Contrato e implementación en Spring

## Evolución y verificación

### Cambio incompatible

- **Definición:** Cambio que obliga a los consumidores a cambiar sus solicitudes o cómo interpretan las respuestas.
- **Detalles clave:** Eliminar un campo, cambiar su tipo o alterar el significado de una respuesta puede romper clientes. Los cambios no deben romper compatibilidad sin una transición acordada.
- **No confundir con:** —
- **Relacionados:** [Comprobación de conformidad](#comprobación-de-conformidad)
- **Sección:** 4. Cambios y comprobaciones

### Comprobación de conformidad

- **Definición:** Verificación de que la implementación y sus cambios se ajustan al contrato.
- **Detalles clave:** Al revisar cambios: que operaciones, datos y respuestas describan el comportamiento público; que restricciones y errores sean claros para el consumidor; que no se rompa compatibilidad sin transición acordada. Se puede validar la sintaxis OpenAPI, comparar versiones y comprobar solicitudes y respuestas. Las pruebas HTTP de `controller` verifican el comportamiento integrado; Swagger UI por sí solo no demuestra la conformidad.
- **No confundir con:** explorar la documentación en Swagger UI.
- **Relacionados:** [Cambio incompatible](#cambio-incompatible), [Swagger UI](#swagger-ui)
- **Sección:** 4. Cambios y comprobaciones

## Comparativas

| Aspecto | API First | Code First |
|---|---|---|
| Punto de partida | Se diseña el contrato antes de implementar | Se implementa primero |
| Uso del contrato | Guía y permite acordar el trabajo de clientes y servidor | Se deriva después del código, p. ej. con anotaciones |

| Aspecto | Interfaz Java `OrderHttpApi` y anotaciones | Archivo `orders-api.yaml` y OpenAPI Generator |
|---|---|---|
| Herramienta | springdoc-openapi | OpenAPI Generator (plugin de Maven) |
| Qué se obtiene | Documentación OpenAPI y Swagger UI a partir del código Spring | Código Java (interfaces API y DTOs) a partir del archivo OpenAPI |
| Ventaja | Contrato y documentación junto a la interfaz HTTP; documentación generada desde Spring | Contrato independiente; permite generar interfaces API y DTOs |
| Precaución | Se define desde el código; los cambios requieren revisar el contrato resultante | Configurar el generador y comprobar que la implementación sigue la especificación |
| Independencia del código | No: queda ligada al código Java | Sí: especificación independiente |

| Aspecto | OpenAPI | Swagger / Swagger UI |
|---|---|---|
| Naturaleza | Especificación (YAML o JSON) | Conjunto de herramientas / documentación interactiva |
| Función | Describe el contrato | Ayuda a explorarlo |

| Aspecto | Validación de formato (Jakarta Bean Validation) | Reglas de negocio |
|---|---|---|
| Qué cubre | Campos obligatorios, formatos, longitudes | Reglas del negocio |
| Capa | Presentación | Dominio |

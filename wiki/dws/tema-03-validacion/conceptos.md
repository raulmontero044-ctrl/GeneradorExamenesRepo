# Conceptos — 03 - Validación e invariancias

## Dos fronteras de validación

### Validación de formato del contrato

- **Definición:** comprobación de que una petición cumple el formato del contrato de la API. Se responde en la capa de presentación, sobre el DTO de entrada, con Jakarta Validation.
- **Detalles clave:** respuesta típica **400** indicando campo y motivo; el rechazo ocurre antes de tocar el dominio ni la base de datos.
- **No confundir con:** [Invariante](#invariante), que responde si el estado propuesto es válido para el negocio.
- **Relacionados:** [Jakarta Validation](#jakarta-validation), [DTO de entrada](#dto-de-entrada), [ProblemDetail](#problemdetail)
- **Sección:** 1. Dos preguntas, dos fronteras

### Invariante

- **Definición:** regla de negocio expresada en código en el dominio (modelos) que determina si un estado propuesto es válido.
- **Detalles clave:** se protege en la propia construcción del tipo ([value object](#value-object)); si se incumple, se lanza una excepción de dominio que el manejador mapea al error del contrato. Vive en el tipo, donde el objeto se construye, y protege en todas las vías de creación.
- **No confundir con:** [Validación de formato del contrato](#validación-de-formato-del-contrato); la misma regla (p. ej. IBAN `ES` + 22 dígitos) puede estar en ambos sitios sin ser redundante.
- **Relacionados:** [Value object](#value-object), [Excepción de dominio](#excepción-de-dominio), [Constructor compacto](#constructor-compacto)
- **Sección:** 1. Dos preguntas, dos fronteras

## Jakarta Validation

### Jakarta Validation

- **Definición:** mecanismo que declara la validación como anotaciones sobre los campos del DTO: el DTO describe el contrato y las anotaciones, qué solicitudes admite.
- **Detalles clave:** solo se aplica donde un framework valida (una petición HTTP); un `new Iban("…")` directo se la salta. Su dependencia (`jakarta.validation`) está prohibida en el dominio por la verificación de módulos (tema 04) y queda reservada a los DTO de las fronteras.
- **No confundir con:** [Invariante](#invariante) en el value object, que se aplica en toda construcción.
- **Relacionados:** [Constraint estándar](#constraint-estándar), [Constraint personalizada](#constraint-personalizada), [Anotación @Valid](#anotación-valid)
- **Sección:** 2. Validación de entrada con Jakarta Validation

### DTO de entrada

- **Definición:** objeto de la capa de presentación que describe el contrato de una operación y sobre cuyos campos se declaran las anotaciones de validación.
- **Detalles clave:** previene que una solicitud inválida llegue a tocar el sistema (rechazo temprano y claro, **400** con campo y mensaje). Puede contener otros DTO validados en cascada. Se prueba con pruebas de integración HTTP que verifican el rechazo, sin repetir los casos del value object.
- **No confundir con:** [Value object](#value-object), tipo del dominio que garantiza la invariante por cualquier vía.
- **Relacionados:** [Jakarta Validation](#jakarta-validation), [Validación en cascada](#validación-en-cascada)
- **Sección:** 2. Validación de entrada con Jakarta Validation

### Constraint estándar

- **Definición:** anotación de Jakarta Validation incluida de serie para comprobar campos.
- **Detalles clave:** presencia (`@NotNull` valor, `@NotBlank` cadena con contenido, `@NotEmpty` colección no vacía); `@Size` longitud o tamaño; `@Min`, `@Max`, `@Positive`, `@NegativeOrZero` rango numérico; `@Email`, `@Pattern` formato; `@Digits`, `@DecimalMin` precisión y escala; `@Past`, `@Future` comparación con el momento actual. Se reflejan solas en el esquema OpenAPI.
- **No confundir con:** [Constraint personalizada](#constraint-personalizada).
- **Relacionados:** [Jakarta Validation](#jakarta-validation), [springdoc-openapi](#springdoc-openapi)
- **Sección:** 2.1 Constraints estándar

### Anotación @Valid

- **Definición:** anotación que activa la validación de un DTO: Spring valida el DTO de entrada cuando el parámetro del `controller` la lleva (`@Valid @RequestBody CreateAccountRequest request`).
- **Detalles clave:** sin `@Valid` el DTO no se valida aunque lleve anotaciones; es una decisión explícita, operación por operación. Sobre un campo que contiene DTO (p. ej. `@NotEmpty @Valid List<ItemRequest> items`) provoca la validación en cascada.
- **No confundir con:** las constraints, que declaran qué se comprueba pero no activan la validación.
- **Relacionados:** [Validación en cascada](#validación-en-cascada), [DTO de entrada](#dto-de-entrada)
- **Sección:** 2.2 Validación automática y en cascada

### Validación en cascada

- **Definición:** validación de los DTO anidados dentro de otro DTO; cada uno se valida en cascada.
- **Detalles clave:** ejemplo `CreateOrderRequest` con una lista `@Valid` de `ItemRequest` (`@NotBlank productId`, `@Positive quantity`).
- **No confundir con:** —
- **Relacionados:** [Anotación @Valid](#anotación-valid)
- **Sección:** 2.2 Validación automática y en cascada

### Constraint personalizada

- **Definición:** constraint propia que se declara cuando el formato de la aplicación no encaja con ninguna anotación estándar, y que delega en una clase validadora.
- **Detalles clave:** la anotación (`@ValidIban`) lleva `@Constraint(validatedBy = …)`, `@Retention(RUNTIME)`, `@Target(FIELD)` y declara `message()`, `groups()` y `payload()`; solo declara mensaje y dónde aplica. No se refleja sola en OpenAPI: hay que documentarla (p. ej. con `@Schema`) o el contrato «miente» en ese punto.
- **No confundir con:** [Constraint estándar](#constraint-estándar); con el [value object](#value-object) que puede repetir la misma regla en el dominio.
- **Relacionados:** [Clase validadora](#clase-validadora)
- **Sección:** 2.3 Constraints personalizadas

### Clase validadora

- **Definición:** clase que implementa `ConstraintValidator<Anotación, Tipo>` y contiene la lógica de una constraint personalizada en `isValid(value, context)`.
- **Detalles clave:** `IbanFormatValidator` devuelve `true` si el valor es `null` (la obligatoriedad corresponde a `@NotBlank`) y, si no, comprueba `^ES\d{22}$`. Está separada de la anotación y se prueba directamente con valores que cumplen y no cumplen.
- **No confundir con:** la anotación de la constraint, que solo declara mensaje y ámbito.
- **Relacionados:** [Constraint personalizada](#constraint-personalizada)
- **Sección:** 2.3 Constraints personalizadas

## Respuesta de error y contrato

### ProblemDetail

- **Definición:** documento de error según **RFC 9457** que devuelve el manejador central cuando falla la validación.
- **Detalles clave:** se crea con `ProblemDetail.forStatus(HttpStatus.BAD_REQUEST)`, título «Solicitud inválida» y propiedad `errors` con la lista `campo: mensaje`. Todas las operaciones comparten el mismo formato; solo cambian los campos que fallan.
- **No confundir con:** —
- **Relacionados:** [Manejador central de validación](#manejador-central-de-validación)
- **Sección:** 2.4 El resultado: 400 coherente con la API

### Manejador central de validación

- **Definición:** clase `@RestControllerAdvice` con un `@ExceptionHandler(MethodArgumentNotValidException.class)` que unifica la respuesta a los fallos de validación.
- **Detalles clave:** Spring lanza `MethodArgumentNotValidException` antes de que el `controller` ejecute su cuerpo. El manejador de la API también traduce las excepciones de dominio al error documentado en el contrato. Su formato se prueba una vez, no en cada operación.
- **No confundir con:** —
- **Relacionados:** [ProblemDetail](#problemdetail), [Excepción de dominio](#excepción-de-dominio)
- **Sección:** 2.4 El resultado: 400 coherente con la API

### springdoc-openapi

- **Definición:** herramienta que traduce las anotaciones de los DTO a restricciones del esquema OpenAPI.
- **Detalles clave:** `@NotBlank` → campo requerido; `@Size` → longitud máxima; `@Min` → mínimo. Swagger UI muestra qué admite el contrato sin leer el código. Las constraints personalizadas deben documentarse a mano (p. ej. `@Schema`).
- **No confundir con:** —
- **Relacionados:** [Constraint estándar](#constraint-estándar), [Constraint personalizada](#constraint-personalizada)
- **Sección:** 2.5 Del código al contrato: OpenAPI

## Dominio

### Value object

- **Definición:** tipo pequeño, inmutable y comparado por valor que representa un concepto de negocio y protege sus invariantes en su propia construcción: si los datos no son válidos, el objeto no existe.
- **Detalles clave:** ejemplo `record Iban(String value)` que valida en el constructor compacto y lanza `InvalidIbanException`; expone `country()`. El modelo usa `Iban iban` en lugar de `String iban`. Protege en toda vía de creación (deserialización, mapeador, caso de uso, otro módulo). Se prueba con tests unitarios sin framework ni mocks, incluidos valores límite: son las piezas más baratas de probar.
- **No confundir con:** [DTO de entrada](#dto-de-entrada) con anotaciones.
- **Relacionados:** [Invariante](#invariante), [Constructor compacto](#constructor-compacto), [Primitive obsession](#primitive-obsession), [DDD](#ddd)
- **Sección:** 3. Invariancias con value objects

### Constructor compacto

- **Definición:** constructor de un `record` sin lista de parámetros (`public Iban { … }`) que valida antes de asignar.
- **Detalles clave:** su cuerpo se ejecuta en toda vía de creación del objeto, por lo que ninguna pieza puede construir el tipo con contenido incorrecto.
- **No confundir con:** —
- **Relacionados:** [Value object](#value-object)
- **Sección:** 3. Invariancias con value objects

### DDD

- **Definición:** *Domain-Driven Design*; idea según la cual el tipo que representa un concepto no deja llegar nunca a un estado inválido ni se deja confundir con otros tipos de negocio.
- **Detalles clave:** es la base de los value objects y sustituye la *primitive obsession*.
- **No confundir con:** —
- **Relacionados:** [Value object](#value-object), [Primitive obsession](#primitive-obsession)
- **Sección:** 3. Invariancias con value objects

### Primitive obsession

- **Definición:** uso de tipos primitivos (p. ej. `String`) para representar conceptos de negocio, obligando a adivinar si cada `String` es un IBAN, un teléfono o un código de banco.
- **Detalles clave:** se sustituye dando a cada concepto su propio tipo (value object).
- **No confundir con:** —
- **Relacionados:** [Value object](#value-object), [DDD](#ddd)
- **Sección:** 3. Invariancias con value objects

### Excepción de dominio

- **Definición:** excepción que lanza el dominio cuando un estado propuesto incumple una invariante (p. ej. `InvalidIbanException`).
- **Detalles clave:** el manejador la traduce al error del contrato (por ejemplo **409** o **422**). Caso típico: campo válido para el contrato pero inválido para el negocio (saldo inicial `0.02`): el caso de uso invoca al modelo, salta la excepción y el manejador la traduce al error documentado.
- **No confundir con:** el **400** de validación de formato.
- **Relacionados:** [Invariante](#invariante), [Manejador central de validación](#manejador-central-de-validación)
- **Sección:** 4. ¿Duplicar la regla en dos sitios?

## Pruebas

### Estrategia de pruebas de validación

- **Definición:** reparto de qué se prueba en cada pieza de la validación.
- **Detalles clave:** value objects → unitarias sin framework ni mocks, con valores límite; constraints personalizadas → la validadora directamente; DTO de entrada → integración HTTP (`@WebMvcTest`, `MockMvc`, caso de uso con `@MockitoBean`) que verifica el rechazo, sin repetir casos del value object; handler → una sola vez. No se prueba Spring ni el catálogo completo de combinaciones absurdas de campos.
- **No confundir con:** —
- **Relacionados:** [Value object](#value-object), [Clase validadora](#clase-validadora), [DTO de entrada](#dto-de-entrada)
- **Sección:** 5. Pruebas

## Comparativas

### Dos preguntas, dos fronteras

| Aspecto | Formato del contrato | Validez para el negocio |
|---|---|---|
| Dónde se responde | Capa de presentación (DTO de entrada) | Dominio (modelos) |
| Mecanismo | Jakarta Validation | Invariantes expresadas en código |
| Respuesta típica | 400 indicando campo y motivo | Excepción de dominio mapeada al error del contrato |

### Jakarta Validation frente a invariante en value object

| Aspecto | Anotaciones de Jakarta Validation | Invariante en el value object |
|---|---|---|
| Cuándo se aplica | Solo donde un framework valida (petición HTTP) | Toda construcción del objeto, desde cualquier punto |
| Qué garantiza | Nada ante un `new Iban("…")` directo | El tipo no existe en estado inválido |
| Coste para el dominio | Dependencia de `jakarta.validation`, prohibida (tema 04) | Ninguno |
| Dónde vive | Donde el framework decide aplicarla | En el tipo, donde se construye |

### DTO frente a value object (regla duplicada)

| Aspecto | DTO con anotaciones | Value object |
|---|---|---|
| Qué previene | Que una solicitud inválida toque el sistema | Que el estado inválido exista por cualquier vía |
| Error | 400 con campo y mensaje | Excepción de dominio → p. ej. 409 o 422 |
| Prueba | Integración HTTP del rechazo | Unitaria sin framework ni mocks |

### Constraint estándar frente a personalizada

| Aspecto | Estándar | Personalizada |
|---|---|---|
| Cuándo | El formato encaja con una anotación existente | El formato propio no encaja con ninguna |
| Lógica | Incluida en Jakarta Validation | Clase validadora (`ConstraintValidator`) |
| OpenAPI | Se refleja sola en el esquema | Hay que documentarla (p. ej. `@Schema`) |
| Prueba | — (no se prueba el framework) | La validadora directamente |

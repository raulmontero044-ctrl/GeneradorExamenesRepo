# 03 - Validación e invariancias

Una petición puede rechazarse por **dos motivos distintos**:

1. Incumple el **formato del contrato**.
2. Propone un **estado inválido para el negocio**.

Son preguntas diferentes, que se responden en lugares diferentes y con mecanismos diferentes. Mezclarlas produce los errores clásicos:

- Reglas de negocio escritas en el `controller` que otra vía de entrada omite.
- Datos inválidos que llegan hasta el dominio y se convierten en errores del servidor.

## 1. Dos preguntas, dos fronteras

| Pregunta | Dónde se responde | Mecanismo | Respuesta típica |
|---|---|---|---|
| ¿La petición cumple el formato del contrato? | La capa de presentación (el **DTO** de entrada) | **Jakarta Validation** | **400** indicando campo y motivo |
| ¿El estado propuesto es válido para el negocio? | El dominio (modelos) | **Invariantes** expresadas en código | Excepción de dominio, mapeada al error del contrato |

El mismo dato puede aparecer en las dos preguntas. Por ejemplo, que el IBAN tenga veintidós dígitos y empiece por `ES` puede ser una regla de formato del contrato y, **además**, la invariante del tipo de dominio que lo representa. La regla puede duplicarse, y los apartados siguientes (en especial el 4) explican por qué **no es una redundancia**.

## 2. Validación de entrada con Jakarta Validation

**Jakarta Validation** declara la validación como **anotaciones sobre los campos del DTO**:

- El DTO describe el contrato.
- Las anotaciones describen qué solicitudes admite el contrato.

### 2.1 Constraints estándar

El ejemplo es un `record` `CreateAccountRequest` con cuatro campos anotados:

- `name`: `@NotBlank`.
- `email`: `@NotBlank @Email`.
- `description`: `@Size(max = 240)`.
- `balance` (`BigDecimal`): `@Positive @Digits(integer = 8, fraction = 2)`.

Catálogo de anotaciones estándar que presenta la fuente:

| Anotación | Comprueba |
|---|---|
| `@NotNull`, `@NotBlank`, `@NotEmpty` | Presencia: valor, cadena con contenido, colección no vacía |
| `@Size` | Longitud de cadena o tamaño de colección |
| `@Min`, `@Max`, `@Positive`, `@NegativeOrZero` | Rango numérico |
| `@Email`, `@Pattern` | Formato |
| `@Digits`, `@DecimalMin` | Precisión y escala numéricas |
| `@Past`, `@Future` | Comparación con el momento actual |

Matiz de las tres anotaciones de presencia: `@NotNull` exige que haya valor; `@NotBlank`, que la cadena tenga contenido; `@NotEmpty`, que la colección no esté vacía.

### 2.2 Validación automática y en cascada

Spring valida el DTO de entrada **cuando el parámetro del `controller` se anota con `@Valid`**. El ejemplo es una interfaz `AccountHttpApi` (anotada con `@Tag(name = "Cuentas")`) con la operación:

```java
@PostMapping("/accounts")
ResponseEntity<AccountResponse> create(@Valid @RequestBody CreateAccountRequest request);
```

**Validación en cascada:** el DTO de un nivel puede contener otros DTO, y cada uno se valida en cascada. En el ejemplo, `CreateOrderRequest` tiene `@NotBlank String customerId` y `@NotEmpty @Valid List<ItemRequest> items`; el record anidado `ItemRequest` tiene `@NotBlank String productId` y `@Positive int quantity`. El `@Valid` sobre la lista es lo que hace que se validen también los elementos.

**Sin `@Valid` el DTO no se valida aunque lleve anotaciones**: es una decisión explícita, operación por operación.

### 2.3 Constraints personalizadas

Cuando el formato propio de la aplicación no encaja con ninguna anotación estándar, se declara una **constraint propia** que delega en una **clase validadora**.

La anotación `@ValidIban`:

- Se anota con `@Constraint(validatedBy = IbanFormatValidator.class)`, `@Retention(RetentionPolicy.RUNTIME)` y `@Target(ElementType.FIELD)`.
- Declara `message()` con valor por defecto «El formato del IBAN no es válido», además de `groups()` y `payload()` con valores por defecto vacíos.

La validadora `IbanFormatValidator implements ConstraintValidator<ValidIban, String>` implementa `isValid(String value, ConstraintValidatorContext context)`:

- Si `value` es `null`, devuelve `true`: **la obligatoriedad corresponde a `@NotBlank`**, no a esta constraint.
- En otro caso, devuelve si el valor cumple la expresión `^ES\d{22}$` (`ES` seguido de 22 dígitos).

La validadora **se separa de la anotación** y se puede comprobar directamente (ver §5); la anotación **solo declara el mensaje y dónde aplica**.

### 2.4 El resultado: 400 coherente con la API

Si la validación falla, Spring lanza la excepción **antes de que el `controller` ejecute su cuerpo**. Se unifica con un **manejador central** que devuelve un documento **ProblemDetail** (**RFC 9457**).

El ejemplo es una clase `GlobalValidationHandler` anotada con `@RestControllerAdvice` con un método `@ExceptionHandler(MethodArgumentNotValidException.class)` que:

- Crea el problema con `ProblemDetail.forStatus(HttpStatus.BAD_REQUEST)`.
- Fija el título «Solicitud inválida».
- Añade la propiedad `errors`: la lista de errores de campo (`exception.getBindingResult().getFieldErrors()`), cada uno como `campo: mensaje` (`error.getField() + ": " + error.getDefaultMessage()`).

Consecuencias:

- Todas las operaciones comparten **el mismo formato de error de validación**; solo cambian los campos que fallan.
- El rechazo ocurre **antes de tocar el dominio ni la base de datos**.

### 2.5 Del código al contrato: OpenAPI

**springdoc-openapi** traduce las anotaciones de DTO a restricciones del esquema **OpenAPI**:

- `@NotBlank` marca el campo como requerido.
- `@Size`, la longitud máxima.
- `@Min`, el mínimo.

**Swagger UI** muestra qué admite el contrato sin necesidad de leer el código.

> **Consejo:** las constraints estándar se reflejan solas en el esquema. Para las personalizadas, hay que documentar su restricción en la operación o en el esquema (por ejemplo, con `@Schema`): si quien consume la API no puede ver lo que la validación exige, el contrato miente en ese punto.

## 3. Invariancias con value objects

En el otro lado del par está el dominio. Un **value object** es un tipo pequeño, **inmutable** y **comparado por valor**, que representa un concepto de negocio y **protege sus invariantes en su propia construcción**: si los datos no son válidos, el objeto no existe.

> **Consejo:** es la idea de **DDD** (*Domain-Driven Design*): el tipo que representa un concepto no deja llegar nunca a un estado inválido ni se deja confundir con otros tipos de negocio. Sustituye la *primitive obsession*: en lugar de adivinar si cada `String` es un IBAN, un teléfono o un código de banco, cada concepto tiene su tipo.

El ejemplo es `public record Iban(String value)`:

- Guarda un `Pattern` estático `FORMAT` con la expresión `^ES\d{22}$`.
- Su **constructor compacto** (`public Iban { … }`) valida antes de asignar: si `value` es `null` o no cumple el patrón, lanza `InvalidIbanException`.
- Expone el método `country()`, que devuelve los dos primeros caracteres del valor.

El modelo declara sus relaciones con tipos de dominio (`Iban iban` donde antes estaba `String iban`) y **ninguna otra pieza puede construir un `Iban` con contenido incorrecto**: el cuerpo del constructor compacto se ejecuta en **toda vía de creación** — deserialización, mapeador, caso de uso, otro módulo.

### 3.1 Por qué no Jakarta Validation en el dominio

| Enfoque | Cuándo se aplica | Qué garantiza | Coste para el dominio |
|---|---|---|---|
| Anotaciones de **Jakarta Validation** | Solo donde un framework valida (una petición HTTP) | Nada: un `new Iban("…")` directo no anota nada y se salta la validación | Dependencia de `jakarta.validation` dentro del dominio, prohibida en la verificación de módulos (tema 04) |
| Invariante en el **value object** | Toda construcción del objeto, desde cualquier punto del programa | El tipo no existe en estado inválido | Ninguno: es código y tipos del propio dominio |

La invariante vive **en el tipo**, donde el objeto se construye; las anotaciones viven **donde el framework decide aplicarlas**.

> **Importante:** la pureza del dominio no es estética: el mismo objeto puede construirse desde un `controller`, un caso de uso, un mapeador o el propio módulo. Solo el código de invariante protege en todas las vías; las anotaciones quedan reservadas a los DTO de las fronteras, que sí dependen de `jakarta.validation`.

## 4. ¿Duplicar la regla en dos sitios?

La misma regla puede aparecer en el DTO y en el value object, porque **respaldan decisiones distintas**:

| Quién regula | Qué previene | Error que produce |
|---|---|---|
| El **DTO** con anotaciones | Que una solicitud inválida llegue a tocar el sistema; rechazo temprano y claro | **400** con campo y mensaje |
| El **value object** | Que el estado inválido exista en el sistema por cualquier vía de entrada | Excepción de dominio, traducida por el manejador al error del contrato (por ejemplo, **409** o **422**) |

> **Consejo:** el **DTO** rechaza pronto y con un error claro las solicitudes que no cumplen el contrato; el **value object** garantiza la invariante aunque el dato llegue por una vía que no pasa por la frontera. Ninguno cubre por sí solo todas las vías de entrada; por eso se complementan.

##### Campo válido para el contrato pero inválido para el negocio

Ejemplo de la fuente: un saldo inicial de `0.02`, bien formado pero no admitido por las reglas. Se gestiona así:

1. El caso de uso invoca al modelo.
2. Salta la excepción de negocio.
3. El manejador de la API la traduce al error documentado en el contrato.

## 5. Pruebas

Qué se prueba en cada pieza:

- **Value objects:** pruebas unitarias **sin framework ni mocks**, incluyendo casos frontera con valores límite. Son las piezas **más baratas de probar**; si son `record`, cada invariante es directo de probar.
- **Constraints personalizadas:** probar **la clase validadora directamente** con valores que cumplen y que no cumplen.
- **DTO de entrada:** **pruebas de integración HTTP** que verifican el rechazo, no la lógica del negocio; **no repetir los casos ya cubiertos por el value object**.
- **Handler de errores:** su formato se prueba **una vez** (el manejador compartido), no en cada operación.

Ejemplo de prueba del value object (`IbanTest`):

- Un test `@ParameterizedTest` con `@ValueSource` (valores `""`, `"ES12"`, `"GB29 NWBK 6016 1331 9268 19"` y `"es9121000418450200051332"`) comprueba con `assertThrows(InvalidIbanException.class, () -> new Iban(value))` que todos se rechazan: vacío, demasiado corto, de otro país con espacios y con el prefijo en minúsculas.
- Un `@Test` comprueba que `new Iban("ES9121000418450200051332").country()` devuelve `"ES"`.

Ejemplo de prueba de validación del DTO (`CreateAccountValidationTest`):

- Se anota con `@WebMvcTest(CreateAccountController.class)`, inyecta `MockMvc` con `@Autowired` y sustituye el caso de uso `CreateAccount` con `@MockitoBean`.
- El test `rejectsInvalidEmailAsBadRequest` hace un `post("/accounts")` con JSON `{"name":"Ana","email":"no-email"}` y espera `status().isBadRequest()` y que `$.errors[0]` contenga `"email"`.

> **Importante:** la validación declarada con anotaciones la aplica el framework; probar Spring no es una responsabilidad de estos tests. Lo que se prueba aquí es que cada ruta errónea del contrato produce el rechazo correcto. Lo que no se prueba: repetir el catálogo completo de combinaciones absurdas de campos, ni negocio que ya está bien cubierto por las pruebas del value object.

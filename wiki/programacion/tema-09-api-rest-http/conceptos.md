# Conceptos — 09. APIs REST y Protocolo HTTP

## Protocolo HTTP

### HTTP / HTTPS

- **Definición:** el protocolo sobre el que funcionan las APIs REST para que la capa de presentación (`Controller`) se comunique con el exterior. `HTTPS` es su variante para comunicaciones cifradas.
- **Detalles clave:** se usa en aplicaciones web y sistemas distribuidos. Sigue el modelo cliente-servidor.
- **No confundir con:** [REST](#rest). HTTP es el protocolo; REST es un estilo de arquitectura que se apoya en él.
- **Relacionados:** [Modelo cliente-servidor](#modelo-cliente-servidor), [Método HTTP](#método-http), [Código de estado HTTP](#código-de-estado-http)
- **Sección:** 1. El protocolo HTTP

### Modelo cliente-servidor

- **Definición:** el modelo de la comunicación web. El cliente hace una Petición (`Request`) y el servidor la procesa y devuelve una Respuesta (`Response`).
- **Detalles clave:** cada petición lleva un [método HTTP](#método-http), y cada respuesta debe llevar siempre un [código de estado](#código-de-estado-http).
- **No confundir con:** —
- **Relacionados:** [Petición y Respuesta](#petición-request-y-respuesta-response)
- **Sección:** 1. El protocolo HTTP

### Petición (Request) y Respuesta (Response)

- **Definición:** la Petición es el mensaje que envía el cliente. La Respuesta es el mensaje que devuelve el servidor después de procesarla.
- **Detalles clave:** según el método, los datos de la petición viajan en la URL o en el cuerpo (Request Body). Algunas respuestas no tienen cuerpo, como las de `204 No Content`.
- **No confundir con:** —
- **Relacionados:** [Modelo cliente-servidor](#modelo-cliente-servidor), [Request Body](#cuerpo-de-la-petición-request-body)
- **Sección:** 1. El protocolo HTTP

### URL (Uniform Resource Locator)

- **Definición:** la dirección que utiliza el cliente para localizar un recurso en la red.
- **Detalles clave:** tiene cuatro partes: protocolo (`http://` o `https://`), dominio o host (`api.miservidor.com`, `localhost:8080`), ruta (`/api/v1/books`) y parámetros de consulta (después de `?`, por ejemplo `/books?page=2&limit=10`).
- **No confundir con:** [Ruta (Path / URI)](#ruta-path--uri). La ruta es solo la parte de la URL que identifica el recurso dentro del servidor.
- **Relacionados:** [Dominio / Host](#dominio--host), [Query Parameters](#parámetros-de-consulta-query-parameters), [Endpoint](#endpoint)
- **Sección:** Anatomía de una URL / URI

### Dominio / Host

- **Definición:** la parte de la URL que identifica al servidor.
- **Detalles clave:** ejemplos: `api.miservidor.com` o `localhost:8080`.
- **No confundir con:** [Ruta (Path / URI)](#ruta-path--uri). El host identifica el servidor; la ruta identifica el recurso dentro de él.
- **Relacionados:** [URL](#url-uniform-resource-locator)
- **Sección:** Anatomía de una URL / URI

### Ruta (Path / URI)

- **Definición:** la parte de la URL que identifica el recurso concreto dentro del servidor.
- **Detalles clave:** ejemplo: `/api/v1/books`. Puede incluir Path Params, como el ID en `/books/12/authors`.
- **No confundir con:** [Query Parameters](#parámetros-de-consulta-query-parameters), que van después de `?` y aportan información adicional.
- **Relacionados:** [URL](#url-uniform-resource-locator), [Anidamiento de recursos](#anidamiento-de-recursos)
- **Sección:** Anatomía de una URL / URI

### Parámetros de consulta (Query Parameters)

- **Definición:** información adicional que se añade a la URL después del símbolo `?`.
- **Detalles clave:** ejemplo: `/books?page=2&limit=10`. Es la buena práctica para filtrar y paginar (`GET /books?category=fiction&page=1`). Con `GET`, los datos viajan en ellos o en Path Params.
- **No confundir con:** Path Params, que forman parte de la [ruta](#ruta-path--uri) (por ejemplo, el ID).
- **Relacionados:** [URL](#url-uniform-resource-locator), [GET](#get)
- **Sección:** Anatomía de una URL / URI

## REST y diseño de endpoints

### REST

- **Definición:** **REpresentational State Transfer**, un estilo de arquitectura para diseñar servicios web centrados en recursos.
- **Detalles clave:** funciona sobre HTTP/HTTPS. Usa JSON como formato estándar de intercambio.
- **No confundir con:** [HTTP](#http--https), que es el protocolo, no un estilo de arquitectura.
- **Relacionados:** [Endpoint](#endpoint), [JSON](#json)
- **Sección:** 2. Servicios REST y Diseño de Endpoints

### Endpoint

- **Definición:** una `URL` concreta que expone el servidor y a la que el cliente envía peticiones para interactuar con un recurso.
- **Detalles clave:** buenas prácticas: sustantivos en plural, nunca verbos; anidar recursos para expresar jerarquía; usar Query Parameters para filtrar y paginar.
- **No confundir con:** [Método HTTP](#método-http). El endpoint identifica el recurso y el método define la acción.
- **Relacionados:** [Sustantivos en plural](#sustantivos-en-plural-nunca-verbos), [Anidamiento de recursos](#anidamiento-de-recursos)
- **Sección:** 2. Servicios REST y Diseño de Endpoints

### Sustantivos en plural, nunca verbos

- **Definición:** la buena práctica de nombrar los endpoints con sustantivos en plural, porque la acción la determina el método HTTP y no la URL.
- **Detalles clave:** correcto: `GET /books`. Incorrecto: `GET /getBooks` o `POST /createBook`.
- **No confundir con:** —
- **Relacionados:** [Endpoint](#endpoint), [Método HTTP](#método-http)
- **Sección:** Buenas prácticas en el diseño de Endpoints

### Anidamiento de recursos

- **Definición:** la buena práctica de anidar recursos en la ruta para expresar relaciones jerárquicas.
- **Detalles clave:** `GET /books/12/authors` obtiene los autores del libro con ID 12.
- **No confundir con:** filtrado con [Query Parameters](#parámetros-de-consulta-query-parameters).
- **Relacionados:** [Ruta (Path / URI)](#ruta-path--uri), [Endpoint](#endpoint)
- **Sección:** Buenas prácticas en el diseño de Endpoints

## Métodos HTTP

### Método HTTP

- **Definición:** el verbo de cada petición HTTP, que define la intención de la operación.
- **Detalles clave:** los cinco métodos del tema son `GET` (lectura), `POST` (creación), `PUT` (reemplazo), `PATCH` (modificación parcial) y `DELETE` (eliminación).
- **No confundir con:** [Código de estado HTTP](#código-de-estado-http), que va en la respuesta.
- **Relacionados:** [GET](#get), [POST](#post), [PUT](#put), [PATCH](#patch), [DELETE](#delete)
- **Sección:** 3. Métodos HTTP y transmisión de datos

### GET

- **Definición:** el método de lectura. Consulta uno o varios recursos.
- **Detalles clave:** los datos viajan en la URL (Query / Path Params). No debe incluir cuerpo (body). Su código de éxito habitual es `200 OK`.
- **No confundir con:** [POST](#post), que crea recursos y envía los datos en el cuerpo.
- **Relacionados:** [Query Parameters](#parámetros-de-consulta-query-parameters), [200 OK](#200-ok)
- **Sección:** 3. Métodos HTTP y transmisión de datos

### POST

- **Definición:** el método de creación. Crea un nuevo recurso.
- **Detalles clave:** los datos viajan en el cuerpo (Request Body). El servidor asigna el ID. Se responde con `201 Created`.
- **No confundir con:** [PUT](#put), que reemplaza un recurso existente.
- **Relacionados:** [Request Body](#cuerpo-de-la-petición-request-body), [201 Created](#201-created)
- **Sección:** 3. Métodos HTTP y transmisión de datos

### PUT

- **Definición:** el método de reemplazo. Reemplaza por completo un recurso existente.
- **Detalles clave:** los datos viajan en el cuerpo (Request Body). Su código de éxito habitual es `200 OK`.
- **No confundir con:** [PATCH](#patch), que solo actualiza los campos indicados.
- **Relacionados:** [PATCH](#patch), [POST](#post)
- **Sección:** 3. Métodos HTTP y transmisión de datos

### PATCH

- **Definición:** el método de modificación parcial. Actualiza solo los campos indicados del recurso.
- **Detalles clave:** los datos viajan en el cuerpo (Request Body). Su código de éxito habitual es `200 OK`.
- **No confundir con:** [PUT](#put), que reemplaza el recurso completo.
- **Relacionados:** [PUT](#put)
- **Sección:** 3. Métodos HTTP y transmisión de datos

### DELETE

- **Definición:** el método de eliminación. Elimina el recurso indicado.
- **Detalles clave:** los datos viajan en la URL (Path Param). Lo más común es responder con `204 No Content`.
- **No confundir con:** —
- **Relacionados:** [204 No Content](#204-no-content)
- **Sección:** 3. Métodos HTTP y transmisión de datos

### Cuerpo de la petición (Request Body)

- **Definición:** la parte de la petición en la que viajan los datos en `POST`, `PUT` y `PATCH`.
- **Detalles clave:** `GET` no debe incluir cuerpo. En `GET` y `DELETE`, los datos viajan en la URL.
- **No confundir con:** [Query Parameters](#parámetros-de-consulta-query-parameters) y Path Params, que van en la URL.
- **Relacionados:** [POST](#post), [PUT](#put), [PATCH](#patch), [JSON](#json)
- **Sección:** 3. Métodos HTTP y transmisión de datos

## Formato de intercambio

### JSON

- **Definición:** **JavaScript Object Notation**, el formato estándar para enviar y recibir información en las APIs REST.
- **Detalles clave:** es el estándar porque es ligero y fácil de leer para personas y máquinas. Un objeto JSON (`{ }`) se corresponde con un DTO, y una colección JSON (`[ ]`) con un `List`.
- **No confundir con:** [DTO](#dto-java-record). JSON es el texto que viaja; el DTO es la clase Java en la que se convierte.
- **Relacionados:** [Parser](#parser), [Objeto JSON y colección JSON](#objeto-json-y-colección-json)
- **Sección:** 4. Formato de Intercambio: JSON

### Parser

- **Definición:** la librería del servidor que convierte automáticamente el texto JSON en clases Java Record (DTOs) y al revés.
- **Detalles clave:** actúa cuando el controlador recibe o envía datos.
- **No confundir con:** —
- **Relacionados:** [JSON](#json), [DTO](#dto-java-record)
- **Sección:** 4. Formato de Intercambio: JSON

### DTO (Java Record)

- **Definición:** la clase Java Record que corresponde a un objeto JSON y en la que el parser convierte los datos recibidos (o desde la que genera los datos enviados).
- **Detalles clave:** si falla la validación de un DTO, la respuesta es `400 Bad Request`.
- **No confundir con:** [JSON](#json), que es la representación en texto.
- **Relacionados:** [Parser](#parser), [400 Bad Request](#400-bad-request)
- **Sección:** 4. Formato de Intercambio: JSON

### Objeto JSON y colección JSON

- **Definición:** el objeto JSON es un conjunto de pares clave-valor entre llaves que se corresponde con un DTO. La colección JSON es un array de objetos entre corchetes que se corresponde con un `List`.
- **Detalles clave:** en el ejemplo, cada libro tiene los campos `isbn`, `title` y `basePrice`.
- **No confundir con:** —
- **Relacionados:** [JSON](#json), [DTO](#dto-java-record)
- **Sección:** Objeto JSON simple (Mapea con un DTO); Colección JSON (Mapea con un List)

## Códigos de estado

### Código de estado HTTP

- **Definición:** el código numérico que el servidor debe incluir siempre en la respuesta para indicar el resultado de la operación.
- **Detalles clave:** las familias son `2xx` (éxito), `3xx` (redirección), `4xx` (errores del cliente) y `5xx` (errores del servidor).
- **No confundir con:** [Método HTTP](#método-http), que va en la petición.
- **Relacionados:** [200 OK](#200-ok), [404 Not Found](#404-not-found), [500 Internal Server Error](#500-internal-server-error)
- **Sección:** 5. Códigos de Estado HTTP

### 200 OK

- **Definición:** código `2xx` que indica que la petición se ha atendido correctamente.
- **Detalles clave:** se usa habitualmente en `GET`, `PUT` y `PATCH`.
- **No confundir con:** [201 Created](#201-created), que se usa en `POST`, y [204 No Content](#204-no-content), que es una respuesta sin cuerpo.
- **Relacionados:** [Código de estado HTTP](#código-de-estado-http)
- **Sección:** 5. Códigos de Estado HTTP

### 201 Created

- **Definición:** código `2xx` que indica que el recurso se ha creado con éxito.
- **Detalles clave:** se usa en `POST`.
- **No confundir con:** [200 OK](#200-ok)
- **Relacionados:** [POST](#post)
- **Sección:** 5. Códigos de Estado HTTP

### 204 No Content

- **Definición:** código `2xx` que indica que la petición es correcta, pero la respuesta no devuelve cuerpo.
- **Detalles clave:** es común en `DELETE`.
- **No confundir con:** [200 OK](#200-ok) (petición atendida correctamente, habitual en `GET`, `PUT` y `PATCH`).
- **Relacionados:** [DELETE](#delete)
- **Sección:** 5. Códigos de Estado HTTP

### 3xx Redirección

- **Definición:** familia de códigos que indica que el cliente debe hacer una acción adicional para completar la petición.
- **Detalles clave:** ejemplo: `301 Moved Permanently`.
- **No confundir con:** —
- **Relacionados:** [Código de estado HTTP](#código-de-estado-http)
- **Sección:** 5. Códigos de Estado HTTP

### 400 Bad Request

- **Definición:** código `4xx` que indica que los datos de la petición son incorrectos sintáctica o semánticamente.
- **Detalles clave:** ejemplo: ha fallado la validación de un DTO.
- **No confundir con:** [500 Internal Server Error](#500-internal-server-error). El 400 es un error del cliente; el 500, un fallo del servidor.
- **Relacionados:** [DTO](#dto-java-record)
- **Sección:** 5. Códigos de Estado HTTP

### 401 Unauthorized

- **Definición:** código `4xx` que indica que el cliente debe autenticarse.
- **Detalles clave:** se refiere a la falta de autenticación.
- **No confundir con:** [403 Forbidden](#403-forbidden), en el que el cliente no tiene permisos.
- **Relacionados:** [403 Forbidden](#403-forbidden)
- **Sección:** 5. Códigos de Estado HTTP

### 403 Forbidden

- **Definición:** código `4xx` que indica que el cliente no tiene permisos para acceder al recurso.
- **Detalles clave:** se refiere a la falta de permisos.
- **No confundir con:** [401 Unauthorized](#401-unauthorized), en el que el cliente debe autenticarse.
- **Relacionados:** [401 Unauthorized](#401-unauthorized)
- **Sección:** 5. Códigos de Estado HTTP

### 404 Not Found

- **Definición:** código `4xx` que indica que la URL o el recurso solicitado no existe.
- **Detalles clave:** es un error del cliente.
- **No confundir con:** [403 Forbidden](#403-forbidden), en el que el cliente no tiene permisos para acceder al recurso.
- **Relacionados:** [Código de estado HTTP](#código-de-estado-http)
- **Sección:** 5. Códigos de Estado HTTP

### 500 Internal Server Error

- **Definición:** código `5xx` que indica que se ha producido una excepción o un fallo no controlado dentro del código del servidor.
- **Detalles clave:** es el único código `5xx` que cita la fuente.
- **No confundir con:** [400 Bad Request](#400-bad-request), que es un error del cliente.
- **Relacionados:** [Código de estado HTTP](#código-de-estado-http)
- **Sección:** 5. Códigos de Estado HTTP

## Comparativas

### Métodos HTTP

| Aspecto | GET | POST | PUT | PATCH | DELETE |
|---|---|---|---|---|---|
| Acción | Lectura | Creación | Reemplazo | Modificación parcial | Eliminación |
| Dónde viajan los datos | URL (Query / Path Params) | Cuerpo | Cuerpo | Cuerpo | URL (Path Param) |
| Particularidad | No debe incluir cuerpo | El servidor asigna el ID | Reemplaza el recurso completo | Solo los campos indicados | Elimina el recurso indicado |
| Código de éxito habitual | 200 OK | 201 Created | 200 OK | 200 OK | 204 No Content |

### PUT frente a PATCH

| Aspecto | PUT | PATCH |
|---|---|---|
| Alcance | Reemplaza el recurso existente por completo | Actualiza solo los campos indicados |
| Datos | Cuerpo (Request Body) | Cuerpo (Request Body) |

### 401 frente a 403

| Aspecto | 401 Unauthorized | 403 Forbidden |
|---|---|---|
| Significado | El cliente debe autenticarse | El cliente no tiene permisos para acceder al recurso |

### Errores del cliente (4xx) frente a errores del servidor (5xx)

| Aspecto | 4xx | 5xx |
|---|---|---|
| Origen | El cliente (petición incorrecta, sin autenticación, sin permisos, recurso inexistente) | El código del servidor (excepción o fallo no controlado) |
| Ejemplos | 400, 401, 403, 404 | 500 |

### Ruta frente a Query Parameters

| Aspecto | Ruta (Path / URI) | Query Parameters |
|---|---|---|
| Función | Identifica el recurso concreto | Aporta información adicional (filtrado, paginación) |
| Posición | Después del host | Después de `?` |
| Ejemplo | `/api/v1/books`, `/books/12/authors` | `?page=2&limit=10`, `?category=fiction&page=1` |

### Objeto JSON frente a colección JSON

| Aspecto | Objeto JSON | Colección JSON |
|---|---|---|
| Delimitadores | `{ }` | `[ ]` |
| Se corresponde con | Un DTO | Un `List` |

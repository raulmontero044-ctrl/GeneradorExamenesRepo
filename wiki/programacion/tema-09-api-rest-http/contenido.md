# 09. APIs REST y Protocolo HTTP

En la arquitectura por capas, la capa de presentación (`Controller`) necesita un mecanismo para comunicarse con el exterior. En aplicaciones web y sistemas distribuidos, ese intercambio se hace mediante **APIs REST** sobre el protocolo `HTTP` (o `HTTPS` cuando la comunicación va cifrada).

## 1. El protocolo HTTP

La comunicación web sigue el **modelo cliente-servidor**:

- El **cliente** hace una **Petición** (`Request`).
- El **servidor** procesa esa petición y devuelve una **Respuesta** (`Response`).

### Anatomía de una URL / URI

Para localizar un recurso en la red, el cliente utiliza una `URL` (**Uniform Resource Locator**). Una URL tiene estas partes:

| Parte | Qué identifica o contiene | Ejemplo |
|---|---|---|
| **Protocolo** | El protocolo de comunicación | `http://` o `https://` |
| **Dominio / Host** | El servidor | `api.miservidor.com` o `localhost:8080` |
| **Ruta (Path / URI)** | El recurso concreto dentro del servidor | `/api/v1/books` |
| **Parámetros de consulta (Query Parameters)** | Información adicional, escrita después del símbolo `?` | `/books?page=2&limit=10` |

## 2. Servicios REST y Diseño de Endpoints

- **REST** (**REpresentational State Transfer**) es un estilo de arquitectura para diseñar servicios web centrados en **recursos**.
- Un **Endpoint** es una `URL` concreta que expone el servidor. El cliente le envía peticiones para interactuar con un recurso.

### Buenas prácticas en el diseño de Endpoints

1. **Usar sustantivos en plural, nunca verbos.** La acción la determina el método `HTTP`, no la `URL`.
   - Correcto: `GET /books`
   - Incorrecto: `GET /getBooks` o `POST /createBook`
2. **Anidar recursos para expresar relaciones jerárquicas.**
   - `GET /books/12/authors` obtiene los autores del libro con ID 12.
3. **Filtrar y paginar mediante Query Parameters.**
   - `GET /books?category=fiction&page=1`

## 3. Métodos HTTP y transmisión de datos

Cada petición `HTTP` utiliza un verbo o **método** que define la intención de la operación:

| Método | Acción | ¿Dónde viajan los datos? | Descripción |
|---|---|---|---|
| `GET` | Lectura | URL (Query / Path Params) | Consulta uno o varios recursos. No debe incluir cuerpo (body). |
| `POST` | Creación | Cuerpo (Request Body) | Crea un nuevo recurso. El servidor asigna el ID. |
| `PUT` | Reemplazo | Cuerpo (Request Body) | Reemplaza por completo un recurso existente. |
| `PATCH` | Modificación parcial | Cuerpo (Request Body) | Actualiza solo los campos indicados del recurso. |
| `DELETE` | Eliminación | URL (Path Param) | Elimina el recurso indicado. |

##### Matices que conviene retener

- `GET` y `DELETE` llevan los datos en la URL: `GET` mediante Query o Path Params, y `DELETE` mediante un Path Param. `POST`, `PUT` y `PATCH` los llevan en el cuerpo de la petición.
- `GET` **no debe** incluir cuerpo.
- En `POST` el cliente no indica el ID: **lo asigna el servidor**.
- `PUT` reemplaza el recurso **por completo**. `PATCH` modifica **solo** los campos indicados.

## 4. Formato de Intercambio: JSON

`JSON` (**JavaScript Object Notation**) es el formato estándar para enviar y recibir información en las APIs REST. Se usa porque es ligero y fácil de leer tanto para personas como para máquinas.

Cuando el controlador recibe o envía datos, la librería del servidor (el **parser**) convierte automáticamente el texto JSON en clases Java Record (**DTOs**) y al revés.

### Objeto JSON simple (Mapea con un DTO)

Un objeto JSON va entre llaves `{ }` y contiene pares clave-valor. En el ejemplo, el objeto describe un libro con tres campos: `"isbn"` (cadena `"978-84-376-0494-7"`), `"title"` (`"Don Quijote"`) y `"basePrice"` (número `18.50`). Un objeto así se corresponde con **un DTO**.

```json
{ "isbn": "978-84-376-0494-7", "title": "Don Quijote", "basePrice": 18.50 }
```

### Colección JSON (Mapea con un List)

Una colección JSON es un array entre corchetes `[ ]` que contiene varios objetos con la misma estructura. En el ejemplo hay dos libros: «Don Quijote» (`18.50`) y «Cien años de soledad» (ISBN `978-84-204-1214-6`, `21.00`). Una colección así se corresponde con **un `List`** de DTOs.

## 5. Códigos de Estado HTTP

El servidor debe incluir **siempre** en la respuesta un código de estado numérico que indique el resultado de la operación. Los códigos se agrupan por familias:

- **`2xx` – Éxito**
  - `200 OK`: la petición se ha atendido correctamente. Se usa habitualmente en `GET`, `PUT` y `PATCH`.
  - `201 Created`: el recurso se ha creado con éxito. Se usa en `POST`.
  - `204 No Content`: la petición es correcta, pero la respuesta no devuelve cuerpo. Es común en `DELETE`.
- **`3xx` – Redirección**: el cliente debe hacer una acción adicional para completar la petición. Ejemplo: `301 Moved Permanently`.
- **`4xx` – Errores del Cliente**
  - `400 Bad Request`: los datos de la petición son incorrectos sintáctica o semánticamente. Ejemplo: ha fallado la validación de un DTO.
  - `401 Unauthorized`: el cliente debe autenticarse.
  - `403 Forbidden`: el cliente no tiene permisos para acceder al recurso.
  - `404 Not Found`: la URL o el recurso solicitado no existe.
- **`5xx` – Errores del Servidor**
  - `500 Internal Server Error`: se ha producido una excepción o un fallo no controlado dentro del código del servidor.

##### Relación entre método y código de éxito habitual

| Método | Código de éxito habitual según la fuente |
|---|---|
| `GET` | `200 OK` |
| `POST` | `201 Created` |
| `PUT` | `200 OK` |
| `PATCH` | `200 OK` |
| `DELETE` | `204 No Content` |

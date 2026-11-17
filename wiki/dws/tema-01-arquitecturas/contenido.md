# 01 - Arquitecturas de software

Una aplicación puede clasificarse según distintos criterios. Por ejemplo, puede desplegarse como **monolito modular** y organizarse internamente por **capas** con **inversión de dependencias**. Es decir, la forma de desplegarla y la forma de organizar su código son criterios de clasificación independientes que se combinan.

## 1. Principios de arquitectura limpia

La **arquitectura limpia** protege las reglas del negocio de los detalles técnicos y externos. Sus principios son:

| Principio | Idea clave |
|---|---|
| **Independencia de frameworks** | El framework es una herramienta, no el centro de la aplicación |
| **Testeable** | Las reglas se prueban sin levantar interfaz, base de datos ni framework |
| **Independencia de la interfaz** | La misma lógica puede exponerse mediante interfaces distintas |
| **Independencia de la base de datos** | Se puede cambiar la persistencia sin reescribir las reglas |
| **Independencia de agentes externos** | El negocio no depende de servicios externos concretos |
| **Regla de dependencia** | El código depende hacia las políticas de negocio, no hacia los detalles |
| **Inversión de dependencias (DIP)** | El núcleo define las abstracciones que necesita; los detalles externos las implementan |

##### Diagrama: dependencias en una aplicación que aplica arquitectura limpia

El diagrama muestra tres paquetes y una base de datos:

- Paquete `controller`: la clase `Controller`.
- Paquete `domain`: la interfaz `Service`, la clase `ServiceImpl`, la clase `Model` y la interfaz `Repository`.
- Paquete `persistence`: la clase `RepositoryImpl`.
- Una «Base de datos» externa.

Relaciones (sentido de las flechas):

1. `Controller` → `Service` («invoca»): el controlador depende de la interfaz del servicio, no de su implementación.
2. `ServiceImpl` implementa `Service`.
3. `ServiceImpl` → `Model` («aplica reglas»).
4. `ServiceImpl` → `Repository` («utiliza»): el servicio usa la interfaz de repositorio definida en el propio dominio.
5. `RepositoryImpl` (en `persistence`) implementa `Repository` (en `domain`): la flecha va desde la persistencia hacia el dominio.
6. `RepositoryImpl` → Base de datos («accede»).

Todas las dependencias apuntan hacia `domain`: el dominio no depende ni del controlador ni de la persistencia.

> **Importante:** La **arquitectura limpia** es un concepto general: protege las reglas de negocio y dirige las dependencias hacia el núcleo. La **arquitectura hexagonal**, la **arquitectura de cebolla** y la arquitectura por capas con **inversión de dependencias** son enfoques distintos que aplican estas ideas.

## 2. Organización interna

Esta sección trata cómo se organiza internamente el código de una aplicación. Se presentan tres enfoques: arquitectura por capas, arquitectura hexagonal y arquitectura de cebolla.

### 2.1 Arquitectura por capas

La **arquitectura por capas** agrupa componentes por responsabilidad. En esta arquitectura de referencia:

| Capa | Componentes y responsabilidad |
|---|---|
| `controller` | **Controladores** y **DTO** de entrada y salida; comunica la aplicación con clientes externos |
| `domain` | Interfaces e implementaciones de **servicios**, **modelos** e interfaces de **repositorio**; contiene las reglas del negocio |
| `persistence` | Implementaciones de repositorio y **DAO**; accede a la base de datos |

##### Diagrama: arquitectura por capas de referencia

Es el mismo esquema del apartado anterior, ampliado con el DAO en la capa de persistencia:

- Paquete `controller`: `Controller`.
- Paquete `domain`: interfaz `Service`, clase `ServiceImpl`, clase `Model`, interfaz `Repository`.
- Paquete `persistence`: clase `RepositoryImpl`, interfaz `DAO`, clase `DAOImpl`.
- «Base de datos».

Relaciones:

1. `Controller` → `Service` («invoca»).
2. `ServiceImpl` implementa `Service`.
3. `ServiceImpl` → `Model` («aplica reglas»).
4. `ServiceImpl` → `Repository` («utiliza»).
5. `RepositoryImpl` implementa `Repository`.
6. `RepositoryImpl` → `DAO` («utiliza»).
7. `DAOImpl` implementa `DAO`.
8. `DAOImpl` → Base de datos («accede»).

`Service` y `Repository` son interfaces; `ServiceImpl` y `RepositoryImpl` las implementan. **DAO** también se separa en interfaz e implementación, ambas dentro de `persistence`.

> **Importante:** `domain` define la interfaz `Repository` que necesita; `persistence` la implementa. Esta **inversión de dependencias** evita que el dominio dependa de la tecnología de persistencia y aplica un principio de arquitectura limpia.

> **Consejo:** Las capas son una división lógica, no una estructura rígida. Se pueden añadir, dividir o reorganizar según las necesidades de la aplicación.

### 2.2 Arquitectura hexagonal (Ports and Adapters)

La **arquitectura hexagonal** separa el núcleo de los sistemas externos mediante:

- **Puertos**: interfaces que definen cómo se usa o qué necesita el núcleo.
- **Adaptadores**: componentes que conectan esas interfaces con tecnologías concretas.

##### Diagrama: puertos y adaptadores

Elementos:

- Paquete «Adaptadores de entrada»: `RestController`.
- Paquete «Núcleo de la aplicación»: interfaz `InputPort`, clase `BusinessService`, clase `Model`, interfaz `RepositoryPort`, interfaz `NotificationPort`.
- Paquete «Adaptador de persistencia»: `RepositoryAdapter`.
- Paquete «Adaptador de servicio externo»: `EmailAdapter`.
- Sistemas externos: «Base de datos» y «Servicio de correo».

Relaciones:

1. `RestController` → `InputPort` («invoca»): el adaptador de entrada usa el puerto de entrada (cómo se usa el núcleo).
2. `BusinessService` implementa `InputPort`.
3. `BusinessService` → `Model` («aplica reglas»).
4. `BusinessService` → `RepositoryPort` («utiliza») y `BusinessService` → `NotificationPort` («utiliza»): puertos de salida (qué necesita el núcleo).
5. `RepositoryAdapter` implementa `RepositoryPort` y accede a la base de datos.
6. `EmailAdapter` implementa `NotificationPort` y accede al servicio de correo.

El núcleo define todos los puertos; los adaptadores, fuera del núcleo, dependen de ellos.

### 2.3 Arquitectura de cebolla

La **arquitectura de cebolla** organiza el sistema en anillos alrededor del dominio. Las dependencias apuntan desde los anillos externos hacia el núcleo.

##### Diagrama: anillos de la cebolla

Paquetes anidados, de fuera hacia dentro:

- **Infraestructura (anillo exterior)**: contiene `RepositoryImpl`.
  - **Aplicación (anillo intermedio)**: contiene `Service`.
    - **Dominio (núcleo)**: contiene la interfaz `Repository` y la clase `Model`.

Relaciones:

1. `Service` → `Repository` («usa»).
2. `Service` → `Model` («aplica reglas»).
3. `RepositoryImpl` implementa `Repository` («implementa»): el anillo exterior depende del núcleo.

##### Comparativa de los enfoques de organización interna

| Enfoque | Idea principal | Observación |
|---|---|---|
| **Capas** | Agrupa por responsabilidad y delega entre capas | Evitar que el dominio dependa directamente de tecnologías |
| **Hexagonal** | Aísla el núcleo mediante puertos y adaptadores | Facilita sustituir tecnologías y probar el núcleo |
| **Cebolla** | Organiza el sistema en anillos alrededor del dominio | Las dependencias apuntan hacia el centro |

## 3. Arquitectura de despliegue

La **arquitectura de despliegue** describe cómo se empaqueta, ejecuta y despliega una aplicación; es un criterio distinto de su organización interna.

### 3.1 Monolito, monolito modular y microservicios

| Estilo | Despliegue | Límites y datos | Coste o ventaja |
|---|---|---|---|
| **Monolito** | Una aplicación desplegable | Los componentes pueden compartir proceso y almacenamiento | Operación sencilla; puede crecer con alto acoplamiento |
| **Monolito modular** | Una aplicación desplegable | Módulos con límites y APIs internas explícitas | Modularidad sin multiplicar despliegues |
| **Microservicios** | Varios servicios desplegables | Cada servicio controla sus datos y se comunica por red | Despliegue independiente; más complejidad operativa |

Un **monolito** no implica código desordenado y puede ser adecuado para una aplicación pequeña, como un CRUD. En un **monolito modular**, los módulos colaboran dentro del mismo proceso mediante sus **APIs públicas**.

##### Diagrama: los tres estilos de despliegue

- **Monolito: un despliegue**. Un único componente «Aplicación (módulos juntos)» que accede a una «Base de datos».
- **Monolito modular: un despliegue**. Dentro de «Aplicación» hay «Módulo A (API pública)» y «Módulo B (API pública)». Ambos acceden a una «Base de datos compartida (datos propiedad de cada módulo)», cada uno con la etiqueta «solo sus datos». El Módulo B llama al Módulo A mediante «API interna».
- **Microservicios: varios despliegues**. «Servicio A», «Servicio B» y «Servicio C», cada uno con su propia base de datos (BD A, BD B, BD C). El Servicio C se comunica con el Servicio B mediante «HTTP / mensaje».

Matiz del diagrama: en el monolito modular la base de datos puede ser compartida, pero cada módulo solo accede a los datos de los que es propietario; en microservicios cada servicio tiene su propia base de datos.

> **Importante:** No hay que confundir **cómo se organiza el código** (por **capas**, **hexagonal** o **cebolla**) con **cómo se despliega** (**monolito**, **monolito modular** o **microservicios**). Un monolito puede aplicar principios de **arquitectura limpia**.

> **Advertencia:** Los **microservicios** no son simplemente módulos separados en carpetas o proyectos: cada servicio debe poder desplegarse y evolucionar de forma autónoma, y la comunicación pasa por la red.

### 3.2 Tipos de comunicación

| Tipo | Funcionamiento | Característica |
|---|---|---|
| **Síncrona** | El emisor hace una llamada y espera una respuesta | Depende de la disponibilidad y el tiempo de respuesta del receptor |
| **Asíncrona** | El emisor publica un mensaje o evento para que se procese después | Desacopla temporalmente; puede haber retrasos o entregas duplicadas |

Los módulos de una aplicación pueden comunicarse mediante llamadas a **APIs internas** o eventos. Los microservicios se comunican por red, mediante **HTTP** o un **intermediario de mensajes** como **RabbitMQ** o **Kafka**.

Los eventos entre módulos no implican comunicación de red ni crean por sí solos aislamiento o una transacción independiente. La comunicación distribuida debe contemplar fallos de red.

##### Diagrama de secuencia: tres formas de comunicación

Participantes: Cliente (actor), Servicio A, Servicio B, Broker de mensajes (cola) y Consumidor.

1. **Comunicación síncrona entre módulos (mismo proceso)**:
   1. Servicio A → Servicio B: «API pública (llamada directa)».
   2. Servicio B → Servicio A: «resultado» (respuesta).
2. **Comunicación síncrona entre microservicios (HTTP)**:
   1. Cliente → Servicio A: «solicitud».
   2. Servicio A → Servicio B: «petición HTTP».
   3. Servicio B → Servicio A: «respuesta».
   4. Servicio A → Cliente: «resultado».
3. **Comunicación asíncrona mediante eventos**:
   1. Servicio A → Broker: «publicar evento».
   2. Broker → Consumidor: «entregar evento».
   3. Consumidor → Broker: «confirmar procesamiento».

En el caso asíncrono, el Servicio A no espera respuesta del consumidor: solo publica en el broker.

> **Consejo:** La **mensajería** desacopla al emisor del momento en que se procesa el evento, pero no garantiza que cada mensaje se procese exactamente una vez. Los consumidores deben tolerar entregas duplicadas.

> **Consejo:** Durante el curso se estudiarán las capas y sus componentes en temas separados. Como referencia, se seguirá una **arquitectura por capas** desplegada como **monolito modular**.

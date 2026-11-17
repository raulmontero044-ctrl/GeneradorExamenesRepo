# Conceptos — 01 - Arquitecturas de software

## Principios generales

### Arquitectura limpia

- **Definición:** Concepto general de arquitectura que protege las reglas del negocio de los detalles técnicos y externos y dirige las dependencias hacia el núcleo.
- **Detalles clave:** Sus principios son independencia de frameworks, testeable, independencia de la interfaz, independencia de la base de datos, independencia de agentes externos, regla de dependencia e inversión de dependencias (DIP). La arquitectura hexagonal, la de cebolla y la arquitectura por capas con inversión de dependencias son enfoques distintos que aplican estas ideas. Un monolito puede aplicar principios de arquitectura limpia.
- **No confundir con:** Arquitectura hexagonal, de cebolla o por capas: son enfoques concretos que aplican sus ideas, no la arquitectura limpia en sí.
- **Relacionados:** [Regla de dependencia](#regla-de-dependencia), [Inversión de dependencias (DIP)](#inversión-de-dependencias-dip), [Arquitectura hexagonal](#arquitectura-hexagonal-ports-and-adapters), [Arquitectura de cebolla](#arquitectura-de-cebolla), [Arquitectura por capas](#arquitectura-por-capas)
- **Sección:** 1. Principios de arquitectura limpia

### Independencia de frameworks

- **Definición:** Principio de arquitectura limpia según el cual el framework es una herramienta, no el centro de la aplicación.
- **Detalles clave:** Las reglas de negocio no deben girar en torno al framework.
- **No confundir con:** Independencia de agentes externos (servicios externos concretos, no frameworks).
- **Relacionados:** [Arquitectura limpia](#arquitectura-limpia)
- **Sección:** 1. Principios de arquitectura limpia

### Testeable

- **Definición:** Principio de arquitectura limpia según el cual las reglas se prueban sin levantar interfaz, base de datos ni framework.
- **Detalles clave:** La arquitectura hexagonal facilita probar el núcleo.
- **No confundir con:** —
- **Relacionados:** [Arquitectura limpia](#arquitectura-limpia), [Arquitectura hexagonal](#arquitectura-hexagonal-ports-and-adapters)
- **Sección:** 1. Principios de arquitectura limpia

### Independencia de la interfaz

- **Definición:** Principio de arquitectura limpia según el cual la misma lógica puede exponerse mediante interfaces distintas.
- **Detalles clave:** La lógica de negocio no está ligada a una interfaz concreta.
- **No confundir con:** Independencia de la base de datos (afecta a la persistencia, no a la exposición).
- **Relacionados:** [Arquitectura limpia](#arquitectura-limpia)
- **Sección:** 1. Principios de arquitectura limpia

### Independencia de la base de datos

- **Definición:** Principio de arquitectura limpia según el cual se puede cambiar la persistencia sin reescribir las reglas.
- **Detalles clave:** Se consigue, por ejemplo, haciendo que el dominio defina la interfaz `Repository` y la persistencia la implemente.
- **No confundir con:** Independencia de la interfaz.
- **Relacionados:** [Inversión de dependencias (DIP)](#inversión-de-dependencias-dip), [Repositorio](#repositorio)
- **Sección:** 1. Principios de arquitectura limpia

### Independencia de agentes externos

- **Definición:** Principio de arquitectura limpia según el cual el negocio no depende de servicios externos concretos.
- **Detalles clave:** En la arquitectura hexagonal se refleja con puertos de salida como `NotificationPort`, implementados por adaptadores como `EmailAdapter`.
- **No confundir con:** Independencia de frameworks.
- **Relacionados:** [Puerto](#puerto), [Adaptador](#adaptador)
- **Sección:** 1. Principios de arquitectura limpia

### Regla de dependencia

- **Definición:** El código depende hacia las políticas de negocio, no hacia los detalles.
- **Detalles clave:** En todos los diagramas del tema las flechas de dependencia apuntan hacia el dominio o núcleo; en la arquitectura de cebolla, desde los anillos externos hacia el centro.
- **No confundir con:** Inversión de dependencias: la regla dice hacia dónde deben apuntar las dependencias; la DIP es el mecanismo (el núcleo define las abstracciones y los detalles las implementan).
- **Relacionados:** [Inversión de dependencias (DIP)](#inversión-de-dependencias-dip), [Arquitectura de cebolla](#arquitectura-de-cebolla)
- **Sección:** 1. Principios de arquitectura limpia

### Inversión de dependencias (DIP)

- **Definición:** Principio según el cual el núcleo define las abstracciones que necesita y los detalles externos las implementan.
- **Detalles clave:** En la arquitectura por capas de referencia, `domain` define la interfaz `Repository` y `persistence` la implementa (`RepositoryImpl`). Así el dominio no depende de la tecnología de persistencia. Es un principio de arquitectura limpia.
- **No confundir con:** Regla de dependencia.
- **Relacionados:** [Regla de dependencia](#regla-de-dependencia), [Repositorio](#repositorio), [Arquitectura por capas](#arquitectura-por-capas)
- **Sección:** 2.1 Arquitectura por capas

## Organización interna

### Arquitectura por capas

- **Definición:** Arquitectura que agrupa componentes por responsabilidad y delega entre capas.
- **Detalles clave:** Capas de referencia: `controller` (controladores y DTO de entrada y salida; comunica con clientes externos), `domain` (interfaces e implementaciones de servicios, modelos e interfaces de repositorio; reglas de negocio) y `persistence` (implementaciones de repositorio y DAO; acceso a la base de datos). Las capas son una división lógica, no una estructura rígida: se pueden añadir, dividir o reorganizar. Hay que evitar que el dominio dependa directamente de tecnologías. Es la arquitectura de referencia del curso, desplegada como monolito modular.
- **No confundir con:** Monolito modular (criterio de despliegue, no de organización interna).
- **Relacionados:** [Inversión de dependencias (DIP)](#inversión-de-dependencias-dip), [DTO](#dto), [DAO](#dao), [Repositorio](#repositorio), [Servicio](#servicio)
- **Sección:** 2.1 Arquitectura por capas

### Controlador

- **Definición:** Componente de la capa `controller` que comunica la aplicación con clientes externos.
- **Detalles clave:** `Controller` invoca la interfaz `Service`, no su implementación.
- **No confundir con:** Servicio (contiene las reglas de negocio).
- **Relacionados:** [DTO](#dto), [Servicio](#servicio)
- **Sección:** 2.1 Arquitectura por capas

### DTO

- **Definición:** Objeto de entrada y salida situado en la capa `controller`, junto a los controladores.
- **Detalles clave:** La fuente solo indica que hay DTO de entrada y de salida en la capa `controller`.
- **No confundir con:** Modelo (en `domain`).
- **Relacionados:** [Controlador](#controlador), [Modelo](#modelo)
- **Sección:** 2.1 Arquitectura por capas

### Servicio

- **Definición:** Componente de la capa `domain` que contiene las reglas del negocio; se separa en interfaz (`Service`) e implementación (`ServiceImpl`).
- **Detalles clave:** `ServiceImpl` implementa `Service`, aplica reglas sobre `Model` y utiliza la interfaz `Repository`.
- **No confundir con:** Repositorio.
- **Relacionados:** [Modelo](#modelo), [Repositorio](#repositorio), [Controlador](#controlador)
- **Sección:** 2.1 Arquitectura por capas

### Modelo

- **Definición:** Elemento de la capa `domain` (o del núcleo) sobre el que el servicio aplica las reglas de negocio.
- **Detalles clave:** Aparece como `Model` en el dominio en las tres organizaciones internas (capas, hexagonal y cebolla).
- **No confundir con:** DTO.
- **Relacionados:** [Servicio](#servicio), [DTO](#dto)
- **Sección:** 2.1 Arquitectura por capas

### Repositorio

- **Definición:** Abstracción de acceso a datos cuya interfaz (`Repository`) se define en `domain` y cuya implementación (`RepositoryImpl`) está en `persistence`.
- **Detalles clave:** Es el ejemplo de inversión de dependencias del tema. `RepositoryImpl` utiliza el DAO. En la cebolla, la interfaz `Repository` está en el dominio (núcleo) y `RepositoryImpl` en la infraestructura.
- **No confundir con:** DAO: la interfaz del repositorio está en el dominio; el DAO (interfaz e implementación) está entero en `persistence`.
- **Relacionados:** [DAO](#dao), [Inversión de dependencias (DIP)](#inversión-de-dependencias-dip)
- **Sección:** 2.1 Arquitectura por capas

### DAO

- **Definición:** Componente de la capa `persistence` que accede a la base de datos; se separa en interfaz (`DAO`) e implementación (`DAOImpl`), ambas dentro de `persistence`.
- **Detalles clave:** `RepositoryImpl` utiliza `DAO`; `DAOImpl` implementa `DAO` y accede a la base de datos.
- **No confundir con:** Repositorio.
- **Relacionados:** [Repositorio](#repositorio), [Arquitectura por capas](#arquitectura-por-capas)
- **Sección:** 2.1 Arquitectura por capas

### Arquitectura hexagonal (Ports and Adapters)

- **Definición:** Arquitectura que separa el núcleo de los sistemas externos mediante puertos y adaptadores.
- **Detalles clave:** Aísla el núcleo; facilita sustituir tecnologías y probar el núcleo. Ejemplo: `RestController` (adaptador de entrada) invoca `InputPort`, implementado por `BusinessService`; este usa `RepositoryPort` y `NotificationPort`, implementados por `RepositoryAdapter` (base de datos) y `EmailAdapter` (servicio de correo).
- **No confundir con:** Arquitectura limpia (concepto general que la hexagonal aplica).
- **Relacionados:** [Puerto](#puerto), [Adaptador](#adaptador), [Arquitectura limpia](#arquitectura-limpia)
- **Sección:** 2.2 Arquitectura hexagonal (Ports and Adapters)

### Puerto

- **Definición:** Interfaz que define cómo se usa o qué necesita el núcleo.
- **Detalles clave:** Ejemplos: `InputPort` (cómo se usa el núcleo), `RepositoryPort` y `NotificationPort` (qué necesita). Todos están en el núcleo de la aplicación.
- **No confundir con:** Adaptador.
- **Relacionados:** [Adaptador](#adaptador), [Arquitectura hexagonal](#arquitectura-hexagonal-ports-and-adapters)
- **Sección:** 2.2 Arquitectura hexagonal (Ports and Adapters)

### Adaptador

- **Definición:** Componente que conecta los puertos con tecnologías concretas.
- **Detalles clave:** Hay adaptadores de entrada (`RestController`, que invoca un puerto), de persistencia (`RepositoryAdapter`) y de servicio externo (`EmailAdapter`), estos dos últimos implementan puertos.
- **No confundir con:** Puerto (la interfaz; el adaptador es la conexión con la tecnología).
- **Relacionados:** [Puerto](#puerto), [Arquitectura hexagonal](#arquitectura-hexagonal-ports-and-adapters)
- **Sección:** 2.2 Arquitectura hexagonal (Ports and Adapters)

### Arquitectura de cebolla

- **Definición:** Arquitectura que organiza el sistema en anillos alrededor del dominio, con las dependencias apuntando desde los anillos externos hacia el núcleo.
- **Detalles clave:** Anillos: Infraestructura (exterior, `RepositoryImpl`), Aplicación (intermedio, `Service`) y Dominio (núcleo, interfaz `Repository` y `Model`). `RepositoryImpl` implementa `Repository`.
- **No confundir con:** Arquitectura por capas (agrupa por responsabilidad y delega entre capas).
- **Relacionados:** [Regla de dependencia](#regla-de-dependencia), [Arquitectura limpia](#arquitectura-limpia)
- **Sección:** 2.3 Arquitectura de cebolla

## Despliegue

### Arquitectura de despliegue

- **Definición:** Describe cómo se empaqueta, ejecuta y despliega una aplicación.
- **Detalles clave:** Es un criterio distinto de la organización interna. Estilos: monolito, monolito modular y microservicios.
- **No confundir con:** Organización interna del código (capas, hexagonal, cebolla).
- **Relacionados:** [Monolito](#monolito), [Monolito modular](#monolito-modular), [Microservicios](#microservicios)
- **Sección:** 3. Arquitectura de despliegue

### Monolito

- **Definición:** Estilo de despliegue con una única aplicación desplegable cuyos componentes pueden compartir proceso y almacenamiento.
- **Detalles clave:** Operación sencilla; puede crecer con alto acoplamiento. No implica código desordenado y puede ser adecuado para una aplicación pequeña, como un CRUD. Puede aplicar principios de arquitectura limpia.
- **No confundir con:** Código desordenado; monolito modular.
- **Relacionados:** [Monolito modular](#monolito-modular), [Arquitectura de despliegue](#arquitectura-de-despliegue)
- **Sección:** 3.1 Monolito, monolito modular y microservicios

### Monolito modular

- **Definición:** Estilo de despliegue con una única aplicación desplegable organizada en módulos con límites y APIs internas explícitas.
- **Detalles clave:** Modularidad sin multiplicar despliegues. Los módulos colaboran dentro del mismo proceso mediante sus APIs públicas. Puede usar una base de datos compartida en la que cada módulo solo accede a sus propios datos. Los módulos se comunican mediante APIs internas o eventos. Es el estilo de despliegue de referencia del curso.
- **No confundir con:** Microservicios: separar módulos en carpetas o proyectos no los convierte en microservicios.
- **Relacionados:** [Microservicios](#microservicios), [API pública / API interna](#api-pública--api-interna), [Arquitectura por capas](#arquitectura-por-capas)
- **Sección:** 3.1 Monolito, monolito modular y microservicios

### Microservicios

- **Definición:** Estilo de despliegue con varios servicios desplegables, en el que cada servicio controla sus datos y se comunica por red.
- **Detalles clave:** Despliegue independiente; más complejidad operativa. Cada servicio debe poder desplegarse y evolucionar de forma autónoma. Se comunican por red mediante HTTP o un intermediario de mensajes (RabbitMQ, Kafka). En el diagrama, cada servicio tiene su propia base de datos.
- **No confundir con:** Módulos separados en carpetas o proyectos.
- **Relacionados:** [Monolito modular](#monolito-modular), [Intermediario de mensajes](#intermediario-de-mensajes)
- **Sección:** 3.1 Monolito, monolito modular y microservicios

### API pública / API interna

- **Definición:** Interfaz explícita mediante la que un módulo de un monolito modular colabora con otros dentro del mismo proceso.
- **Detalles clave:** En el diagrama, el Módulo B llama al Módulo A mediante «API interna»; en la secuencia, la llamada entre módulos es una «API pública (llamada directa)» síncrona.
- **No confundir con:** Comunicación HTTP entre microservicios (por red).
- **Relacionados:** [Monolito modular](#monolito-modular), [Comunicación síncrona](#comunicación-síncrona)
- **Sección:** 3.1 Monolito, monolito modular y microservicios

## Comunicación

### Comunicación síncrona

- **Definición:** El emisor hace una llamada y espera una respuesta.
- **Detalles clave:** Depende de la disponibilidad y el tiempo de respuesta del receptor. Ejemplos: llamada directa a la API pública entre módulos (mismo proceso) y petición HTTP entre microservicios.
- **No confundir con:** Comunicación asíncrona.
- **Relacionados:** [Comunicación asíncrona](#comunicación-asíncrona), [API pública / API interna](#api-pública--api-interna)
- **Sección:** 3.2 Tipos de comunicación

### Comunicación asíncrona

- **Definición:** El emisor publica un mensaje o evento para que se procese después.
- **Detalles clave:** Desacopla temporalmente; puede haber retrasos o entregas duplicadas. Flujo: el emisor publica el evento en el broker, el broker lo entrega al consumidor y este confirma el procesamiento.
- **No confundir con:** Comunicación síncrona.
- **Relacionados:** [Evento](#evento), [Intermediario de mensajes](#intermediario-de-mensajes)
- **Sección:** 3.2 Tipos de comunicación

### Evento

- **Definición:** Mensaje que un emisor publica para que se procese después; los módulos de una aplicación pueden comunicarse mediante eventos.
- **Detalles clave:** Los eventos entre módulos no implican comunicación de red ni crean por sí solos aislamiento o una transacción independiente.
- **No confundir con:** Mensaje entre microservicios por red.
- **Relacionados:** [Comunicación asíncrona](#comunicación-asíncrona), [Mensajería](#mensajería)
- **Sección:** 3.2 Tipos de comunicación

### Intermediario de mensajes

- **Definición:** Componente (broker) a través del cual se comunican por red los microservicios mediante mensajes.
- **Detalles clave:** Ejemplos citados: RabbitMQ y Kafka. Recibe los eventos publicados y los entrega a los consumidores, que confirman el procesamiento.
- **No confundir con:** HTTP (la otra vía de comunicación por red citada).
- **Relacionados:** [Mensajería](#mensajería), [Microservicios](#microservicios)
- **Sección:** 3.2 Tipos de comunicación

### Mensajería

- **Definición:** Comunicación mediante mensajes que desacopla al emisor del momento en que se procesa el evento.
- **Detalles clave:** No garantiza que cada mensaje se procese exactamente una vez; los consumidores deben tolerar entregas duplicadas. La comunicación distribuida debe contemplar fallos de red.
- **No confundir con:** Garantía de entrega exactamente una vez (no la ofrece).
- **Relacionados:** [Intermediario de mensajes](#intermediario-de-mensajes), [Comunicación asíncrona](#comunicación-asíncrona)
- **Sección:** 3.2 Tipos de comunicación

## Comparativas

### Organización interna

| Aspecto | Capas | Hexagonal | Cebolla |
|---|---|---|---|
| Idea principal | Agrupa por responsabilidad y delega entre capas | Aísla el núcleo mediante puertos y adaptadores | Organiza el sistema en anillos alrededor del dominio |
| Observación | Evitar que el dominio dependa directamente de tecnologías | Facilita sustituir tecnologías y probar el núcleo | Las dependencias apuntan hacia el centro |
| Abstracción del acceso a datos | Interfaz `Repository` en `domain`, `RepositoryImpl` en `persistence` | `RepositoryPort` en el núcleo, `RepositoryAdapter` en el adaptador de persistencia | Interfaz `Repository` en el dominio, `RepositoryImpl` en infraestructura |

### Estilos de despliegue

| Aspecto | Monolito | Monolito modular | Microservicios |
|---|---|---|---|
| Despliegue | Una aplicación desplegable | Una aplicación desplegable | Varios servicios desplegables |
| Límites y datos | Los componentes pueden compartir proceso y almacenamiento | Módulos con límites y APIs internas explícitas | Cada servicio controla sus datos y se comunica por red |
| Coste o ventaja | Operación sencilla; puede crecer con alto acoplamiento | Modularidad sin multiplicar despliegues | Despliegue independiente; más complejidad operativa |
| Comunicación | — | Mismo proceso: APIs públicas/internas o eventos | Por red: HTTP o intermediario de mensajes |

### Organización interna frente a despliegue

| Aspecto | Organización interna | Arquitectura de despliegue |
|---|---|---|
| Qué describe | Cómo se organiza el código | Cómo se empaqueta, ejecuta y despliega |
| Ejemplos | Capas, hexagonal, cebolla | Monolito, monolito modular, microservicios |

### Tipos de comunicación

| Aspecto | Síncrona | Asíncrona |
|---|---|---|
| Funcionamiento | El emisor hace una llamada y espera una respuesta | El emisor publica un mensaje o evento para que se procese después |
| Característica | Depende de la disponibilidad y el tiempo de respuesta del receptor | Desacopla temporalmente; puede haber retrasos o entregas duplicadas |

### Repositorio frente a DAO

| Aspecto | Repositorio | DAO |
|---|---|---|
| Interfaz | En `domain` | En `persistence` |
| Implementación | `RepositoryImpl` en `persistence` | `DAOImpl` en `persistence` |
| Usa / accede | Utiliza el DAO | Accede a la base de datos |

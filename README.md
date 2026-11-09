# ShipNow API — Pre-entrega Módulo 6: Testing funcional con Mocha, Chai y Supertest

API de logística (Node.js, Express, MongoDB/Mongoose) con arquitectura por capas **Controller → Service → Repository**, manejo centralizado de errores, un módulo de mocking y logging profesional con Winston.

## Requisitos

- Node.js 20.19 o superior
- MongoDB corriendo en local (o una URI de MongoDB Atlas)

## Instalación

```bash
npm install
cp .env.example .env
```

Completa el `.env` con tus valores (`PORT`, `MONGODB_URI`, `NODE_ENV`).
Si falta alguna variable, la app no arranca y avisa cuál.

## Variables de entorno

El archivo `.env.example` lista las variables necesarias, sin valores.
Cópialo a `.env` y complétalo:

| Variable | Descripción | Validación |
|---|---|---|
| `PORT` | Puerto del servidor | Entero entre 1 y 65535 |
| `NODE_ENV` | Entorno de ejecución | `development`, `production` o `test` |
| `MONGODB_URI` | URI de conexión a MongoDB | Obligatoria |
| `MONGODB_URI_TEST` | URI de la base de datos **de testing** | Obligatoria solo con `NODE_ENV=test` (la usa `npm test`) |

Ejemplo de valores: `PORT=8080`, `NODE_ENV=development`,
`MONGODB_URI=mongodb://localhost:27017/shipnow`.

Las variables se validan al arrancar (`src/config/env.config.js`). Si falta alguna, `PORT` no es numérico o `NODE_ENV` tiene un valor no permitido, la app lanza un error descriptivo y no inicia. Es el único archivo que lee `process.env`.

## Ejecución

```bash
npm run dev     # desarrollo (nodemon)
npm start       # producción
```

## Documentación de la API (Swagger)

La API está documentada con **Swagger / OpenAPI 3.0** y se puede consultar y probar desde el navegador.

| Qué | Dónde |
|---|---|
| Interfaz interactiva (Swagger UI) | `http://localhost:8080/api/docs` |
| Documento OpenAPI en JSON | `http://localhost:8080/api/docs.json` |

### Cómo acceder

```bash
npm install
cp .env.example .env     # completa los valores
npm run dev
```

Con el servidor levantado, abre `http://localhost:8080/api/docs` (el puerto es el de tu `PORT`).

### Qué está documentado

La documentación está agrupada por tags. En total hay **31 endpoints**:

| Tag | Endpoints | Contenido |
|---|---|---|
| Users | 5 | CRUD de usuarios |
| Products | 5 | CRUD de productos |
| Orders | 6 | CRUD de pedidos y cambio de estado |
| Deliveries | 6 | CRUD de entregas, asignación de repartidor y cambio de estado |
| Mocks | 7 | Datos simulados (no se guardan) y carga de datos de prueba |
| Logger | 1 | Herramienta de validación del logger (no es una funcionalidad de negocio) |
| Health | 1 | Estado del servidor |

Cada endpoint indica método, ruta, descripción, parámetros, body esperado, respuesta exitosa y los errores que realmente puede devolver (con ejemplos). Hay schemas reutilizables para usuario, producto, pedido, item de pedido, entrega, respuesta exitosa y respuesta de error.

### Cómo está organizada

```
src/
├── config/
│   ├── swagger.config.js       Información general, servidor, tags y montaje del documento
│   └── swagger.components.js   Schemas, parámetros y respuestas de error reutilizables
└── routes/                     Cada archivo de rutas lleva las anotaciones @openapi de sus endpoints
```

La configuración de Swagger vive en `config/` y las anotaciones de cada endpoint, junto a sus rutas. Los valores permitidos (roles, estados, códigos de error, límites de `qty`) se toman de `src/constants/index.js` y del diccionario de errores, para que la documentación no se desactualice.

### Aclaraciones para probar los endpoints

- **No hay autenticación:** todos los endpoints son abiertos, por eso no aparece el botón *Authorize*.
- **Probar desde Swagger:** abre un endpoint, pulsa **Try it out**, completa los parámetros o el body y pulsa **Execute**. Los ejemplos de error de cada endpoint corresponden a respuestas reales.
- **Ids:** los ids son ObjectId de MongoDB (24 caracteres hexadecimales). Copia el `_id` de la respuesta de un `POST` o de un `GET` para usarlo en los demás endpoints.
- **Flujo sugerido** para probar el sistema completo:
  1. `POST /api/mocks/seed?qty=5` crea clientes, repartidores, pedidos y entregas de prueba.
  2. `GET /api/users` y copia el `_id` de un usuario con rol `USER` (cliente) y el de uno con rol `COURIER` (repartidor).
  3. `POST /api/orders` con ese cliente. Copia el `_id` del pedido.
  4. `POST /api/deliveries` con ese pedido y el repartidor: el pedido pasa a `ASSIGNED`.
  5. `PATCH /api/deliveries/{id}/status` con `IN_TRANSIT` y luego `DELIVERED`: el pedido sigue el estado de su entrega.
- **Mocks:** los `GET /api/mocks/*` devuelven los datos directamente (sin el envoltorio `status/message/payload`) y no escriben en la base. Los `POST /api/mocks/seed*` no esperan body: la cantidad se indica con `qty` y el pedido con `orderId`.
- **Logger:** `GET /api/logs/loggerTest` es una herramienta de validación, no una funcionalidad de negocio.

## Reglas de la API

- **Capas:** Controller → Service → Repository. Solo los repositories y los modelos conocen Mongoose.
- **Campos controlados por el sistema:** el body de las peticiones no puede definir `role` (los usuarios se crean siempre con rol `USER`) ni `status` (el estado de un producto se deriva del stock: `AVAILABLE` si hay stock, `OUT_OF_STOCK` si no). Los campos no permitidos se ignoran.
- **Contraseñas:** se guardan hasheadas con bcrypt y los endpoints de usuarios nunca las devuelven. Los datos simulados de `/api/mocks` sí incluyen la contraseña de prueba (`Mock1234`), porque no se guardan en la base.
- **Constantes:** roles, estados, prioridades, entornos, coleciones y los valores `success`/`error` de las respuestas están centralizados en `src/constants/index.js`.
- **Formato de respuesta exitosa:** `{ "status": "success", "message": "...", "payload": ... }`.
  Los endpoints de `/api/mocks` devuelven los datos tal cual, sin envoltorio.
- **Formato de respuesta de error:** único para toda la API (ver "Manejo de errores").

## Reglas de pedidos y entregas

Los campos que define el sistema no se pueden enviar en el body (si se envían, se ignoran): en un pedido, `status` (siempre nace `CREATED`), `total` (se calcula con los items) y `delivery`.

**Transiciones de estado permitidas** (`PATCH .../status`). Cualquier otro cambio responde `400 INVALID_STATUS`, con `from`, `to` y `allowed` en `details`.

| Pedido | Puede pasar a |
|---|---|
| `CREATED` | `ASSIGNED`, `CANCELLED` |
| `ASSIGNED` | `PICKED_UP`, `CANCELLED` |
| `PICKED_UP` | `IN_TRANSIT`, `CANCELLED` |
| `IN_TRANSIT` | `DELIVERED` |
| `DELIVERED`, `CANCELLED` | (estados finales) |

| Entrega | Puede pasar a |
|---|---|
| `PENDING` | `ASSIGNED` (requiere repartidor: se asigna con `PUT /api/deliveries/{id}`) |
| `ASSIGNED` | `IN_TRANSIT` |
| `IN_TRANSIT` | `DELIVERED` |
| `DELIVERED` | (estado final) |

**Relación entre pedido y entrega**

- `POST /api/deliveries` solo acepta un pedido en `CREATED` que no tenga entrega. Con repartidor la entrega nace `ASSIGNED`, sin repartidor, `PENDING`. El repartidor debe existir y tener rol `COURIER`.
- El estado del pedido sigue al de su entrega: `PENDING` → `CREATED`, `ASSIGNED` → `ASSIGNED`, `IN_TRANSIT` → `IN_TRANSIT`, `DELIVERED` → `DELIVERED`.
- Cancelar o eliminar un pedido elimina su entrega.
- Eliminar una entrega deja al pedido sin entrega y lo vuelve a `CREATED` (salvo que ya esté `DELIVERED` o `CANCELLED`).
- No se puede reasignar el repartidor de una entrega ya entregada.

## Manejo de errores

Todos los errores pasan por una capa común. Los **services** detectan el problema y
lanzan un error del dominio; los **controllers** no atrapan ni responden errores
(Express 5 envía las promesas rechazadas al middleware); la **única** respuesta de
error al cliente sale del middleware global.

```
src/
├── errors/
│   ├── error.dictionary.js   Códigos de error y diccionario (status + mensaje)
│   ├── app.error.js          Clase base AppError
│   └── domain.error.js       Errores del dominio (UserNotFoundError, etc.)
└── middlewares/
    └── error.middleware.js   notFoundHandler + errorHandler
```

### Formato único de error

```json
{
  "status": "error",
  "statusCode": 404,
  "code": "USER_NOT_FOUND",
  "message": "Usuario no encontrado",
  "details": { "id": "000000000000000000000000" }
}
```

`details` es opcional y da contexto (ids, valores recibidos, valores permitidos).

### Diccionario de errores

| Código | HTTP | Mensaje |
|---|---|---|
| `USER_NOT_FOUND` | 404 | Usuario no encontrado |
| `PRODUCT_NOT_FOUND` | 404 | Producto no encontrado |
| `ORDER_NOT_FOUND` | 404 | Pedido no encontrado |
| `ROUTE_NOT_FOUND` | 404 | Ruta no encontrada |
| `EMAIL_REQUIRED` | 400 | El email es obligatorio |
| `EMAIL_ALREADY_EXISTS` | 409 | Ya existe un usuario con ese email |
| `INVALID_PASSWORD` | 400 | La contraseña no cumple los requisitos |
| `INVALID_STATUS` | 400 | Estado inválido |
| `INVALID_QUANTITY` | 400 | Cantidad inválida |
| `INVALID_ID` | 400 | El identificador no tiene un formato válido |
| `VALIDATION_ERROR` | 400 | Los datos enviados no son válidos |
| `INVALID_JSON` | 400 | El cuerpo de la petición no es un JSON válido |
| `MOCK_SEED_FAILED` | 500 | No se pudieron guardar los datos de prueba |
| `INTERNAL_ERROR` | 500 | Error interno del servidor |
| `DELIVERY_ALREADY_EXISTS` | 409 | El pedido ya tiene una entrega asociada |
| `NO_COURIERS_AVAILABLE` | 409 | No hay repartidores disponibles para asignar la entrega |
| `DELIVERY_NOT_FOUND` | 404 | Entrega no encontrada |
| `INVALID_COURIER` | 400 | El usuario indicado no es un repartidor |

El middleware también traduce errores de Mongoose (`CastError` → `INVALID_ID`,
`ValidationError` → `VALIDATION_ERROR`, índice duplicado → `EMAIL_ALREADY_EXISTS`)
y los de JSON mal formado. Los errores inesperados responden `INTERNAL_ERROR` sin
exponer detalles internos. Los errores se registran con el logger (ver "Logging y monitoreo"): los 5xx como `error`, con su stack trace, y los 4xx como `warning`.

### Validaciones del módulo de mocks

| Caso | Respuesta |
|---|---|
| `qty` no numérica o decimal (`abc`, `2.5`) | 400 `INVALID_QUANTITY` (`reason`: debe ser entero) |
| `qty` negativa (`-5`) | 400 `INVALID_QUANTITY` (`reason`: no puede ser negativa) |
| `qty` fuera de rango (`0`, `1000`) | 400 `INVALID_QUANTITY` (mínimo 1, máximo 100) |
| `status` inexistente en `GET /api/mocks/orders?status=` | 400 `INVALID_STATUS` (`details.allowed` lista los válidos) |
| Falla de MongoDB durante `seed` | 500 `MOCK_SEED_FAILED` |
| `orderId` ausente o mal formado en `POST /api/mocks/seed/deliveries` | 400 `INVALID_ID` |
| El pedido no existe | 404 `ORDER_NOT_FOUND` |
| El pedido ya tiene entrega | 409 `DELIVERY_ALREADY_EXISTS` |
| Pedido cancelado (no admite entrega) | 400 `INVALID_STATUS` |
| No hay repartidores cargados | 409 `NO_COURIERS_AVAILABLE` (ejecutar antes `POST /api/mocks/seed`) |

`GET /api/mocks/orders?qty=3&status=DELIVERED` genera pedidos con un estado concreto.

Si `seed` falla a mitad de la carga, se intenta eliminar lo ya insertado en esa ejecución (rollback por mejor esfuerzo) para no dejar datos huérfanos. Si el borrado también falla, se registra como `error` con el logger.

## Endpoints de la API base

| Recurso | Rutas |
|---|---|
| Productos | `GET/POST /api/products`, `GET/PUT/DELETE /api/products/{id}` |
| Usuarios | `GET/POST /api/users`, `GET/PUT/DELETE /api/users/{id}` |
| Pedidos | `GET/POST /api/orders`, `GET/PUT/DELETE /api/orders/{id}`, `PATCH /api/orders/{id}/status` |
| Entregas | `GET/POST /api/deliveries`, `GET/PUT/DELETE /api/deliveries/{id}`, `PATCH /api/deliveries/{id}/status` |
| Mocks | `/api/mocks/*` (ver más abajo) |
| Logger (prueba) | `GET /api/logs/loggerTest` |
| Documentación | `GET /api/docs`, `GET /api/docs.json` |
| Health | `GET /api/health` |

## Estructura del módulo de mocking

```
src/
├── mocks/                 Generadores puros (solo faker, sin base de datos)
│   ├── user.mocks.js
│   ├── order.mocks.js
│   └── delivery.mocks.js
├── services/mock.service.js         Valida qty, arma el dataset y las relaciones
├── repositories/mock.repository.js  Único que inserta en MongoDB
├── controllers/mock.controller.js
├── routes/mock.routes.js            Montado en /api/mocks
└── constants/index.js               Roles, estados, prioridades y MOCKING_PARAMETERS
```

## Estructura del módulo de logging

```
src/
├── utils/
│   ├── logger.util.js            Configuración única de Winston (niveles, formatos, archivos, rotación)
│   └── request-context.util.js   requestId por petición (AsyncLocalStorage)
├── middlewares/
│   └── http-logger.middleware.js Log `http` de cada petición y header x-request-id
├── routes/log.routes.js          GET /api/logs/loggerTest
├── controllers/log.controller.js
├── services/log.service.js       Emite un log por cada nivel
└── constants/index.js            LOG_LEVELS, colores, nivel por entorno, parámetros de archivos
```

## Endpoints de mocking

Parámetro `qty` (opcional): entero entre 1 y 100. Por defecto, 10.
Si es inválido responde `400` con `INVALID_QUANTITY` (ver "Manejo de errores").

### Datos simulados (NO se guardan en la base)

| Método | Ruta | Devuelve |
|---|---|---|
| GET | `/api/mocks/users?qty=2` | Usuarios con rol `USER` o `COURIER` |
| GET | `/api/mocks/couriers?qty=2` | Repartidores (rol `COURIER`) |
| GET | `/api/mocks/orders?qty=3` | Pedidos con estados y prioridades válidos. `status` (opcional) fuerza el estado de todos los pedidos |
| GET | `/api/mocks/deliveries?qty=5` | Entregas asociadas a pedidos y repartidores |

### Carga de datos de prueba (SÍ se guardan en MongoDB)

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/mocks/seed/users?qty=10` | Inserta `qty` usuarios |
| POST | `/api/mocks/seed?qty=10` | Inserta el conjunto completo: clientes, repartidores, pedidos y entregas |
| POST | `/api/mocks/seed/deliveries?orderId=<id>` | Crea una entrega simulada para un pedido existente |

Respuestas de ejemplo:

```json
{ "insertados": 10, "coleccion": "usuarios" }
```

```json
{ "insertados": { "usuarios": 10, "repartidores": 4, "pedidos": 10, "entregas": 7 } }
```

## Datos que se generan y sus relaciones

- **Usuarios:** `name`, `email` (único, dominio `test.com`), `password`, `role`.
  Roles tomados de `USER_ROLES`.
- **Repartidores:** usuarios con rol `COURIER`. En `seed` y en los `GET` de pedidos y entregas se generan `ceil(qty / 3)` (mínimo 1). En
  `GET /api/mocks/couriers?qty=N` se devuelven exactamente `N`.
- **Pedidos:** `customer` (referencia a un usuario con rol `USER`), `items`,
  `deliveryAddress`, `total` (suma de los items), `status` (`ORDER_STATUS`),
  `priority` (`ORDER_PRIORITY`).
- **Entregas:** `order` (referencia a un pedido), `courier`, `status`
  (`DELIVERY_STATUS`), `assignedAt`, `deliveredAt`.

Reglas de coherencia entre pedido y entrega:

| Estado del pedido | Entrega |
|---|---|
| `CREATED` | `PENDING`, sin repartidor |
| `ASSIGNED` / `PICKED_UP` | `ASSIGNED`, con repartidor (`COURIER`) |
| `IN_TRANSIT` | `IN_TRANSIT`, con repartidor |
| `DELIVERED` | `DELIVERED`, con repartidor y `deliveredAt` posterior a `assignedAt` |
| `CANCELLED` | No tiene entrega |

Cada pedido con entrega guarda en `delivery` el `_id` de esa entrega.

Todos los usuarios mock tienen la contraseña `Mock1234` (definida en
`MOCKING_PARAMETERS`). En la base se guarda **hasheada con bcrypt**.

## Logging y monitoreo

ShipNow usa **Winston** (`winston` + `winston-daily-rotate-file`) con un logger
centralizado en `src/utils/logger.util.js`. Cualquier módulo lo importa y lo usa sin
repetir configuración:

```javascript
import logger from "../utils/logger.util.js";

logger.info("Usuario creado", { userId });
```

### Niveles

De mayor a menor severidad:

| Nivel | Uso |
|---|---|
| `fatal` | Falla crítica: no se puede conectar a MongoDB, puerto ocupado, excepción no capturada |
| `error` | Error inesperado del servidor (5xx) |
| `warning` | Situación esperada que no es correcta: errores de negocio o de entrada (4xx), producto sin stock |
| `info` | Eventos normales: servidor iniciado, conexión a MongoDB, usuario o producto creado, datos mock insertados |
| `http` | Una línea por petición: método, ruta, status y duración |
| `debug` | Detalle técnico: datos mock generados |

### Comportamiento según el entorno

El nivel mínimo se define con `NODE_ENV` (ver `LOG_LEVEL_BY_ENVIRONMENT` en
`src/constants/index.js`):

| `NODE_ENV` | Nivel mínimo | Consola |
|---|---|---|
| `development` | `debug` | Texto legible con colores |
| `production` | `info` | JSON, una línea por evento |
| `test` | `warning` | Texto sin colores |

### Archivos de log

La carpeta `logs/` se crea automáticamente la primera vez que se registra un evento. Los archivos rotan por día:

| Archivo | Contenido |
|---|---|
| `logs/error-AAAA-MM-DD.log` | Solo `error` y `fatal` |
| `logs/error.log` | Acceso directo al archivo de errores del día |
| `logs/combined-AAAA-MM-DD.log` | Todo lo que permita el nivel del entorno |

**Rotación:** un archivo nuevo por día, máximo 20 MB por archivo, se conservan 14 días y
los archivos viejos se comprimen (`.gz`). Los archivos se escriben en formato JSON, una
línea por evento.

**Git:** la carpeta `logs/` y los archivos `*.log` están en `.gitignore`: los registros
generados por la aplicación no se suben al repositorio.

### Request ID

Cada petición recibe un identificador único que se devuelve en el header
`x-request-id` y se agrega a todos los logs generados durante esa petición. Si el
cliente envía su propio `x-request-id` (solo letras, números, `_` y `-`, hasta 64
caracteres), se respeta. Sirve para seguir todos los registros de una misma petición:

```bash
grep "mi-prueba-1" logs/combined-*.log
```

### Endpoint de prueba del logger

`GET /api/logs/loggerTest` emite un log de cada nivel y responde cuáles quedaron registrados
según el entorno. Es una herramienta interna de verificación, no una funcionalidad de
negocio.

```bash
curl -i localhost:8080/api/logs/loggerTest
```

Ejemplo de respuesta en desarrollo:

```json
{
  "status": "success",
  "message": "Logs de prueba generados correctamente",
  "payload": {
    "activeLevel": "debug",
    "levels": [
      { "level": "debug", "registrado": true },
      { "level": "http", "registrado": true },
      { "level": "info", "registrado": true },
      { "level": "warning", "registrado": true },
      { "level": "error", "registrado": true },
      { "level": "fatal", "registrado": true }
    ]
  }
}
```

Para validar el sistema:

1. Los seis mensajes aparecen en la consola (en `production`, solo desde `info`).
2. `logs/error.log` contiene únicamente las líneas `error` y `fatal`.
3. `logs/combined-*.log` contiene el resto, según el nivel del entorno.

Con `NODE_ENV=production` la respuesta muestra `debug` y `http` con `"registrado": false`.

### Dónde se registra cada evento

| Evento | Nivel |
|---|---|
| Conexión a MongoDB, servidor iniciado | `info` |
| Falla de conexión, puerto ocupado, excepción no capturada | `fatal` |
| Error de negocio o de entrada (404, 400, 409) en el middleware de errores | `warning` |
| Error inesperado o falla de carga de mocks (5xx) | `error` |
| Usuario o producto creado, actualizado o eliminado | `info` |
| Producto creado o actualizado sin stock | `warning` |
| Datos mock generados (sin guardar) | `debug` |
| Datos mock insertados en MongoDB | `info` |
| Rollback de una carga de mocks fallida | `warning` / `error` |
| Cada petición HTTP | `http` |

## Testing

Los tests funcionales prueban la API real de punta a punta: cada test hace una petición HTTP a la app y verifica el status, el cuerpo de la respuesta y, cuando corresponde, lo que quedó guardado en la base.

### Herramientas

| Herramienta | Uso |
|---|---|
| [Mocha](https://mochajs.org/) | Ejecuta los tests (`describe` / `it`) |
| [Chai](https://www.chaijs.com/) | Aserciones (`expect`) |
| [Supertest](https://github.com/ladjs/supertest) | Hace peticiones HTTP a la app sin levantar un puerto |

### Cómo ejecutarlos

```bash
npm test
```

Requisitos:
- MongoDB corriendo en local (o una URI de Atlas).
- La variable `MONGODB_URI_TEST` en tu `.env`, apuntando a una base **distinta** de la de desarrollo:

```
MONGODB_URI_TEST=mongodb://localhost:27017/shipnow_test
```

**Sí se necesita una base de datos de testing.** Los tests escriben datos reales, así que usan su propia base y nunca tocan la de desarrollo. Como protección, si el nombre de la base no contiene `test`, la suite se niega a correr y avisa.

Variables de entorno que usan los tests:

| Variable | Valor en tests |
|---|---|
| `NODE_ENV` | Se fuerza a `test` en `.mocharc.cjs` (no hace falta configurarla) |
| `MONGODB_URI_TEST` | Base de testing (obligatoria) |

En entorno `test` el logger queda silencioso, así que `npm test` no ensucia la consola ni escribe archivos en `logs/`.

### Estructura

```
.mocharc.cjs              # Configuración de Mocha (NODE_ENV=test, archivos, timeout)
tests/
├── setup.js              # Conecta a la base de testing antes de todo y la elimina al final
├── helpers/
│   ├── db.js             # Conexión, limpieza y borrado de la base de testing
│   ├── factories.js      # Crea datos de prueba (usuarios, repartidores, pedidos, entregas)
│   └── assertions.js     # Verifica el formato de éxito y de error de la API
├── health.test.js        # GET /api/health
├── user.test.js          # Usuarios
├── product.test.js       # Productos
├── order.test.js         # Pedidos y estados
├── delivery.test.js      # Entregas, asignación y estados
├── mock.test.js          # Módulo de mocking
├── logger.test.js        # Logger y x-request-id
├── swagger.test.js       # Documentación Swagger
└── routes.test.js        # Rutas inexistentes
```

Hay un archivo por recurso, para que cada uno haga referencia a lo que testea.

### Qué cubren (171 tests)

| Archivo | Tests | Qué prueba |
|---|---|---|
| `user.test.js` | 20 | CRUD de usuarios, contraseña hasheada y sin exponer, rol siempre `USER`, email duplicado |
| `product.test.js` | 16 | CRUD de productos, estado calculado según el stock |
| `order.test.js` | 33 | Listar, crear, obtener por id, actualizar, borrar, total calculado, ciclo de vida y transiciones de estado |
| `delivery.test.js` | 35 | CRUD de entregas, asignar y reasignar repartidor, estados y sincronización con el pedido |
| `mock.test.js` | 44 | Datos simulados, validación de cantidades, carga en MongoDB (`seed`), relaciones y rollback ante fallas |
| `logger.test.js` | 6 | Endpoint `/api/logs/loggerTest`, los 6 niveles, `x-request-id` |
| `swagger.test.js` | 11 | `/api/docs`, `/api/docs.json`, tags, schemas, enums y códigos de error |
| `routes.test.js` | 5 | Ruta inexistente (`ROUTE_NOT_FOUND`) y header `x-request-id` |
| `health.test.js` | 1 | Health check |

Cada recurso se prueba con sus casos de éxito **y** de error: datos incompletos, recurso inexistente, id mal formado, estado inválido y cantidades inválidas en los mocks. En los errores se valida el status HTTP **y** el formato del módulo de errores (`status`, `statusCode`, `code`, `message` igual al del diccionario y `details`).

### Datos de prueba y limpieza

- Los datos **se crean dentro de los tests** (vía API o con las factories), nunca a mano.
- Antes de cada test se vacía la base (`beforeEach`), así los tests no dependen entre sí ni del orden.
- Al terminar la suite se **elimina** la base de testing completa.

Por eso la suite se puede correr tantas veces como se quiera con el mismo resultado.

### Coherencia con Swagger

Cada comportamiento documentado en Swagger tiene un test:

- `swagger.test.js` verifica que la documentación se sirve, que cada endpoint documenta una respuesta de éxito y una de error, y que los enums y los códigos de error documentados coinciden con los del proyecto.
- Los tests de cada recurso provocan las respuestas documentadas (200/201, 400, 404, 409, 500) y comprueban el código de error que Swagger lista.

## Probar con curl

```bash
curl "localhost:8080/api/mocks/users?qty=2"
curl "localhost:8080/api/mocks/orders?qty=3"
curl "localhost:8080/api/mocks/deliveries?qty=5"
curl -i "localhost:8080/api/mocks/users?qty=abc"     # 400
curl -X POST "localhost:8080/api/mocks/seed/users?qty=10"
curl -X POST "localhost:8080/api/mocks/seed?qty=10"
curl -i "localhost:8080/api/mocks/users?qty=-5"                 # 400 INVALID_QUANTITY
curl -i "localhost:8080/api/mocks/orders?qty=3&status=FOO"      # 400 INVALID_STATUS
curl -i localhost:8080/api/users/000000000000000000000000       # 404 USER_NOT_FOUND
curl -i localhost:8080/api/users/abc                            # 400 INVALID_ID
curl -i localhost:8080/api/nada                                 # 404 ROUTE_NOT_FOUND
curl -i -X POST "localhost:8080/api/mocks/seed/deliveries?orderId=<ID_PEDIDO_SIN_ENTREGA>"
curl -i -X POST "localhost:8080/api/mocks/seed/deliveries?orderId=000000000000000000000000"   # 404 ORDER_NOT_FOUND
curl -i -X POST "localhost:8080/api/mocks/seed/deliveries?orderId=abc"                         # 400 INVALID_ID
curl -i -X POST "localhost:8080/api/mocks/seed/deliveries"                                     # 400 INVALID_ID
curl -i localhost:8080/api/logs/loggerTest
curl -i -H "x-request-id: mi-prueba-1" localhost:8080/api/nada
```

Los pedidos que crea `seed` ya vienen con su entrega. Para probar el caso de éxito
(201) hay que liberar uno en `mongosh` y usar su `_id` en `<ID_PEDIDO_SIN_ENTREGA>`:

```javascript
const o = db.orders.findOne({ status: { $ne: "CANCELLED" }, delivery: { $ne: null } })
db.deliveries.deleteOne({ _id: o.delivery })
db.orders.updateOne({ _id: o._id }, { $set: { delivery: null } })
o._id
```

Repetir el mismo `curl` devuelve 409 `DELIVERY_ALREADY_EXISTS`. Con el `_id` de un
pedido `CANCELLED` devuelve 400 `INVALID_STATUS`.

Cada ejecución de `seed` agrega datos nuevos (no borra los anteriores).

## Limpiar los datos de prueba (mongosh)

```javascript
db.users.deleteMany({ email: /@test\.com$/ })
db.orders.deleteMany({})
db.deliveries.deleteMany({})
```

> `orders` y `deliveries` se vacían completas: úsalo solo en una base de pruebas.
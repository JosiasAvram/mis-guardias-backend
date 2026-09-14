# Backend — Mis Guardias

API REST en NestJS + MongoDB. Misma base que el backend de App_Notas:
JWT con `tokenVersion`, guard de roles, Swagger y rate limit.

## Cómo levantarlo

```bash
cd backend
npm install
copy .env.example .env      # en PowerShell:  cp .env.example .env
```

Editá el `.env`:

- `MONGODB_URI` — si tenés Mongo local dejá el valor que viene; si usás Atlas,
  pegá la cadena de conexión.
- `JWT_SECRET` — poné cualquier texto largo y random.

Después:

```bash
npm run seed        # crea el usuario admin del .env (una sola vez)
npm run start:dev   # levanta la API en http://localhost:3000/api/v1
```

Docs interactivas: http://localhost:3000/api/docs

## Endpoints del paso 1

| Método | Ruta | Quién | Qué hace |
|--------|------|-------|----------|
| POST | `/auth/register` | libre | Crea la cuenta. Queda con rol `none` (pendiente). |
| POST | `/auth/login` | libre | Devuelve `{ token, user }`. |
| GET | `/auth/me` | logueado | Datos del usuario. Funciona aunque esté pendiente, para que la app pueda preguntar "¿ya me aprobaron?". |
| PATCH | `/auth/password` | logueado | Cambiar la contraseña. |
| GET | `/users` | aprobado | Lista de compañeros (filtro opcional `?sector=`). |
| GET | `/users/sectors` | aprobado | Sectores existentes + sugerencias. |
| PATCH | `/users/me` | aprobado | Editar mi perfil. |
| GET | `/users/pending` | admin | Usuarios esperando aprobación. |
| PATCH | `/users/:id/role` | admin | Aprobar un usuario o hacerlo admin. |

## Deploy (Mongo Atlas + GitHub + Render)

Mismo esquema que `accordes-app`: este repo tiene el backend en la raíz y
Render lo redeploya solo con cada push a `main`.

### 1. Base en Mongo Atlas

1. Entrá a [cloud.mongodb.com](https://cloud.mongodb.com) y creá un cluster **M0** (gratis).
2. **Database Access** → crear un usuario, por ejemplo `mis_guardias_app`, con una
   contraseña generada. Rol: *Read and write to any database*.
3. **Network Access** → *Add IP Address* → **Allow access from anywhere**
   (`0.0.0.0/0`). Render no tiene IP fija, así que sin esto no se puede conectar.
4. **Connect** → *Drivers* → copiá la cadena. Queda algo así:

```
mongodb+srv://mis_guardias_app:LA_PASSWORD@cluster0.xxxxx.mongodb.net/mis-guardias?retryWrites=true&w=majority
```

Ojo con dos cosas: hay que reemplazar `<password>` por la contraseña real, y
agregar `/mis-guardias` antes del `?` para que use esa base y no `test`.

### 2. Repo en GitHub

Desde `C:\dev\Mis_Guardias\backend`:

```bash
git init
git add .
git commit -m "Backend inicial: auth, usuarios y esquemas"
git branch -M main
git remote add origin https://github.com/JosiasAvram/mis-guardias-backend.git
git push -u origin main
```

El repo hay que crearlo antes en github.com (vacío, sin README). El `.gitignore`
ya deja afuera `node_modules`, `dist` y el `.env` — la cadena de Atlas y el
`JWT_SECRET` nunca se suben.

### 3. Servicio en Render

En [dashboard.render.com](https://dashboard.render.com) → **New → Web Service** →
conectás el repo `mis-guardias-backend`.

| Campo | Valor |
|-------|-------|
| Name | `mis-guardias-backend` |
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start:prod` |
| Instance Type | Free |
| Health Check Path | `/api/v1/health` |

Variables de entorno (**Environment**):

| Key | Value |
|-----|-------|
| `MONGODB_URI` | la cadena de Atlas del paso 1 |
| `JWT_SECRET` | un texto largo y random |
| `JWT_EXPIRES_IN` | `30d` |
| `NODE_ENV` | `production` |

`PORT` no se toca: Render la inyecta sola y `main.ts` la lee.

Cuando termine el deploy, abrí `https://mis-guardias-backend.onrender.com/api/v1/health`.
Tiene que devolver `{"ok":true,"db":"conectada",...}`. Si dice `"desconectada"`,
el problema está en la cadena de Atlas o en el Network Access.

### 4. Crear el admin

El script `npm run seed` corre contra la base que diga tu `.env` local. Para
crear el admin **en Atlas**, poné en tu `.env` local la misma `MONGODB_URI` de
Render y corré:

```bash
npm run seed
```

Una sola vez. Después podés volver a apuntar tu `.env` a la base local si querés.

### Cosas a tener en cuenta del plan free

- El servicio se **duerme a los 15 minutos** sin tráfico. El primer request
  después tarda hasta un minuto en responder. Por eso el axios de la app tiene
  `timeout: 60000`.
- Cada push a `main` dispara un redeploy automático.

## Cómo probar que funciona

Con la API levantada, en PowerShell:

```powershell
# 1. Registro
curl -Method POST http://localhost:3000/api/v1/auth/register `
  -ContentType "application/json" `
  -Body '{"username":"jperez","password":"secreto123","name":"Juan","lastName":"Perez","sector":"Guardia"}'

# 2. Login del admin (el que creó el seed)
curl -Method POST http://localhost:3000/api/v1/auth/login `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"TU_PASSWORD_DEL_ENV"}'

# 3. Con el token del admin, ver pendientes y aprobar
#    GET  /api/v1/users/pending
#    PATCH /api/v1/users/<id>/role   body: {"role":"empleado"}
```

Es más cómodo desde Swagger (`/api/docs`): botón **Authorize**, pegás el token
y probás todo desde ahí.

Qué tiene que pasar:

- Un usuario recién registrado recibe **403** si pide `GET /users` — todavía no
  lo aprobaron.
- Cuando el admin lo aprueba, su token viejo devuelve **401** (porque sube
  `tokenVersion`) y la app lo manda a loguearse de nuevo. Ahí ya entra.
- Un `empleado` que pide `GET /users/pending` recibe **403**.

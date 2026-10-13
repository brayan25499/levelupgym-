# LevelUpGym

> "Sistema web integral para la gestión de gimnasios, diseñado para administrar clientes, membresías, progreso físico, objetivos, clases grupales y procesos administrativos desde una plataforma centralizada."

![Captura principal del proyecto](docs/captura-principal.png)

## 📌 El problema
Los gimnasios necesitan administrar diferentes procesos relacionados con sus clientes, membresías, progreso físico, objetivos, clases y personal. Cuando esta información se gestiona de manera manual o mediante diferentes herramientas, puede ser difícil mantener un control organizado y actualizado.

## ✅ La solución
LevelUpGym es una plataforma web que centraliza la gestión de los principales procesos de un gimnasio, proporcionando herramientas específicas tanto para los administradores como para los clientes.

El sistema permite administrar la información de los usuarios, controlar membresías, realizar seguimiento del progreso físico, establecer objetivos, gestionar clases grupales y facilitar la interacción del cliente con los servicios del gimnasio.

**Funcionalidades principales:**
- Registro y gestión de clientes.
- Autenticación y control de acceso mediante roles.
- Gestión de planes de membresía.
- Procesamiento y registro de pagos.
- Creación y seguimiento de objetivos personales.
- Seguimiento del progreso corporal.
- Gestión de clases grupales y reservas.
- Gestión de entrenadores y roles del gimnasio.
- Programación de sesiones.
- Panel administrativo.
- Panel personalizado para clientes.
- Interfaz web responsive y moderna.

## 🛠️ Tecnologías
| Capa | Tecnología |
|---|---|
| Frontend | Angular |
| Backend | C# / ASP.NET Core .NET 10 |
| Base de datos | SQL Server |
| Otras | Git, GitHub, JWT, Entity Framework Core |

## 🏗️ Arquitectura
Usuario → Frontend Angular (HTTP/API) → Backend C# ASP.NET Core .NET 10 (JWT) → Entity Framework Core → SQL Server

## 🚀 Cómo ejecutarlo
**Requisitos:** Antes de ejecutar el proyecto, asegúrate de tener instaladas las siguientes herramientas:

- Node.js, versión 20 o superior
- Angular CLI
- .NET 10 SDK
- SQL Server
- Git
- Visual Studio 2022 o Visual Studio Code (recomendado)

### Configurar la base de datos

Crea una base de datos en SQL Server y configura la cadena de conexión del proyecto backend.

En `appsettings.json` o `appsettings.Development.json`, configura (cambia `TU_SERVIDOR` por el nombre de tu servidor de SQL Server):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=TU_SERVIDOR;Database=levelupgym_db;Integrated Security=True;TrustServerCertificate=True;MultipleActiveResultSets=False"
  }
}
```

### Clonar e instalar

```bash
# 1. Clonar el repositorio (rama dev)
git clone -b dev https://github.com/brayan25499/levelupgym-.git
cd levelupgym-

# 2. Backend
cd Backend/LevelUpGym.Api
dotnet restore
dotnet ef database update
dotnet run

# 3. Frontend (en otra terminal)
cd Frontend/LevelUpGym
npm install
npm start
```

**Demo:** [Video del proyecto funcionando](https://www.youtube.com/watch?v=eUAHRtpDb7c)

## 📸 Capturas

Estas son las pantallas principales de LevelUpGym. Las imágenes están en la carpeta `docs/` del repositorio.

| Pantalla | Descripción |
|---|---|
| ![Pantalla de inicio de sesión](docs/login.png) | Donde el usuario ingresa con su correo y contraseña. |
| ![Pantalla de registro](docs/registro.png) | Donde el usuario crea una cuenta nueva. |
| ![Planes de membresía](docs/planes.png) | Donde el usuario revisa los planes disponibles. |
| ![Página Nosotros](docs/nosotros.png) | Información del gimnasio y del equipo. |

## 👥 Equipo
| Nombre | Rol | GitHub |
|---|---|---|
| David Gonzalez | Backend, base de datos, frontend | [@bigbangblood](https://github.com/bigbangblood) |
| Brayan Valencia | Frontend,Backend| [@brayan25499](https://github.com/brayan25499) |
| Hillary Zabatt Cordoba | Frontend | [@hilly00](https://github.com/hilly00) |

## 📄 Contexto
Proyecto formativo del programa **Análisis y Desarrollo de Software (ADSO)** · SENA · Centro de Tecnología Mobiliario · 2026.
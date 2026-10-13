using LevelUpGym.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace LevelUpGym.Api.Data;

public static class DataSeeder
{
    public static void Seed(LevelUpDbContext context)
    {
        context.Database.EnsureCreated();

        // Schema patch for ProgressReports columns & removed GoalType 7
        try
        {
            context.Database.ExecuteSqlRaw(@"
                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ProgressReports' AND COLUMN_NAME = 'Imc')
                BEGIN
                    ALTER TABLE ProgressReports ALTER COLUMN Imc NVARCHAR(20) NULL;
                END

                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ProgressReports' AND COLUMN_NAME = 'Altura')
                BEGIN
                    ALTER TABLE ProgressReports ALTER COLUMN Altura NVARCHAR(20) NULL;
                END

                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ProgressReports' AND COLUMN_NAME = 'ClientIdCliente')
                BEGIN
                    EXEC('UPDATE ProgressReports SET IdCliente = ClientIdCliente WHERE (IdCliente IS NULL OR IdCliente = 0) AND ClientIdCliente IS NOT NULL');
                    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ProgressReports_clientes_ClientIdCliente')
                        ALTER TABLE ProgressReports DROP CONSTRAINT FK_ProgressReports_clientes_ClientIdCliente;
                    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ProgressReports_ClientIdCliente')
                        DROP INDEX IX_ProgressReports_ClientIdCliente ON ProgressReports;
                    ALTER TABLE ProgressReports DROP COLUMN ClientIdCliente;
                END

                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ProgressReports' AND COLUMN_NAME = 'PorcentajeGrasa')
                BEGIN
                    ALTER TABLE ProgressReports DROP COLUMN PorcentajeGrasa;
                END

                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Goals')
                BEGIN
                    DELETE FROM Goals WHERE IdTipoObjetivo = 7;
                END

                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'GoalTypes')
                BEGIN
                    DELETE FROM GoalTypes WHERE IdTipoObjetivo = 7;
                END
            ");
        }
        catch (Exception ex)
        {
            Console.WriteLine("DataSeeder Schema Patch: " + ex.Message);
        }

        // 1. Seed Roles
        if (!context.Roles.Any())
        {
            context.Roles.AddRange(
                new Role { Nombre = "Admin" },
                new Role { Nombre = "Client" },
                new Role { Nombre = "Employee" }
            );
            context.SaveChanges();
        }

        // 2. Seed Admin User
        var adminAuth = context.Auths.FirstOrDefault(a => a.Email == "admin@levelup.com");
        if (adminAuth == null)
        {
            var adminProfile = new Profile
            {
                Nombre = "Admin",
                Apellidos = "System",
                TipoDocumento = "CC",
                NumDocumento = "123456789",
                Telefono = "3001234567"
            };
            context.Profiles.Add(adminProfile);
            context.SaveChanges();

            using var hmac = new System.Security.Cryptography.HMACSHA512();
            adminAuth = new Auth
            {
                IdProfile = adminProfile.IdProfile,
                Email = "admin@levelup.com",
                Password = hmac.ComputeHash(Encoding.UTF8.GetBytes("admin123")),
                PasswordSalt = hmac.Key,
                Estado = "Active"
            };
            context.Auths.Add(adminAuth);
            context.SaveChanges();

            var adminRole = context.Roles.First(r => r.Nombre == "Admin");
            context.UserRoles.Add(new UserRole { IdAuth = adminAuth.IdAuth, IdRol = adminRole.IdRol });
            context.SaveChanges();
        }
        else
        {
            // Force admin password to "admin123" on startup to ensure it works correctly
            using var hmac = new System.Security.Cryptography.HMACSHA512();
            adminAuth.Password = hmac.ComputeHash(Encoding.UTF8.GetBytes("admin123"));
            adminAuth.PasswordSalt = hmac.Key;
            adminAuth.Estado = "Active";
            context.SaveChanges();
        }

        // 2b. Seed Client User for User Dashboard
        try
        {
            var clientAuth = context.Auths.FirstOrDefault(a => a.Email == "cliente@levelup.com");
            if (clientAuth == null)
            {
                var clientProfile = context.Profiles.FirstOrDefault(p => p.NumDocumento == "555444333");
                if (clientProfile == null)
                {
                    clientProfile = new Profile
                    {
                        Nombre = "Usuario",
                        Apellidos = "Cliente",
                        TipoDocumento = "CC",
                        NumDocumento = "555444333",
                        Telefono = "3205554433",
                        Sexo = "M",
                        Peso = 75,
                        Estatura = 175,
                        CreatedAt = DateTime.UtcNow
                    };
                    context.Profiles.Add(clientProfile);
                    context.SaveChanges();
                }

                if (!context.Auths.Any(a => a.IdProfile == clientProfile.IdProfile))
                {
                    using var hmac = new System.Security.Cryptography.HMACSHA512();
                    clientAuth = new Auth
                    {
                        IdProfile = clientProfile.IdProfile,
                        Email = "cliente@levelup.com",
                        Password = hmac.ComputeHash(Encoding.UTF8.GetBytes("Cliente123!")),
                        PasswordSalt = hmac.Key,
                        Estado = "ACTIVO",
                        CreatedAt = DateTime.UtcNow
                    };
                    context.Auths.Add(clientAuth);
                    context.SaveChanges();
                }

                if (!context.Clients.Any(c => c.IdProfile == clientProfile.IdProfile))
                {
                    var clientEntity = new Client
                    {
                        IdProfile = clientProfile.IdProfile,
                        Estado = "ACTIVO",
                        CreatedAt = DateTime.UtcNow
                    };
                    context.Clients.Add(clientEntity);
                    context.SaveChanges();
                }

                var clientRole = context.Roles.FirstOrDefault(r => r.Nombre == "Client");
                if (clientRole != null && clientAuth != null && !context.UserRoles.Any(ur => ur.IdAuth == clientAuth.IdAuth))
                {
                    context.UserRoles.Add(new UserRole { IdAuth = clientAuth.IdAuth, IdRol = clientRole.IdRol });
                    context.SaveChanges();
                }
            }
            else
            {
                using var hmac = new System.Security.Cryptography.HMACSHA512();
                clientAuth.Password = hmac.ComputeHash(Encoding.UTF8.GetBytes("Cliente123!"));
                clientAuth.PasswordSalt = hmac.Key;
                clientAuth.Estado = "ACTIVO";
                context.SaveChanges();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("DataSeeder Client warning: " + ex.Message);
        }

        // 2c. Seed Employee User (Entrenador)
        try
        {
            var trainerAuth = context.Auths.FirstOrDefault(a => a.Email == "entrenador@levelup.com");
            if (trainerAuth == null)
            {
                var trainerProfile = context.Profiles.FirstOrDefault(p => p.NumDocumento == "999888777");
                if (trainerProfile == null)
                {
                    trainerProfile = new Profile
                    {
                        Nombre = "Entrenador",
                        Apellidos = "Principal",
                        TipoDocumento = "CC",
                        NumDocumento = "999888777",
                        Telefono = "3009998877",
                        Sexo = "M",
                        CreatedAt = DateTime.UtcNow
                    };
                    context.Profiles.Add(trainerProfile);
                    context.SaveChanges();
                }

                if (!context.Auths.Any(a => a.IdProfile == trainerProfile.IdProfile))
                {
                    using var hmac = new System.Security.Cryptography.HMACSHA512();
                    trainerAuth = new Auth
                    {
                        IdProfile = trainerProfile.IdProfile,
                        Email = "entrenador@levelup.com",
                        Password = hmac.ComputeHash(Encoding.UTF8.GetBytes("entrenador123")),
                        PasswordSalt = hmac.Key,
                        Estado = "Active",
                        CreatedAt = DateTime.UtcNow
                    };
                    context.Auths.Add(trainerAuth);
                    context.SaveChanges();
                }

                if (!context.Employees.Any(e => e.IdProfile == trainerProfile.IdProfile))
                {
                    var employeeEntity = new Employee
                    {
                        IdProfile = trainerProfile.IdProfile,
                        FechaContratacion = DateOnly.FromDateTime(DateTime.UtcNow),
                        SalarioBase = 2500000,
                        Estado = "Activo",
                        Especialidad = "Entrenador General",
                        Descripcion = "Entrenador de planta para atención a clientes."
                    };
                    context.Employees.Add(employeeEntity);
                    context.SaveChanges();
                }

                var employeeRole = context.Roles.FirstOrDefault(r => r.Nombre == "Employee");
                if (employeeRole != null && trainerAuth != null && !context.UserRoles.Any(ur => ur.IdAuth == trainerAuth.IdAuth))
                {
                    context.UserRoles.Add(new UserRole { IdAuth = trainerAuth.IdAuth, IdRol = employeeRole.IdRol });
                    context.SaveChanges();
                }
            }
            else
            {
                // Forzar contraseña en cada inicio por si fue modificada
                using var hmac = new System.Security.Cryptography.HMACSHA512();
                trainerAuth.Password = hmac.ComputeHash(Encoding.UTF8.GetBytes("entrenador123"));
                trainerAuth.PasswordSalt = hmac.Key;
                trainerAuth.Estado = "Active";
                context.SaveChanges();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("DataSeeder Employee warning: " + ex.Message);
        }

        // 3. Seed RBAC: Permisos, Roles-Permisos y Usuarios-Roles
        SeedRbac(context);

        // 4. Seed Memberships
        if (!context.Memberships.Any())
        {
            context.Memberships.AddRange(
                new Membership { Nombre = "Bronce", Descripcion = "Acceso básico a sala de pesas", Precio = 89900 },
                new Membership { Nombre = "Plata", Descripcion = "Acceso total + Clases grupales", Precio = 159900 },
                new Membership { Nombre = "Oro", Descripcion = "VIP: Todo incluido + Nutricionista", Precio = 279900 }
            );
            context.SaveChanges();
        }

        // 5. Seed Roles del Gimnasio (funcionales/laborales)
        if (!context.RolesGimnasio.Any())
        {
            context.RolesGimnasio.AddRange(
                new RolGimnasio { Nombre = "Head Coach", Descripcion = "Entrenador principal y líder del equipo" },
                new RolGimnasio { Nombre = "Powerlifting", Descripcion = "Especialista en fuerza y potencia" },
                new RolGimnasio { Nombre = "Especialista HIIT & Funcional", Descripcion = "Entrenamiento de alta intensidad y funcional" },
                new RolGimnasio { Nombre = "Coach Boxeo & MMA", Descripcion = "Artes marciales mixtas y boxeo" },
                new RolGimnasio { Nombre = "Nutricionista Deportiva", Descripcion = "Nutrición especializada para atletas" }
            );
            context.SaveChanges();
        }

        // 6. Seed Entrenadores (empleados con roles de gimnasio)
        var rolHeadCoach = context.RolesGimnasio.First(r => r.Nombre == "Head Coach");
        var rolPowerlifting = context.RolesGimnasio.First(r => r.Nombre == "Powerlifting");
        var rolHiit = context.RolesGimnasio.First(r => r.Nombre == "Especialista HIIT & Funcional");
        var rolBoxeo = context.RolesGimnasio.First(r => r.Nombre == "Coach Boxeo & MMA");
        var rolNutricion = context.RolesGimnasio.First(r => r.Nombre == "Nutricionista Deportiva");

        // Entrenador 1: Miguel Vargas - Head Coach · Powerlifting
        if (!context.Profiles.Any(p => p.NumDocumento == "1000000001"))
        {
            var profile1 = new Profile
            {
                Nombre = "Miguel", Apellidos = "Vargas",
                TipoDocumento = "CC", NumDocumento = "1000000001",
                Sexo = "Masculino", Telefono = "3101234567"
            };
            context.Profiles.Add(profile1);
            context.SaveChanges();

            var emp1 = new Employee
            {
                IdProfile = profile1.IdProfile,
                FechaContratacion = new DateOnly(2016, 3, 15),
                SalarioBase = 3500000,
                Estado = "Activo",
                Especialidad = "Head Coach · Powerlifting",
                Descripcion = "10 años de experiencia. Campeón nacional 2019-2021."
            };
            context.Employees.Add(emp1);
            context.SaveChanges();

            context.EmpleadoRolesGimnasio.AddRange(
                new EmpleadoRolGimnasio { IdEmpleado = emp1.IdEmpleado, IdRolGym = rolHeadCoach.IdRolGym },
                new EmpleadoRolGimnasio { IdEmpleado = emp1.IdEmpleado, IdRolGym = rolPowerlifting.IdRolGym }
            );
            context.SaveChanges();
        }

        // Entrenador 2: Laura Pinto - Especialista · HIIT & Funcional
        if (!context.Profiles.Any(p => p.NumDocumento == "1000000002"))
        {
            var profile2 = new Profile
            {
                Nombre = "Laura", Apellidos = "Pinto",
                TipoDocumento = "CC", NumDocumento = "1000000002",
                Sexo = "Femenino", Telefono = "3112345678"
            };
            context.Profiles.Add(profile2);
            context.SaveChanges();

            var emp2 = new Employee
            {
                IdProfile = profile2.IdProfile,
                FechaContratacion = new DateOnly(2019, 7, 1),
                SalarioBase = 2800000,
                Estado = "Activo",
                Especialidad = "Especialista · HIIT & Funcional",
                Descripcion = "Certificada NASM. CrossFit Level 2 Trainer."
            };
            context.Employees.Add(emp2);
            context.SaveChanges();

            context.EmpleadoRolesGimnasio.Add(
                new EmpleadoRolGimnasio { IdEmpleado = emp2.IdEmpleado, IdRolGym = rolHiit.IdRolGym }
            );
            context.SaveChanges();
        }

        // Entrenador 3: Julián Castro - Coach · Boxeo & MMA
        if (!context.Profiles.Any(p => p.NumDocumento == "1000000003"))
        {
            var profile3 = new Profile
            {
                Nombre = "Julián", Apellidos = "Castro",
                TipoDocumento = "CC", NumDocumento = "1000000003",
                Sexo = "Masculino", Telefono = "3123456789"
            };
            context.Profiles.Add(profile3);
            context.SaveChanges();

            var emp3 = new Employee
            {
                IdProfile = profile3.IdProfile,
                FechaContratacion = new DateOnly(2018, 1, 10),
                SalarioBase = 3000000,
                Estado = "Activo",
                Especialidad = "Coach · Boxeo & MMA",
                Descripcion = "Ex-boxeador profesional. 8 años enseñando artes marciales."
            };
            context.Employees.Add(emp3);
            context.SaveChanges();

            context.EmpleadoRolesGimnasio.Add(
                new EmpleadoRolGimnasio { IdEmpleado = emp3.IdEmpleado, IdRolGym = rolBoxeo.IdRolGym }
            );
            context.SaveChanges();
        }

        // Entrenador 4: Sofía Reyes - Nutricionista · Deportiva
        if (!context.Profiles.Any(p => p.NumDocumento == "1000000004"))
        {
            var profile4 = new Profile
            {
                Nombre = "Sofía", Apellidos = "Reyes",
                TipoDocumento = "CC", NumDocumento = "1000000004",
                Sexo = "Femenino", Telefono = "3134567890"
            };
            context.Profiles.Add(profile4);
            context.SaveChanges();

            var emp4 = new Employee
            {
                IdProfile = profile4.IdProfile,
                FechaContratacion = new DateOnly(2020, 5, 20),
                SalarioBase = 3200000,
                Estado = "Activo",
                Especialidad = "Nutricionista · Deportiva",
                Descripcion = "MSc Nutrición Deportiva. Asesora a atletas de alto rendimiento."
            };
            context.Employees.Add(emp4);
            context.SaveChanges();

            context.EmpleadoRolesGimnasio.Add(
                new EmpleadoRolGimnasio { IdEmpleado = emp4.IdEmpleado, IdRolGym = rolNutricion.IdRolGym }
            );
            context.SaveChanges();
        }

        // Entrenador 5: Andrés Méndez - CrossFit · Funcional
        if (!context.Profiles.Any(p => p.NumDocumento == "1000000005"))
        {
            var profile5 = new Profile
            {
                Nombre = "Andrés", Apellidos = "Méndez",
                TipoDocumento = "CC", NumDocumento = "1000000005",
                Sexo = "Masculino", Telefono = "3145678901"
            };
            context.Profiles.Add(profile5);
            context.SaveChanges();

            var emp5 = new Employee
            {
                IdProfile = profile5.IdProfile,
                FechaContratacion = new DateOnly(2021, 11, 10),
                SalarioBase = 3100000,
                Estado = "Activo",
                Especialidad = "CrossFit · Funcional",
                Descripcion = "Certificado internacional en CrossFit L2. Especialista en halterofilia."
            };
            context.Employees.Add(emp5);
            context.SaveChanges();

            context.EmpleadoRolesGimnasio.Add(
                new EmpleadoRolGimnasio { IdEmpleado = emp5.IdEmpleado, IdRolGym = rolHiit.IdRolGym }
            );
            context.SaveChanges();
        }
    } // fin de Seed()

    /// <summary>
    /// Carga inicial de datos para el modelo RBAC:
    /// - Registra el catálogo de permisos según responsabilidades del negocio.
    /// - Asigna los permisos a cada rol existente (Admin, Employee, Client).
    /// - Vincula las cuentas de usuario existentes (Administrador y Empleado) con sus respectivos roles en usuarios_roles.
    /// - Evita duplicados y sincroniza referencias.
    /// </summary>
    private static void SeedRbac(LevelUpDbContext context)
    {
        try
        {
            // A. Permisos definidos según responsabilidades del sistema LevelUpGym
            var permissionsDefinitions = new List<string>
            {
                // Dashboard & Métricas
                "VerDashboardAdmin",

                // Clientes
                "VerClientes",
                "GestionarClientes",

                // Clases grupales
                "VerClases",
                "GestionarClases",
                "InscribirClases",

                // Entrenadores & Personal
                "VerEntrenadores",
                "GestionarEntrenadores",

                // Membresías & Planes
                "VerMembresias",
                "GestionarMembresias",

                // Pagos & Facturación
                "VerPagos",
                "RegistrarPagos",

                // Progreso físico & Medidas
                "VerProgreso",
                "GestionarProgreso",

                // Objetivos & Metas
                "VerObjetivos",
                "GestionarObjetivos",
                "GestionarTiposObjetivo",

                // Contacto & Soporte
                "GestionarMensajesContacto"
            };

            foreach (var permName in permissionsDefinitions)
            {
                if (!context.Permissions.Any(p => p.Nombre == permName))
                {
                    context.Permissions.Add(new Permission
                    {
                        Nombre = permName,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
            context.SaveChanges();

            // B. Obtener roles existentes (respetando los existentes en BD/código)
            var adminRole = context.Roles.FirstOrDefault(r => r.Nombre == "Admin" || r.Nombre == "Administrador");
            var employeeRole = context.Roles.FirstOrDefault(r => r.Nombre == "Employee" || r.Nombre == "Empleado");
            var clientRole = context.Roles.FirstOrDefault(r => r.Nombre == "Client" || r.Nombre == "Cliente");

            var allDbPermissions = context.Permissions.ToList();

            // Responsabilidades del rol Empleado (Entrenador / Operativo)
            var employeePermNames = new HashSet<string>
            {
                "VerClases",
                "GestionarClases",
                "InscribirClases",
                "VerClientes",
                "VerProgreso",
                "GestionarProgreso",
                "VerObjetivos",
                "GestionarObjetivos",
                "VerEntrenadores",
                "VerMembresias"
            };

            // Responsabilidades del rol Cliente (Portal de usuario)
            var clientPermNames = new HashSet<string>
            {
                "VerClases",
                "InscribirClases",
                "VerProgreso",
                "VerObjetivos",
                "VerMembresias"
            };

            // 1. Asignar permisos al Rol Administrador (Acceso total)
            if (adminRole != null)
            {
                foreach (var perm in allDbPermissions)
                {
                    var exists = context.RolePermissions.Any(rp =>
                        (rp.IdRol == adminRole.IdRol && rp.IdPermiso == perm.IdPermiso) ||
                        (rp.Role.IdRol == adminRole.IdRol && rp.Permission.IdPermiso == perm.IdPermiso));

                    if (!exists)
                    {
                        context.RolePermissions.Add(new RolePermission
                        {
                            IdRol = adminRole.IdRol,
                            IdPermiso = perm.IdPermiso,
                            Role = adminRole,
                            Permission = perm,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
                context.SaveChanges();
            }

            // 2. Asignar permisos al Rol Empleado (Clases, alumnos, medidas, objetivos)
            if (employeeRole != null)
            {
                foreach (var perm in allDbPermissions.Where(p => employeePermNames.Contains(p.Nombre ?? "")))
                {
                    var exists = context.RolePermissions.Any(rp =>
                        (rp.IdRol == employeeRole.IdRol && rp.IdPermiso == perm.IdPermiso) ||
                        (rp.Role.IdRol == employeeRole.IdRol && rp.Permission.IdPermiso == perm.IdPermiso));

                    if (!exists)
                    {
                        context.RolePermissions.Add(new RolePermission
                        {
                            IdRol = employeeRole.IdRol,
                            IdPermiso = perm.IdPermiso,
                            Role = employeeRole,
                            Permission = perm,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
                context.SaveChanges();
            }

            // 3. Asignar permisos al Rol Cliente (Consulta de clases, progreso, metas, membresías)
            if (clientRole != null)
            {
                foreach (var perm in allDbPermissions.Where(p => clientPermNames.Contains(p.Nombre ?? "")))
                {
                    var exists = context.RolePermissions.Any(rp =>
                        (rp.IdRol == clientRole.IdRol && rp.IdPermiso == perm.IdPermiso) ||
                        (rp.Role.IdRol == clientRole.IdRol && rp.Permission.IdPermiso == perm.IdPermiso));

                    if (!exists)
                    {
                        context.RolePermissions.Add(new RolePermission
                        {
                            IdRol = clientRole.IdRol,
                            IdPermiso = perm.IdPermiso,
                            Role = clientRole,
                            Permission = perm,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
                context.SaveChanges();
            }

            // C. Vincular cuentas de usuarios con sus respectivos roles (usuarios_roles)
            // 1) Administrador (admin@levelup.com) -> Rol Admin
            var adminUserAuth = context.Auths.FirstOrDefault(a => a.Email == "admin@levelup.com");
            if (adminUserAuth != null && adminRole != null)
            {
                var hasAdminRole = context.UserRoles.Any(ur =>
                    (ur.IdAuth == adminUserAuth.IdAuth && ur.IdRol == adminRole.IdRol) ||
                    (ur.Auth.IdAuth == adminUserAuth.IdAuth && ur.Role.IdRol == adminRole.IdRol));

                if (!hasAdminRole)
                {
                    context.UserRoles.Add(new UserRole
                    {
                        IdAuth = adminUserAuth.IdAuth,
                        IdRol = adminRole.IdRol,
                        Auth = adminUserAuth,
                        Role = adminRole,
                        CreatedAt = DateTime.UtcNow
                    });
                    context.SaveChanges();
                }
            }

            // 2) Empleado / Entrenador (entrenador@levelup.com) -> Rol Employee
            var trainerUserAuth = context.Auths.FirstOrDefault(a => a.Email == "entrenador@levelup.com");
            if (trainerUserAuth != null && employeeRole != null)
            {
                var hasEmployeeRole = context.UserRoles.Any(ur =>
                    (ur.IdAuth == trainerUserAuth.IdAuth && ur.IdRol == employeeRole.IdRol) ||
                    (ur.Auth.IdAuth == trainerUserAuth.IdAuth && ur.Role.IdRol == employeeRole.IdRol));

                if (!hasEmployeeRole)
                {
                    context.UserRoles.Add(new UserRole
                    {
                        IdAuth = trainerUserAuth.IdAuth,
                        IdRol = employeeRole.IdRol,
                        Auth = trainerUserAuth,
                        Role = employeeRole,
                        CreatedAt = DateTime.UtcNow
                    });
                    context.SaveChanges();
                }
            }

            // 3) Otros empleados con cuenta en auth -> Rol Employee
            if (employeeRole != null)
            {
                var employeesWithAuth = context.Employees
                    .Include(e => e.Profile)
                        .ThenInclude(p => p.Auth)
                    .Where(e => e.Profile.Auth != null)
                    .Select(e => e.Profile.Auth!)
                    .ToList();

                foreach (var empAuth in employeesWithAuth)
                {
                    var hasRole = context.UserRoles.Any(ur =>
                        (ur.IdAuth == empAuth.IdAuth && ur.IdRol == employeeRole.IdRol) ||
                        (ur.Auth.IdAuth == empAuth.IdAuth && ur.Role.IdRol == employeeRole.IdRol));

                    if (!hasRole)
                    {
                        context.UserRoles.Add(new UserRole
                        {
                            IdAuth = empAuth.IdAuth,
                            IdRol = employeeRole.IdRol,
                            Auth = empAuth,
                            Role = employeeRole,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
                context.SaveChanges();
            }

            // 4) Cliente (cliente@levelup.com) -> Rol Client
            var clientUserAuth = context.Auths.FirstOrDefault(a => a.Email == "cliente@levelup.com");
            if (clientUserAuth != null && clientRole != null)
            {
                var hasClientRole = context.UserRoles.Any(ur =>
                    (ur.IdAuth == clientUserAuth.IdAuth && ur.IdRol == clientRole.IdRol) ||
                    (ur.Auth.IdAuth == clientUserAuth.IdAuth && ur.Role.IdRol == clientRole.IdRol));

                if (!hasClientRole)
                {
                    context.UserRoles.Add(new UserRole
                    {
                        IdAuth = clientUserAuth.IdAuth,
                        IdRol = clientRole.IdRol,
                        Auth = clientUserAuth,
                        Role = clientRole,
                        CreatedAt = DateTime.UtcNow
                    });
                    context.SaveChanges();
                }
            }

            // Sincronizar columnas de navegación/shadow FKs si existían registros previos con NULL
            context.Database.ExecuteSqlRaw(@"
                UPDATE roles_permisos SET RoleIdRol = IdRol WHERE RoleIdRol IS NULL AND IdRol IS NOT NULL;
                UPDATE roles_permisos SET PermissionIdPermiso = IdPermiso WHERE PermissionIdPermiso IS NULL AND IdPermiso IS NOT NULL;
                UPDATE usuarios_roles SET AuthIdAuth = IdAuth WHERE AuthIdAuth IS NULL AND IdAuth IS NOT NULL;
                UPDATE usuarios_roles SET RoleIdRol = IdRol WHERE RoleIdRol IS NULL AND IdRol IS NOT NULL;
            ");
        }
        catch (Exception ex)
        {
            Console.WriteLine("DataSeeder RBAC warning: " + ex.Message);
        }
    }
} // fin de la clase
using LevelUpGym.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace LevelUpGym.Api.Data;

public static class DataSeeder
{
    public static void Seed(LevelUpDbContext context)
    {
        context.Database.EnsureCreated();

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

        // 3. Seed EPS
        if (!context.EpsList.Any())
        {
            context.EpsList.AddRange(
                new Eps { Nombre = "Sanitas" },
                new Eps { Nombre = "Sura" },
                new Eps { Nombre = "Compensar" }
            );
            context.SaveChanges();
        }

        // 4. Seed Memberships (requires Items first)
        if (!context.Memberships.Any())
        {
            var item1 = new Item { CreatedAt = DateTime.UtcNow };
            var item2 = new Item { CreatedAt = DateTime.UtcNow };
            var item3 = new Item { CreatedAt = DateTime.UtcNow };
            context.Items.AddRange(item1, item2, item3);
            context.SaveChanges();

            context.Memberships.AddRange(
                new Membership { Nombre = "Bronce", Descripcion = "Acceso básico a sala de pesas", Precio = 89900, IdItem = item1.IdItem },
                new Membership { Nombre = "Plata", Descripcion = "Acceso total + Clases grupales", Precio = 159900, IdItem = item2.IdItem },
                new Membership { Nombre = "Oro", Descripcion = "VIP: Todo incluido + Nutricionista", Precio = 279900, IdItem = item3.IdItem }
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
        if (!context.Employees.Any(e => e.EmpleadoRoles.Any()))
        {
            var rolHeadCoach = context.RolesGimnasio.First(r => r.Nombre == "Head Coach");
            var rolPowerlifting = context.RolesGimnasio.First(r => r.Nombre == "Powerlifting");
            var rolHiit = context.RolesGimnasio.First(r => r.Nombre == "Especialista HIIT & Funcional");
            var rolBoxeo = context.RolesGimnasio.First(r => r.Nombre == "Coach Boxeo & MMA");
            var rolNutricion = context.RolesGimnasio.First(r => r.Nombre == "Nutricionista Deportiva");
            var epsSanitas = context.EpsList.First(e => e.Nombre == "Sanitas");
            var epsSura = context.EpsList.First(e => e.Nombre == "Sura");

            // Entrenador 1: Miguel Vargas - Head Coach · Powerlifting
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
                IdEps = epsSanitas.IdEps,
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

            // Entrenador 2: Laura Pinto - Especialista · HIIT & Funcional
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
                IdEps = epsSura.IdEps,
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

            // Entrenador 3: Julián Castro - Coach · Boxeo & MMA
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
                IdEps = epsSanitas.IdEps,
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

            // Entrenador 4: Sofía Reyes - Nutricionista · Deportiva
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
                IdEps = epsSura.IdEps,
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

    }
}


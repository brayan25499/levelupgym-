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

    }
}

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

        // 4. Seed Categories
        if (!context.Categories.Any())
        {
            context.Categories.AddRange(
                new Category { Nombre = "Proteínas" },
                new Category { Nombre = "Suplementos" },
                new Category { Nombre = "Accesorios" }
            );
            context.SaveChanges();
        }

        // 5. Seed Memberships (requires Items first)
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

        // 6. Seed Products (requires Items and Categories first)
        if (context.Products.Count() < 8)
        {
            var existingProducts = context.Products.ToList();
            if (existingProducts.Any())
            {
                context.Products.RemoveRange(existingProducts);
                context.SaveChanges();
            }

            var catProtein = context.Categories.First(c => c.Nombre == "Proteínas").IdCategoria;
            var catSupp = context.Categories.First(c => c.Nombre == "Suplementos").IdCategoria;
            var catAcc = context.Categories.First(c => c.Nombre == "Accesorios").IdCategoria;

            var items = new List<Item>();
            for (int i = 0; i < 8; i++)
            {
                items.Add(new Item { CreatedAt = DateTime.UtcNow });
            }
            context.Items.AddRange(items);
            context.SaveChanges();

            context.Products.AddRange(
                new Product { Nombre = "Whey Gold Standard 2lb", PrecioVenta = 189900, IdCategoria = catProtein, IdItem = items[0].IdItem, Descripcion = "Proteína de suero de leche de alta calidad para la recuperación muscular.", Estado = "ACTIVO" },
                new Product { Nombre = "Creatina Monohidrato 500g", PrecioVenta = 89900, IdCategoria = catSupp, IdItem = items[1].IdItem, Descripcion = "Aumenta tu fuerza, potencia e hidratación muscular.", Estado = "ACTIVO" },
                new Product { Nombre = "Pre-Entreno Psicótico 300g", PrecioVenta = 125000, IdCategoria = catSupp, IdItem = items[2].IdItem, Descripcion = "Energía explosiva y enfoque extremo para tus entrenamientos.", Estado = "ACTIVO" },
                new Product { Nombre = "Shaker Mezclador Pro 700ml", PrecioVenta = 35000, IdCategoria = catAcc, IdItem = items[3].IdItem, Descripcion = "Mezclador hermético con rejilla para batidos sin grumos.", Estado = "ACTIVO" },
                new Product { Nombre = "Cinturón Gym de Cuero", PrecioVenta = 95000, IdCategoria = catAcc, IdItem = items[4].IdItem, Descripcion = "Soporte lumbar premium para levantamientos pesados.", Estado = "ACTIVO" },
                new Product { Nombre = "Straps de Agarre Pro", PrecioVenta = 29900, IdCategoria = catAcc, IdItem = items[5].IdItem, Descripcion = "Correas de algodón reforzado para mejorar tu agarre.", Estado = "ACTIVO" },
                new Product { Nombre = "Aminoácidos BCAA 300g", PrecioVenta = 79900, IdCategoria = catSupp, IdItem = items[6].IdItem, Descripcion = "Previene el catabolismo y mejora la síntesis proteica.", Estado = "ACTIVO" },
                new Product { Nombre = "Multivitamínico Sports 90 caps", PrecioVenta = 49900, IdCategoria = catSupp, IdItem = items[7].IdItem, Descripcion = "Vitaminas y minerales esenciales para deportistas.", Estado = "ACTIVO" }
            );
            context.SaveChanges();
        }
    }
}

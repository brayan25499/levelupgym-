using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using LevelUpGym.Api.Services;
using Microsoft.EntityFrameworkCore;
using LevelUpGym.Api.Data;

namespace LevelUpGym.Api;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Servicios
        builder.Services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.ReferenceHandler =
                    System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
            });

        builder.Services.AddScoped<IJwtService, JwtService>();

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAngular", policy =>
                policy.WithOrigins("http://localhost:4200")
                      .AllowAnyMethod()
                      .AllowAnyHeader());
        });

        // Base de datos PostgreSQL (Supabase)
        builder.Services.AddDbContext<LevelUpDbContext>(options =>
            options.UseNpgsql(
                builder.Configuration.GetConnectionString("DefaultConnection")));

        // JWT
        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(
                            builder.Configuration["Jwt:Key"] ??
                            "super_secret_key_levelupgym_2026_pro_extra_long_for_sha512_security_standard"
                        )
                    ),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    RequireExpirationTime = true,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };
            });

        builder.Services.AddAuthorization();
        builder.Services.AddOpenApi();

        var app = builder.Build();

        // OpenAPI también en Producción
        app.MapOpenApi();

        app.UseCors("AllowAngular");

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();

        // Ruta de prueba
        app.MapGet("/", () =>
        {
            return Results.Ok(new
            {
                mensaje = "LevelUpGym API funcionando correctamente",
                estado = "OK"
            });
        });

        // Aplicar migraciones y cargar datos iniciales
        using (var scope = app.Services.CreateScope())
        {
            var services = scope.ServiceProvider;

            try
            {
                var context = services.GetRequiredService<LevelUpDbContext>();

                context.Database.Migrate();

                DataSeeder.Seed(context);
            }
            catch (Exception ex)
            {
                var logger = services.GetRequiredService<ILogger<Program>>();
                logger.LogError(ex, "An error occurred while seeding the database.");
            }
        }

        app.Run();
    }
}
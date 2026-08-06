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

        // CORS para Angular y producción en Vercel
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAngular", policy =>
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader());

            options.AddDefaultPolicy(policy =>
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader());
        });

        // Base de datos PostgreSQL
        builder.Services.AddDbContext<LevelUpDbContext>(options =>
            options.UseNpgsql(
                builder.Configuration.GetConnectionString("DefaultConnection")
            ));

        // JWT Authentication Configuration
        var jwtSecretKey = builder.Configuration["Jwt:Key"] 
            ?? builder.Configuration["JWT_SECRET"] 
            ?? "LevelUpGym_SuperSecret_SecurityKey_2026_MustBeAtLeast512BitsLong_ForHMACSHA512_Algorithm_Validation!";

        var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "LevelUpGymApi";
        var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "LevelUpGymClient";

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
                    ValidateIssuer = true,
                    ValidIssuer = jwtIssuer,
                    ValidateAudience = true,
                    ValidAudience = jwtAudience,
                    RequireExpirationTime = true,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };
            });

        builder.Services.AddAuthorization();

        var app = builder.Build();

        app.UseCors();
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
                logger.LogError(ex, "Error al aplicar migraciones o cargar datos iniciales.");
            }
        }


        app.Run();
    }
}
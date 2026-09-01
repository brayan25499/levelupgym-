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

        // Add services to the container.
        builder.Services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
            });

        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        builder.Services.AddScoped<IJwtService, JwtService>();
        builder.Services.AddSingleton<IOtpService, OtpService>();
        builder.Services.AddScoped<IEmailService, ConsoleEmailService>();
        builder.Services.AddScoped<IGoalEvaluationService, GoalEvaluationService>();

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAngular", policy =>
                policy.WithOrigins("http://localhost:4200") // Angular default port
                      .AllowAnyMethod()
                      .AllowAnyHeader());
        });

        builder.Services.AddDbContext<LevelUpDbContext>(options =>
            options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
                   .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "super_secret_key_levelupgym_2026_pro_extra_long_for_sha512_security_standard")),
                    RequireExpirationTime = true,
                    ClockSkew = TimeSpan.Zero
                };
            });

        builder.Services.AddAuthorization();

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseCors("AllowAngular");
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();

        // 0. Raw ADO.NET schema patch — runs before EF Core, guarantees column sizes are correct
        var rawConnStr = builder.Configuration.GetConnectionString("DefaultConnection")!;
        try
        {
            using var rawConn = new Microsoft.Data.SqlClient.SqlConnection(rawConnStr);
            rawConn.Open();
            var patchSql = @"
                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                           WHERE TABLE_NAME = 'ProgressReports' AND COLUMN_NAME = 'Imc'
                             AND CHARACTER_MAXIMUM_LENGTH < 10)
                    ALTER TABLE ProgressReports ALTER COLUMN Imc NVARCHAR(20) NULL;

                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                           WHERE TABLE_NAME = 'ProgressReports' AND COLUMN_NAME = 'Altura'
                             AND CHARACTER_MAXIMUM_LENGTH < 10)
                    ALTER TABLE ProgressReports ALTER COLUMN Altura NVARCHAR(20) NULL;

                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                           WHERE TABLE_NAME = 'ProgressReports' AND COLUMN_NAME = 'PorcentajeGrasa')
                BEGIN
                    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Goals')
                        DELETE FROM Goals WHERE IdTipoObjetivo = 7;
                    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'GoalTypes')
                        DELETE FROM GoalTypes WHERE IdTipoObjetivo = 7;
                    ALTER TABLE ProgressReports DROP COLUMN PorcentajeGrasa;
                END

                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                           WHERE TABLE_NAME = 'ProgressReports' AND COLUMN_NAME = 'ClientIdCliente')
                BEGIN
                    UPDATE ProgressReports SET IdCliente = ClientIdCliente WHERE (IdCliente IS NULL OR IdCliente = 0) AND ClientIdCliente IS NOT NULL;
                    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ProgressReports_clientes_ClientIdCliente')
                        ALTER TABLE ProgressReports DROP CONSTRAINT FK_ProgressReports_clientes_ClientIdCliente;
                    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ProgressReports_ClientIdCliente')
                        DROP INDEX IX_ProgressReports_ClientIdCliente ON ProgressReports;
                    ALTER TABLE ProgressReports DROP COLUMN ClientIdCliente;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ProgressReports_clientes_IdCliente')
                BEGIN
                    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ProgressReports_IdCliente')
                        DROP INDEX IX_ProgressReports_IdCliente ON ProgressReports;
                    ALTER TABLE ProgressReports ADD CONSTRAINT FK_ProgressReports_clientes_IdCliente
                        FOREIGN KEY (IdCliente) REFERENCES clientes(IdCliente) ON DELETE CASCADE;
                END";
            using var cmd = new Microsoft.Data.SqlClient.SqlCommand(patchSql, rawConn);
            cmd.ExecuteNonQuery();
            Console.WriteLine("Schema patch applied successfully.");
        }
        catch (Exception patchEx)
        {
            Console.WriteLine("Schema patch warning: " + patchEx.Message);
        }

        // 1. Seed Database & Run EF Core Migrations
        using (var scope = app.Services.CreateScope())
        {
            var services = scope.ServiceProvider;
            var context = services.GetRequiredService<LevelUpDbContext>();
            var logger = services.GetRequiredService<ILogger<Program>>();

            try
            {
                context.Database.Migrate();
                LevelUpGym.Api.Data.DataSeeder.Seed(context);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "An error occurred while seeding the database.");
            }
        }

        app.Run();
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMensajesContacto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Telefono",
                table: "profiles",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "mensajes_contacto",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Correo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Asunto = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Mensaje = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    FechaEnvio = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    Estado = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Pendiente"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mensajes_contacto", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "mensajes_contacto");

            migrationBuilder.AlterColumn<string>(
                name: "Telefono",
                table: "profiles",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30,
                oldNullable: true);
        }
    }
}

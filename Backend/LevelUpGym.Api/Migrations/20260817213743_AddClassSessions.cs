using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddClassSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "class_sessions",
                columns: table => new
                {
                    IdClass = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdEntrenador = table.Column<int>(type: "int", nullable: false),
                    Nombre = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Fecha = table.Column<DateOnly>(type: "date", nullable: false),
                    HoraInicio = table.Column<TimeSpan>(type: "time", nullable: false),
                    CapacidadMaxima = table.Column<int>(type: "int", nullable: false),
                    Estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_class_sessions", x => x.IdClass);
                    table.ForeignKey(
                        name: "FK_class_sessions_empleados_IdEntrenador",
                        column: x => x.IdEntrenador,
                        principalTable: "empleados",
                        principalColumn: "IdEmpleado",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "class_enrollments",
                columns: table => new
                {
                    IdEnrollment = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdClass = table.Column<int>(type: "int", nullable: false),
                    IdCliente = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_class_enrollments", x => x.IdEnrollment);
                    table.ForeignKey(
                        name: "FK_class_enrollments_class_sessions_IdClass",
                        column: x => x.IdClass,
                        principalTable: "class_sessions",
                        principalColumn: "IdClass",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_class_enrollments_clientes_IdCliente",
                        column: x => x.IdCliente,
                        principalTable: "clientes",
                        principalColumn: "IdCliente",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_class_enrollments_IdClass_IdCliente",
                table: "class_enrollments",
                columns: new[] { "IdClass", "IdCliente" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_class_enrollments_IdCliente",
                table: "class_enrollments",
                column: "IdCliente");

            migrationBuilder.CreateIndex(
                name: "IX_class_sessions_IdEntrenador",
                table: "class_sessions",
                column: "IdEntrenador");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "class_enrollments");

            migrationBuilder.DropTable(
                name: "class_sessions");
        }
    }
}

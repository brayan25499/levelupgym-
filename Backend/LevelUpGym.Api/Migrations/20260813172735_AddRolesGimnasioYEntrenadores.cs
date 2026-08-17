using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRolesGimnasioYEntrenadores : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Descripcion",
                table: "empleados",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Especialidad",
                table: "empleados",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "roles_gimnasio",
                columns: table => new
                {
                    IdRolGym = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Descripcion = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles_gimnasio", x => x.IdRolGym);
                });

            migrationBuilder.CreateTable(
                name: "roles_empleados",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdEmpleado = table.Column<int>(type: "int", nullable: false),
                    IdRolGym = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles_empleados", x => x.Id);
                    table.ForeignKey(
                        name: "FK_roles_empleados_empleados_IdEmpleado",
                        column: x => x.IdEmpleado,
                        principalTable: "empleados",
                        principalColumn: "IdEmpleado",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_roles_empleados_roles_gimnasio_IdRolGym",
                        column: x => x.IdRolGym,
                        principalTable: "roles_gimnasio",
                        principalColumn: "IdRolGym",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_roles_empleados_IdEmpleado_IdRolGym",
                table: "roles_empleados",
                columns: new[] { "IdEmpleado", "IdRolGym" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_roles_empleados_IdRolGym",
                table: "roles_empleados",
                column: "IdRolGym");

            migrationBuilder.CreateIndex(
                name: "IX_roles_gimnasio_Nombre",
                table: "roles_gimnasio",
                column: "Nombre",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "roles_empleados");

            migrationBuilder.DropTable(
                name: "roles_gimnasio");

            migrationBuilder.DropColumn(
                name: "Descripcion",
                table: "empleados");

            migrationBuilder.DropColumn(
                name: "Especialidad",
                table: "empleados");
        }
    }
}

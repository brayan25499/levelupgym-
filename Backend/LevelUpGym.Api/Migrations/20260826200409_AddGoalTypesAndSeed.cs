using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGoalTypesAndSeed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Brazo",
                table: "ProgressReports",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Cintura",
                table: "ProgressReports",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Pecho",
                table: "ProgressReports",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Pierna",
                table: "ProgressReports",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PorcentajeGrasa",
                table: "ProgressReports",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GoalTypes",
                columns: table => new
                {
                    IdTipoObjetivo = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Descripcion = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Unidad = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    TipoDato = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Direccion = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Activo = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GoalTypes", x => x.IdTipoObjetivo);
                });

            migrationBuilder.InsertData(
                table: "GoalTypes",
                columns: new[] { "IdTipoObjetivo", "Activo", "CreatedAt", "DeletedAt", "Descripcion", "Direccion", "Nombre", "TipoDato", "Unidad", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "Alcanzar un peso corporal determinado.", "MENOR", "Peso", "DECIMAL", "kg", null },
                    { 2, true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "Alcanzar un índice de masa corporal determinado.", "MENOR", "IMC", "DECIMAL", "-", null },
                    { 3, true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "Reducir la medida de cintura.", "MENOR", "Cintura", "DECIMAL", "cm", null },
                    { 4, true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "Aumentar la medida de pecho.", "MAYOR", "Pecho", "DECIMAL", "cm", null },
                    { 5, true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "Aumentar la medida de brazo.", "MAYOR", "Brazo", "DECIMAL", "cm", null },
                    { 6, true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "Aumentar la medida de pierna.", "MAYOR", "Pierna", "DECIMAL", "cm", null },
                    { 7, true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "Reducir el porcentaje de grasa corporal.", "MENOR", "Porcentaje de grasa", "DECIMAL", "%", null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_GoalTypes_Nombre",
                table: "GoalTypes",
                column: "Nombre",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GoalTypes");

            migrationBuilder.DropColumn(
                name: "Brazo",
                table: "ProgressReports");

            migrationBuilder.DropColumn(
                name: "Cintura",
                table: "ProgressReports");

            migrationBuilder.DropColumn(
                name: "Pecho",
                table: "ProgressReports");

            migrationBuilder.DropColumn(
                name: "Pierna",
                table: "ProgressReports");

            migrationBuilder.DropColumn(
                name: "PorcentajeGrasa",
                table: "ProgressReports");
        }
    }
}

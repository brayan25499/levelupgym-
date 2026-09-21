using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemovePorcentajeGrasa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // First delete any goal that might be referencing GoalType 7 to avoid FK conflicts
            migrationBuilder.Sql("DELETE FROM Goals WHERE IdTipoObjetivo = 7;");

            // Delete GoalType 7 seed
            migrationBuilder.DeleteData(
                table: "GoalTypes",
                keyColumn: "IdTipoObjetivo",
                keyValue: 7);

            // Drop PorcentajeGrasa column from ProgressReports if it exists
            migrationBuilder.Sql(@"IF COL_LENGTH('ProgressReports', 'PorcentajeGrasa') IS NOT NULL BEGIN ALTER TABLE ProgressReports DROP COLUMN PorcentajeGrasa; END");

            // Expand Imc and Altura string lengths to prevent string truncation
            migrationBuilder.Sql("ALTER TABLE ProgressReports ALTER COLUMN Imc NVARCHAR(20) NULL;");
            migrationBuilder.Sql("ALTER TABLE ProgressReports ALTER COLUMN Altura NVARCHAR(20) NULL;");
            migrationBuilder.Sql("IF COL_LENGTH('ProgressReports', 'ClientIdCliente') IS NOT NULL BEGIN ALTER TABLE ProgressReports ALTER COLUMN ClientIdCliente INT NULL; END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PorcentajeGrasa",
                table: "ProgressReports",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.InsertData(
                table: "GoalTypes",
                columns: new[] { "IdTipoObjetivo", "Activo", "CreatedAt", "DeletedAt", "Descripcion", "Direccion", "Nombre", "TipoDato", "Unidad", "UpdatedAt" },
                values: new object[] { 7, true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "Reducir el porcentaje de grasa corporal.", "MENOR", "Porcentaje de grasa", "DECIMAL", "%", null });
        }
    }
}
